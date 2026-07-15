/**
 * Script to deduplicate the calendar events
 * This script reads the calendar-events.json file, removes duplicate events
 * that have the same title, group, and date (ignoring time), and saves the result.
 *
 * It also collapses cross-posted events: a single real-world event announced by two
 * Meetup groups arrives as two entries with different URLs, so the URL key alone can
 * never catch them. See CROSS_POST_PREFERRED_GROUPS below.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the calendar events JSON file
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
const CROSS_POST_PREFERRED_GROUPS = ["757 Developers", "AI Collective Hampton Roads"];

// Prefixes that groups put in front of a cross-posted title ("AICHR | Real Title").
// Deliberately an explicit list rather than a generic "strip anything before a pipe":
// a generic rule would also clip legitimate titles like "C++ | Intro to Templates",
// and two such titles at the same start time would then be silently merged — dropping
// a real event from the site. If a new group starts cross-posting, add its tag here.
// Until then the worst case is a visible duplicate, which is far easier to notice than
// a silently missing event.
const CROSS_POST_TITLE_TAGS = ["AICHR"];

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
function normalizeTitle(title) {
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

console.log("Starting calendar deduplication process...");

// Check if the file exists
if (!fs.existsSync(CALENDAR_FILE_PATH)) {
	console.error(`Calendar events file not found at ${CALENDAR_FILE_PATH}`);
	process.exit(1);
}

try {
	// Read the file
	const fileContents = fs.readFileSync(CALENDAR_FILE_PATH, "utf8");
	const events = JSON.parse(fileContents);

	console.log(`Read ${events.length} events from file`);

	// Map to store unique events
	// For meetup events: use URL as the primary key
	// For other events: use title, date without time, and group
	const uniqueEventsMap = new Map();
	const duplicatesFound = [];

	// Process each event
	for (const event of events) {
		let key;
		let isDuplicateKey;

		// For meetup events with a link, use URL as the primary deduplication key
		if (event.source === "meetup" && event.link) {
			key = event.link;
			isDuplicateKey = uniqueEventsMap.has(key);
		} else {
			// For non-meetup events, use title, date part, and group
			const dateObj = new Date(event.date);
			const datePart = dateObj.toISOString().split("T")[0];
			key = `${event.title}|${datePart}|${event.group}`;
			isDuplicateKey = uniqueEventsMap.has(key);
		}

		// If we already have this event, log it as a duplicate
		if (isDuplicateKey) {
			const existingEvent = uniqueEventsMap.get(key);
			duplicatesFound.push({
				key,
				existingTitle: existingEvent.title,
				duplicateTitle: event.title,
				originalDate: existingEvent.date,
				duplicateDate: event.date,
				existingUpdated: existingEvent.updatedDate,
				duplicateUpdated: event.updatedDate,
			});

			// Keep the event with the most recent updatedDate (latest info from source)
			const eventUpdated = new Date(event.updatedDate || event.date);
			const existingUpdated = new Date(
				existingEvent.updatedDate || existingEvent.date,
			);
			if (eventUpdated > existingUpdated) {
				uniqueEventsMap.set(key, event);
			}
		} else {
			// This is a new unique event
			uniqueEventsMap.set(key, event);
		}
	}

	// Convert map back to array
	const urlDedupedEvents = Array.from(uniqueEventsMap.values());

	// Second pass: collapse cross-posted events. The same real-world event announced by
	// two groups has two distinct URLs, so the primary key above can never match them.
	// Keying on normalized title + exact start time catches the cross-post while staying
	// strict enough that two genuinely different events don't get merged.
	const crossPostMap = new Map();
	const passThrough = [];
	const crossPostsFound = [];

	for (const event of urlDedupedEvents) {
		if (event.source !== "meetup" || !event.date) {
			passThrough.push(event);
			continue;
		}

		const key = `${normalizeTitle(event.title)}|${new Date(event.date).toISOString()}`;
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

	// Sort events by date
	dedupedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

	// Log results
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

	// Log the duplicates that were found
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

	// Make a backup of the original file
	const backupPath = `${CALENDAR_FILE_PATH}.bak`;
	fs.copyFileSync(CALENDAR_FILE_PATH, backupPath);
	console.log(`Backup created at ${backupPath}`);

	// Write the deduplicated events back to the file
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
