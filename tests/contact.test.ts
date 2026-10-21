import assert from "node:assert/strict";
import { test } from "node:test";
import {
	MIN_FILL_MS,
	buildEmail,
	looksLikeSpam,
	sendWithResend,
	validateContact,
	verifyTurnstile,
} from "../src/lib/contact.ts";

function form(fields: Record<string, string>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(fields)) data.set(key, value);
	return data;
}

test("validateContact accepts a complete submission and trims values", () => {
	const { values, errors } = validateContact(
		form({ name: " 山田 太郎 ", email: "taro@example.jp", subject: "相談", message: "本文" }),
	);
	assert.deepEqual(errors, {});
	assert.equal(values.name, "山田 太郎");
});

test("validateContact requires name and a valid email", () => {
	const { errors } = validateContact(form({ name: "", email: "not-an-email" }));
	assert.ok(errors.name);
	assert.ok(errors.email);
});

test("validateContact rejects line breaks in header fields", () => {
	const { errors } = validateContact(
		form({ name: "a\r\nBcc: x@y.z", email: "a@b.co\nBcc: x@y.z", subject: "x\ny" }),
	);
	assert.ok(errors.name);
	assert.ok(errors.email);
	assert.ok(errors.subject);
});

test("validateContact enforces the message length limit", () => {
	const { errors } = validateContact(form({ name: "a", email: "a@b.co", message: "あ".repeat(5001) }));
	assert.ok(errors.message);
});

test("looksLikeSpam catches the honeypot, missing timestamp, and instant posts", () => {
	const now = 1_000_000;
	assert.equal(looksLikeSpam(form({ website: "http://spam", rendered_at: "1" }), now), true);
	assert.equal(looksLikeSpam(form({}), now), true);
	assert.equal(looksLikeSpam(form({ rendered_at: String(now - 100) }), now), true);
	assert.equal(looksLikeSpam(form({ rendered_at: String(now - MIN_FILL_MS - 1) }), now), false);
});

test("buildEmail puts the sender details in subject and body", () => {
	const email = buildEmail(
		{ name: "山田", email: "y@example.jp", subject: "", message: "こんにちは" },
		{ receivedAt: new Date("2026-10-21T03:00:00Z") },
	);
	assert.equal(email.subject, "【お問い合わせ】（題名なし） - 山田 様");
	assert.match(email.text, /メールアドレス: y@example\.jp/);
	assert.match(email.text, /こんにちは/);
	assert.match(email.text, /2026年10月21日/);
});

test("sendWithResend posts to the Resend API with reply-to set to the sender", async () => {
	let captured: { url: string; init: RequestInit } | undefined;
	const fakeFetch = (async (url: string, init: RequestInit) => {
		captured = { url, init };
		return new Response(JSON.stringify({ id: "1" }), { status: 200 });
	}) as unknown as typeof fetch;

	const result = await sendWithResend(
		{ apiKey: "re_test", from: "株式会社もてなす <noreply@motenas.co.jp>", to: "info@motenas.co.jp" },
		{ name: "山田", email: "y@example.jp", subject: "s", message: "m" },
		{ subject: "件名", text: "本文" },
		fakeFetch,
	);

	assert.deepEqual(result, { ok: true });
	assert.equal(captured?.url, "https://api.resend.com/emails");
	assert.equal((captured?.init.headers as Record<string, string>).Authorization, "Bearer re_test");
	const body = JSON.parse(String(captured?.init.body));
	assert.deepEqual(body.to, ["info@motenas.co.jp"]);
	assert.equal(body.reply_to, "山田 <y@example.jp>");
});

test("sendWithResend reports API failures", async () => {
	const fakeFetch = (async () => new Response("bad key", { status: 401 })) as unknown as typeof fetch;
	const result = await sendWithResend(
		{ apiKey: "x", from: "a@b.co", to: "c@d.co" },
		{ name: "a", email: "a@b.co", subject: "", message: "" },
		{ subject: "s", text: "t" },
		fakeFetch,
	);
	assert.deepEqual(result, { ok: false, status: 401, detail: "bad key" });
});

test("verifyTurnstile requires a token and a successful verdict", async () => {
	const ok = (async () => Response.json({ success: true })) as unknown as typeof fetch;
	const ng = (async () => Response.json({ success: false })) as unknown as typeof fetch;
	assert.equal(await verifyTurnstile("secret", "", null, ok), false);
	assert.equal(await verifyTurnstile("secret", "token", "1.2.3.4", ok), true);
	assert.equal(await verifyTurnstile("secret", "token", null, ng), false);
});
