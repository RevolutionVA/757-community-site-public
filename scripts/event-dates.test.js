// Run in UTC like the GitHub Actions runner, where the original bug showed up.
process.env.TZ = "UTC";

import { test } from "node:test";
import assert from "node:assert/strict";
import { formatEventWhen } from "./lib/event-dates.js";

test("evening event ending after 8 PM ET stays on one day", () => {
	// 6–9 PM EDT; the end is 01:00 UTC the next day.
	assert.equal(formatEventWhen("2026-10-22T22:00:00.000Z", "2026-10-23T01:00:00.000Z"), "October 22nd, 2026");
	// 5–8 PM EDT; the end is exactly midnight UTC.
	assert.equal(formatEventWhen("2026-10-29T21:00:00.000Z", "2026-10-30T00:00:00.000Z"), "October 29th, 2026");
});

test("event without an end date", () => {
	assert.equal(formatEventWhen("2026-11-03T23:00:00.000Z"), "November 3rd, 2026");
});

test("multi-day event within one month", () => {
	assert.equal(formatEventWhen("2026-10-22T13:00:00.000Z", "2026-10-23T21:00:00.000Z"), "October 22-23rd, 2026");
});

test("multi-day event spanning months", () => {
	assert.equal(formatEventWhen("2026-10-31T13:00:00.000Z", "2026-11-01T21:00:00.000Z"), "October 31st-November 1st, 2026");
});
