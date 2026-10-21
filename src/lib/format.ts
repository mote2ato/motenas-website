const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

/** "2026.10.21" in Japan time. Returns "" for a missing date. */
export function formatDate(date: Date | string | null | undefined): string {
	if (!date) return "";
	const value = typeof date === "string" ? new Date(date) : date;
	if (Number.isNaN(value.getTime())) return "";
	return dateFormatter.format(value).replaceAll("/", ".");
}

/** ISO string for <time datetime>. */
export function isoDate(date: Date | string | null | undefined): string | undefined {
	if (!date) return undefined;
	const value = typeof date === "string" ? new Date(date) : date;
	return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
}
