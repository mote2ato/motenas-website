import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDate } from "../src/lib/format.ts";

test("formatDate uses Japan time", () => {
	// 2026-10-21 16:00 UTC is already the 22nd in Tokyo.
	assert.equal(formatDate(new Date("2026-10-21T16:00:00Z")), "2026.10.22");
	assert.equal(formatDate(null), "");
	assert.equal(formatDate("not a date"), "");
});
