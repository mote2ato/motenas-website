/**
 * Contact form: validation, spam checks, and delivery through the Resend API.
 * Kept free of Astro/Cloudflare imports so it can be unit tested with Node.
 */

export const LIMITS = {
	name: 100,
	email: 254,
	subject: 200,
	message: 5000,
} as const;

/** Submissions faster than this after the form rendered are treated as bots. */
export const MIN_FILL_MS = 3000;

export interface ContactValues {
	name: string;
	email: string;
	subject: string;
	message: string;
}

export type ContactField = keyof ContactValues;

export interface ValidationResult {
	values: ContactValues;
	errors: Partial<Record<ContactField, string>>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Header-injection guard for values that end up in email headers.
const LINE_BREAK = /[\r\n]/;

function read(form: FormData, key: string): string {
	const value = form.get(key);
	return typeof value === "string" ? value.trim() : "";
}

export function validateContact(form: FormData): ValidationResult {
	const values: ContactValues = {
		name: read(form, "name"),
		email: read(form, "email"),
		subject: read(form, "subject"),
		message: read(form, "message"),
	};
	const errors: ValidationResult["errors"] = {};

	if (!values.name) errors.name = "お名前を入力してください。";
	else if (values.name.length > LIMITS.name || LINE_BREAK.test(values.name))
		errors.name = `お名前は${LIMITS.name}文字以内の1行で入力してください。`;

	if (!values.email) errors.email = "メールアドレスを入力してください。";
	else if (
		values.email.length > LIMITS.email ||
		LINE_BREAK.test(values.email) ||
		!EMAIL_PATTERN.test(values.email)
	)
		errors.email = "メールアドレスの形式が正しくありません。";

	if (values.subject.length > LIMITS.subject || LINE_BREAK.test(values.subject))
		errors.subject = `題名は${LIMITS.subject}文字以内の1行で入力してください。`;

	if (values.message.length > LIMITS.message)
		errors.message = `メッセージは${LIMITS.message}文字以内で入力してください。`;

	return { values, errors };
}

/**
 * Cheap bot filter: a hidden field humans leave empty, and a render
 * timestamp that rejects instant submissions.
 */
export function looksLikeSpam(form: FormData, now = Date.now()): boolean {
	if (read(form, "website")) return true;
	const renderedAt = Number(read(form, "rendered_at"));
	if (!Number.isFinite(renderedAt) || renderedAt <= 0) return true;
	return now - renderedAt < MIN_FILL_MS;
}

export function buildEmail(values: ContactValues, meta: { receivedAt: Date; userAgent?: string }) {
	const received = new Intl.DateTimeFormat("ja-JP", {
		timeZone: "Asia/Tokyo",
		dateStyle: "long",
		timeStyle: "medium",
	}).format(meta.receivedAt);

	const subject = `【お問い合わせ】${values.subject || "（題名なし）"} - ${values.name} 様`;
	const text = [
		"WEBサイトのお問い合わせフォームから送信がありました。",
		"",
		`お名前: ${values.name}`,
		`メールアドレス: ${values.email}`,
		`題名: ${values.subject || "（なし）"}`,
		"",
		"メッセージ本文:",
		values.message || "（なし）",
		"",
		"---",
		`受信日時: ${received}（日本時間）`,
		meta.userAgent ? `ブラウザ: ${meta.userAgent}` : "",
		"このメールに返信すると、送信者に届きます。",
	]
		.filter((line, i, all) => line !== "" || all[i - 1] !== "")
		.join("\n");

	return { subject, text };
}

export interface ResendConfig {
	apiKey: string;
	from: string;
	to: string;
}

export async function sendWithResend(
	config: ResendConfig,
	values: ContactValues,
	email: { subject: string; text: string },
	fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; status: number; detail: string }> {
	const response = await fetchImpl("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: config.from,
			to: [config.to],
			reply_to: `${values.name} <${values.email}>`,
			subject: email.subject,
			text: email.text,
		}),
	});
	if (response.ok) return { ok: true };
	const detail = await response.text().catch(() => "");
	return { ok: false, status: response.status, detail: detail.slice(0, 500) };
}

export async function verifyTurnstile(
	secret: string,
	token: string,
	ip: string | null,
	fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
	if (!token) return false;
	const body = new FormData();
	body.set("secret", secret);
	body.set("response", token);
	if (ip) body.set("remoteip", ip);
	const response = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
		method: "POST",
		body,
	});
	if (!response.ok) return false;
	const result = (await response.json().catch(() => null)) as { success?: boolean } | null;
	return result?.success === true;
}
