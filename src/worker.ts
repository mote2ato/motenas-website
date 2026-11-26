import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

/**
 * http で来たリクエストを https へ寄せる。
 * Cloudflare の Always Use HTTPS が無効でも、Worker 側で必ず転送する。
 * 判定は URL のスキームと cf-visitor ヘッダーの両方で行う。
 */
function httpsRedirect(request: Request): Response | null {
	const url = new URL(request.url);
	if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return null;

	let scheme = url.protocol.replace(":", "");
	const visitor = request.headers.get("cf-visitor");
	if (visitor) {
		try {
			const parsed = JSON.parse(visitor) as { scheme?: string };
			if (parsed.scheme) scheme = parsed.scheme;
		} catch {
			// ヘッダーが壊れていても URL 側の判定で続行する
		}
	}
	if (scheme !== "http") return null;

	url.protocol = "https:";
	const status = request.method === "GET" || request.method === "HEAD" ? 301 : 308;
	return Response.redirect(url.toString(), status);
}

export default {
	...handler,
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const redirect = httpsRedirect(request);
		if (redirect) return redirect;
		if (!handler.fetch) throw new Error("EmDash handler has no fetch");
		return handler.fetch(request, env, ctx);
	},
	scheduled: createScheduledHandler(),
} satisfies ExportedHandler<Env>;
