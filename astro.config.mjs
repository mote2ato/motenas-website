import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";

export default defineConfig({
	site: "https://motenas.co.jp",
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	// Old WordPress URLs that no longer have their own page.
	redirects: {
		"/hello-world": "/blog",
		"/sample-page": "/",
		"/renewal": "/",
		"/feed": "/rss.xml",
		// /category/* is handled by src/pages/category/[...slug].astro: as a static
		// rule it becomes "/blog/index.html", which Cloudflare rejects as a loop.
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
		}),
	],
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-display",
			weights: [400],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400],
			fallbacks: ["monospace"],
		},
		{
			provider: fontProviders.google(),
			name: "Noto Sans JP",
			cssVariable: "--font-jp",
			weights: [400, 500],
			fallbacks: ["sans-serif"],
		},
	],
	devToolbar: { enabled: false },
});
