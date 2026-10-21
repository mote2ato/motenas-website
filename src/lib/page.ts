import { getEmDashEntry, getSeoMeta } from "emdash";

type AstroLike = {
	url: URL;
	cache?: { enabled?: boolean; set: (hint: never) => void };
};

/**
 * Loads a page from the "pages" collection with its SEO meta.
 * Returns null when the page is missing or unpublished.
 */
export async function loadPage(Astro: AstroLike, slug: string) {
	const { entry: page, cacheHint } = await getEmDashEntry("pages", slug);
	if (!page) return null;
	if (Astro.cache?.enabled) Astro.cache.set(cacheHint as never);

	const seo = getSeoMeta(page, {
		siteUrl: Astro.url.origin,
		path: `/${page.id}`,
		defaultDescription: page.data.lead?.trim() || undefined,
	});
	return { page, seo };
}

/** Splits an English display title into stacked lines (max ~10 chars each). */
export function displayLines(title: string | null | undefined, fallback: string): string[] {
	const text = title?.trim() || fallback;
	const words = text.split(/\s+/);
	const lines: string[] = [];
	for (const word of words) {
		const last = lines.at(-1);
		if (last && `${last} ${word}`.length <= 12) lines[lines.length - 1] = `${last} ${word}`;
		else lines.push(word);
	}
	return lines;
}
