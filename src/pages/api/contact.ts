import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
	buildEmail,
	looksLikeSpam,
	sendWithResend,
	validateContact,
	verifyTurnstile,
} from "../../lib/contact";

type ContactEnv = {
	CONTACT_TO?: string;
	CONTACT_FROM?: string;
	RESEND_API_KEY?: string;
	TURNSTILE_SITE_KEY?: string;
	TURNSTILE_SECRET_KEY?: string;
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
	});
}

export const POST: APIRoute = async ({ request, redirect, url }) => {
	const config = env as unknown as ContactEnv;
	const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");
	const respond = (status: "sent" | "error" | "invalid", body: Record<string, unknown>, code: number) =>
		wantsJson ? json({ status, ...body }, code) : redirect(`/contact?status=${status}`, 303);

	// Only accept posts from this site's own pages.
	const origin = request.headers.get("origin");
	if (origin && origin !== url.origin) {
		return json({ status: "invalid", message: "不正な送信元です。" }, 403);
	}

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return respond("invalid", { message: "送信内容を読み取れませんでした。" }, 400);
	}

	// Pretend success so bots get no signal to adapt.
	if (looksLikeSpam(form)) return respond("sent", {}, 200);

	if (config.TURNSTILE_SITE_KEY && config.TURNSTILE_SECRET_KEY) {
		const token = form.get("cf-turnstile-response");
		const passed = await verifyTurnstile(
			config.TURNSTILE_SECRET_KEY,
			typeof token === "string" ? token : "",
			request.headers.get("cf-connecting-ip"),
		);
		if (!passed) {
			return respond(
				"invalid",
				{ message: "送信確認（ロボット対策）に失敗しました。ページを再読み込みしてお試しください。" },
				400,
			);
		}
	}

	const { values, errors } = validateContact(form);
	if (Object.keys(errors).length > 0) {
		return respond("invalid", { message: "入力内容をご確認ください。", errors }, 422);
	}

	if (!config.RESEND_API_KEY || !config.CONTACT_TO || !config.CONTACT_FROM) {
		console.error("contact: mail delivery is not configured (RESEND_API_KEY / CONTACT_TO / CONTACT_FROM)");
		return respond("error", { message: "現在フォームから送信できません。" }, 503);
	}

	const email = buildEmail(values, {
		receivedAt: new Date(),
		userAgent: request.headers.get("user-agent") ?? undefined,
	});
	const result = await sendWithResend(
		{ apiKey: config.RESEND_API_KEY, from: config.CONTACT_FROM, to: config.CONTACT_TO },
		values,
		email,
	);
	if (!result.ok) {
		console.error("contact: resend failed", result.status, result.detail);
		return respond("error", { message: "送信に失敗しました。" }, 502);
	}

	return respond("sent", {}, 200);
};
