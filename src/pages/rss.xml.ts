import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";

const SITE_TITLE = "株式会社もてなす";

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export const GET: APIRoute = async ({ url }) => {
	const origin = url.origin;
	const [posts, news] = await Promise.all([
		getEmDashCollection("posts", { orderBy: { published_at: "desc" }, limit: 20 }),
		getEmDashCollection("news", { orderBy: { published_at: "desc" }, limit: 20 }),
	]);

	const items = [
		...posts.entries.map((entry) => ({
			link: `${origin}/blog/${entry.id}`,
			title: entry.data.title,
			description: entry.data.excerpt ?? "",
			date: entry.data.publishedAt,
			category: "ブログ",
		})),
		...news.entries.map((entry) => ({
			link: `${origin}/news/${entry.id}`,
			title: entry.data.title,
			description: "",
			date: entry.data.publishedAt,
			category: "お知らせ",
		})),
	]
		.filter((item): item is typeof item & { date: Date } => item.date instanceof Date)
		.sort((a, b) => b.date.getTime() - a.date.getTime())
		.slice(0, 30);

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${origin}/</link>
    <atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>${escapeXml(`${SITE_TITLE}のお知らせとブログ`)}</description>
    <language>ja</language>
${items
	.map(
		(item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${item.link}</link>
      <guid isPermaLink="true">${item.link}</guid>
      <category>${item.category}</category>
      <pubDate>${item.date.toUTCString()}</pubDate>
      <description>${escapeXml(item.description)}</description>
    </item>`,
	)
	.join("\n")}
  </channel>
</rss>`;

	return new Response(body, {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			"Cache-Control": "public, max-age=900",
		},
	});
};
