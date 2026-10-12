import { test } from "node:test";
import assert from "node:assert/strict";
import { dedupeEvents, normalizeTitle } from "./deduplicate-calendar.js";

const START = "2026-10-14T22:30:00.000Z";

const meetup = (overrides) => ({
	source: "meetup",
	date: START,
	updatedDate: "2026-10-01T00:00:00.000Z",
	...overrides,
});

const aichrCopy = meetup({
	title: "🧜‍♀️ AICHR | Peninsula Builders Study Group",
	group: "AI Collective Hampton Roads",
	link: "https://www.meetup.com/aicollectivehr/events/1/",
	updatedDate: "2026-10-05T00:00:00.000Z",
});
const devCopy = meetup({
	title: "Peninsula Builders Study Group",
	group: "757 Developers",
	link: "https://www.meetup.com/757dev/events/2/",
});
const devNextTime = meetup({
	title: "Peninsula Builders Study Group",
	group: "757 Developers",
	link: "https://www.meetup.com/757dev/events/3/",
	date: "2026-10-21T22:30:00.000Z",
});
const cppSameSlot = meetup({
	title: "C++ | Intro to Templates",
	group: "Other Group",
	link: "https://www.meetup.com/other/events/4/",
});

test("normalizeTitle strips emoji and a known cross-post tag but not an unknown pipe prefix", () => {
	assert.equal(normalizeTitle(aichrCopy.title), "peninsula builders study group");
	assert.equal(normalizeTitle(devCopy.title), "peninsula builders study group");
	assert.equal(normalizeTitle(cppSameSlot.title), "c++ | intro to templates");
});

test("collapses a cross-post to the 757 Developers listing regardless of input order", () => {
	for (const input of [
		[aichrCopy, devCopy, devNextTime, cppSameSlot],
		[devCopy, aichrCopy, devNextTime, cppSameSlot],
	]) {
		const { events, crossPostsFound } = dedupeEvents(input);
		assert.equal(events.length, 3);
		const peninsula = events.filter((e) => e.date === START && /Peninsula/.test(e.title));
		assert.equal(peninsula.length, 1);
		assert.equal(peninsula[0].group, "757 Developers");
		assert.equal(peninsula[0].link, devCopy.link);
		assert.deepEqual(crossPostsFound.map((c) => c.droppedGroup), ["AI Collective Hampton Roads"]);
	}
});

test("same title at a different start time is a separate event", () => {
	const { events } = dedupeEvents([devCopy, devNextTime]);
	assert.equal(events.length, 2);
});

test("a title with a pipe but no known tag at the same start time is not merged", () => {
	const { events } = dedupeEvents([devCopy, cppSameSlot]);
	assert.equal(events.length, 2);
});

test("exact URL duplicates keep the most recently updated copy", () => {
	const stale = meetup({ title: "Old title", group: "G", link: "https://www.meetup.com/g/events/9/" });
	const fresh = { ...stale, title: "New title", updatedDate: "2026-10-09T00:00:00.000Z" };
	const { events, duplicatesFound } = dedupeEvents([stale, fresh]);
	assert.equal(events.length, 1);
	assert.equal(events[0].title, "New title");
	assert.equal(duplicatesFound.length, 1);
});

test("an event with an unparseable date passes through instead of throwing", () => {
	const broken = meetup({ title: "Broken", group: "G", link: "https://www.meetup.com/g/events/8/", date: "not a date" });
	const { events } = dedupeEvents([broken, devCopy]);
	assert.equal(events.length, 2);
	assert.ok(events.some((e) => e.title === "Broken"));
});
