/**
 * Script to deduplicate the calendar events
 * This script reads the calendar-events.json file, removes duplicate events
 * that have the same title, group, and date (ignoring time), and saves the result.
 *
 * It also collapses cross-posted events: a single real-world event announced by two
 * Meetup groups arrives as two entries with different URLs, so the URL key alone can
 * never catch them. See CROSS_POST_PREFERRED_GROUPS below.
 *
 * The update-calendar GitHub Action runs this before every commit, so the pure logic
 * lives in exported `dedupeEvents()` (covered by deduplicate-calendar.test.js) and the
 * file I/O only runs when the script is executed directly.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CALENDAR_FILE_PATH = path.join(
	__dirname,
	"..",
	"src",
	"data",
	"calendar-events.json",
);

// When the same event is cross-posted by multiple groups, the listing from the group
// earliest in this list wins. Groups not named here rank last and fall back to the
// most-recently-updated entry.
export const CROSS_POST_PREFERRED_GROUPS = ["757 Developers", "AI Collective Hampton Roads"];

// Prefixes that groups put in front of a cross-posted title ("AICHR | Real Title").
// Deliberately an explicit list rather than a generic "strip anything before a pipe":
// a generic rule would also clip legitimate titles like "C++ | Intro to Templates",
// and two such titles at the same start time would then be silently merged — dropping
// a real event from the site. If a new group starts cross-posting, add its tag here.
// Until then the worst case is a visible duplicate, which is far easier to notice than
// a silently missing event.
export const CROSS_POST_TITLE_TAGS = ["AICHR"];

const CROSS_POST_TAG_PATTERN = new RegExp(
	`^(?:${CROSS_POST_TITLE_TAGS.map((tag) => tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*\\|\\s*`,
	"i",
);

/**
 * Normalizes a title so the same event announced by two groups compares equal.
 * Strips decorative emoji and a known leading group tag ("AICHR | ..."), then
 * lowercases and collapses whitespace.
 * @param {string} title
 * @returns {string}
 */
export function normalizeTitle(title) {
	return (title || "")
		.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
		.trim()
		.replace(CROSS_POST_TAG_PATTERN, "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Ranks an event's group against CROSS_POST_PREFERRED_GROUPS. Lower wins.
 * @param {Object} event
 * @returns {number}
 */
function groupRank(event) {
	const index = CROSS_POST_PREFERRED_GROUPS.indexOf(event.group);
	return index === -1 ? CROSS_POST_PREFERRED_GROUPS.length : index;
}

/**
 * Decides which of two cross-posted copies to keep: preferred group first, then
 * whichever carries the freshest data from the source.
 * @param {Object} incoming
 * @param {Object} existing
 * @returns {boolean} - True if incoming should replace existing
 */
function incomingWinsCrossPost(incoming, existing) {
	const incomingRank = groupRank(incoming);
	const existingRank = groupRank(existing);
	if (incomingRank !== existingRank) {
		return incomingRank < existingRank;
	}
	return (
		new Date(incoming.updatedDate || incoming.date) >
		new Date(existing.updatedDate || existing.date)
	);
}

/**
 * Pure deduplication: exact duplicates first (URL for meetup events, title+day+group
 * otherwise), then cross-posted copies of the same event. Never throws on a bad
 * `date` — an event whose date doesn't parse can't be matched, so it passes through
 * untouched rather than failing the whole calendar update.
 * @param {Object[]} events
 * @returns {{ events: Object[], duplicatesFound: Object[], crossPostsFound: Object[] }}
 */
export function dedupeEvents(events) {
	const uniqueEventsMap = new Map();
	const duplicatesFound = [];

	for (const event of events) {
		let key;
		if (event.source === "meetup" && event.link) {
			key = event.link;
		} else {
			const dateObj = new Date(event.date);
			const datePart = Number.isNaN(dateObj.getTime())
				? String(event.date)
				: dateObj.toISOString().split("T")[0];
			key = `${event.title}|${datePart}|${event.group}`;
		}

		const existingEvent = uniqueEventsMap.get(key);
		if (!existingEvent) {
			uniqueEventsMap.set(key, event);
			continue;
		}

		duplicatesFound.push({
			key,
			existingTitle: existingEvent.title,
			duplicateTitle: event.title,
			originalDate: existingEvent.date,
			duplicateDate: event.date,
			existingUpdated: existingEvent.updatedDate,
			duplicateUpdated: event.updatedDate,
		});

		const eventUpdated = new Date(event.updatedDate || event.date);
		const existingUpdated = new Date(existingEvent.updatedDate || existingEvent.date);
		if (eventUpdated > existingUpdated) {
			uniqueEventsMap.set(key, event);
		}
	}

	const urlDedupedEvents = Array.from(uniqueEventsMap.values());

	// Second pass: collapse cross-posted events. The same real-world event announced by
	// two groups has two distinct URLs, so the primary key above can never match them.
	// Keying on normalized title + exact start time catches the cross-post while staying
	// strict enough that two genuinely different events don't get merged.
	const crossPostMap = new Map();
	const passThrough = [];
	const crossPostsFound = [];

	for (const event of urlDedupedEvents) {
		const start = new Date(event.date);
		if (event.source !== "meetup" || Number.isNaN(start.getTime())) {
			passThrough.push(event);
			continue;
		}

		const key = `${normalizeTitle(event.title)}|${start.toISOString()}`;
		const existing = crossPostMap.get(key);

		if (!existing) {
			crossPostMap.set(key, event);
			continue;
		}

		const winner = incomingWinsCrossPost(event, existing) ? event : existing;
		const loser = winner === event ? existing : event;
		crossPostsFound.push({ key, keptGroup: winner.group, droppedGroup: loser.group });
		crossPostMap.set(key, winner);
	}

	const dedupedEvents = [...passThrough, ...crossPostMap.values()];
	dedupedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

	return { events: dedupedEvents, duplicatesFound, crossPostsFound };
}

function main() {
	console.log("Starting calendar deduplication process...");

	try {
		const events = JSON.parse(fs.readFileSync(CALENDAR_FILE_PATH, "utf8"));
		console.log(`Read ${events.length} events from file`);

		const { events: dedupedEvents, duplicatesFound, crossPostsFound } = dedupeEvents(events);

		const removedCount = events.length - dedupedEvents.length;
		console.log(`Found and removed ${removedCount} duplicate events`);

		if (crossPostsFound.length > 0) {
			console.log(
				`Collapsed ${crossPostsFound.length} cross-posted events (preferring ${CROSS_POST_PREFERRED_GROUPS[0]}):`,
			);
			for (const cross of crossPostsFound) {
				console.log(
					`  "${cross.key}" - kept ${cross.keptGroup}, dropped ${cross.droppedGroup}`,
				);
			}
		}

		if (duplicatesFound.length > 0) {
			console.log(
				`Duplicates found (keeping the most recently updated version):`,
			);
			for (const dup of duplicatesFound) {
				console.log(`  Key: ${dup.key}`);
				console.log(
					`    Existing: "${dup.existingTitle}" (updated: ${dup.existingUpdated})`,
				);
				console.log(
					`    Duplicate: "${dup.duplicateTitle}" (updated: ${dup.duplicateUpdated})`,
				);
			}
		}

		const backupPath = `${CALENDAR_FILE_PATH}.bak`;
		fs.copyFileSync(CALENDAR_FILE_PATH, backupPath);
		console.log(`Backup created at ${backupPath}`);

		fs.writeFileSync(CALENDAR_FILE_PATH, JSON.stringify(dedupedEvents, null, 2));

		console.log(
			`Successfully deduplicated events. New count: ${dedupedEvents.length} events (removed ${removedCount})`,
		);
	} catch (error) {
		console.error(`Error deduplicating calendar events: ${error.message}`);
		if (error.stack) {
			console.error(error.stack);
		}
		process.exit(1);
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
	main();
}
