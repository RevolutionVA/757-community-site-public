/**
 * Newport News Public Library (NNPL) event source.
 *
 * NNPL publishes every library program in one Tockify ICS feed, so only events
 * whose Tockify event ID is in src/data/nnpl-allowlist.json are ingested. The
 * feed is already expanded (no RRULE) and its times are UTC.
 *
 * Kept free of I/O so the identity rules can be tested: the updater fetches the
 * feed and hands the text in.
 */

export const NNPL_SOURCE = 'nnpl';

// The feed carries no registration state, capacity or price.
const AVAILABILITY_NOTE = "Check availability on the library's event page.";

// Tags that mark an unlisted event as worth a reviewer's look.
const CANDIDATE_TAGS = new Set(['computer', 'technology', 'robots', '3d-printer']);

// NNPL flags status in the title, e.g. "**Rescheduled** Premiere Pro for Beginners".
const TITLE_MARKER = /^\s*\*\*[^*]+\*\*\s*/;

const COMPARED_FIELDS = ['title', 'link', 'date', 'endDate', 'description', 'location'];

/** Parse ICS text into one plain object per VEVENT, keyed by property name. */
export function parseIcs(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      const name = line.slice(0, colon).split(';')[0];
      current[name] = line.slice(colon + 1);
    }
  }

  return events;
}

function unescapeText(value = '') {
  return value.replace(/\\([\\,;nN])/g, (_, char) => (char.toLowerCase() === 'n' ? '\n' : char));
}

/** "20261013T141500Z" -> Date. All-day values ("20261013") return null. */
function parseUtcDateTime(value = '') {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

/** Tockify UIDs look like "TKF/<calendar>/<eventId>/<slotMinutes>/<instance>/0". */
export function eventIdFromUid(uid = '') {
  return uid.split('/')[2] ?? '';
}

function toCalendarEvent(vevent, group) {
  const start = parseUtcDateTime(vevent.DTSTART);
  if (!start || !vevent.UID) return null;

  const rawTitle = unescapeText(vevent.SUMMARY).trim();
  const end = parseUtcDateTime(vevent.DTEND);
  const description = unescapeText(vevent.DESCRIPTION).replace(/\n{3,}/g, '\n\n').trim();
  // Most listings already say registration is required; don't say it twice.
  const note = /registration/i.test(description) ? AVAILABILITY_NOTE : `Registration required. ${AVAILABILITY_NOTE}`;

  const event = {
    title: rawTitle.replace(TITLE_MARKER, '').trim(),
    link: vevent.URL,
    date: start.toISOString(),
    description: description ? `${description}\n\n${note}` : note,
    source: NNPL_SOURCE,
    group,
    sourceId: vevent.UID,
  };

  const location = unescapeText(vevent.LOCATION)
    .replace(/,(?=\S)/g, ', ')
    .replace(/, USA$/, '')
    .trim();
  if (location) event.location = location;

  // Some listings have no end time and repeat the start instead.
  if (end && end > start) event.endDate = end.toISOString();

  return {
    event,
    eventId: eventIdFromUid(vevent.UID),
    cancelled: vevent.STATUS === 'CANCELLED' || /^\s*\*\*cancel/i.test(rawTitle),
    tags: (vevent.CATEGORIES ?? '').split(',').map((tag) => tag.trim().toLowerCase()),
  };
}

/**
 * Pick the upcoming, allowlisted, non-cancelled events out of a parsed feed.
 * `candidates` are upcoming tech-tagged events nobody has reviewed yet.
 */
export function selectNnplEvents(vevents, allowlist, now = new Date()) {
  const allowedIds = new Set(allowlist.events.map((entry) => entry.id));
  const events = [];
  const candidates = new Map();

  for (const vevent of vevents) {
    const parsed = toCalendarEvent(vevent, allowlist.group);
    if (!parsed || parsed.cancelled || new Date(parsed.event.date) < now) continue;

    if (allowedIds.has(parsed.eventId)) {
      events.push(parsed.event);
    } else if (parsed.tags.some((tag) => CANDIDATE_TAGS.has(tag)) && !candidates.has(parsed.eventId)) {
      candidates.set(parsed.eventId, { id: parsed.eventId, title: parsed.event.title, date: parsed.event.date });
    }
  }

  return { events, candidates: [...candidates.values()] };
}

function groupByEventId(events) {
  const groups = new Map();
  for (const event of events) {
    const id = eventIdFromUid(event.sourceId);
    groups.set(id, [...(groups.get(id) ?? []), event]);
  }
  return groups;
}

/**
 * Replace the NNPL events in `existingEvents` with the current feed selection.
 * The feed is authoritative: an upcoming NNPL event that is no longer in it
 * (cancelled, removed, or dropped from the allowlist) is removed.
 */
export function reconcileNnplEvents(existingEvents, feedEvents, now = new Date()) {
  const nowIso = now.toISOString();
  const others = existingEvents.filter((event) => event.source !== NNPL_SOURCE);
  const previous = existingEvents.filter((event) => event.source === NNPL_SOURCE);
  const previousByUid = new Map(previous.map((event) => [event.sourceId, event]));
  const feedUids = new Set(feedEvents.map((event) => event.sourceId));

  // A moved series occurrence keeps its UID. A moved one-off gets a new UID but
  // keeps its event ID, so pair them only when exactly one left and one arrived.
  const vanished = groupByEventId(
    previous.filter((event) => !feedUids.has(event.sourceId) && new Date(event.date) >= now),
  );
  const arrived = groupByEventId(feedEvents.filter((event) => !previousByUid.has(event.sourceId)));

  const merged = feedEvents.map((event) => {
    let prior = previousByUid.get(event.sourceId);
    if (!prior) {
      const id = eventIdFromUid(event.sourceId);
      if (vanished.get(id)?.length === 1 && arrived.get(id)?.length === 1) {
        prior = vanished.get(id)[0];
      }
    }

    if (!prior) {
      return { ...event, featuredEvent: false, createdDate: nowIso, updatedDate: nowIso };
    }

    const changed = COMPARED_FIELDS.some((field) => prior[field] !== event[field]);
    const result = {
      ...event,
      featuredEvent: prior.featuredEvent ?? false,
      createdDate: prior.createdDate ?? nowIso,
      updatedDate: changed ? nowIso : (prior.updatedDate ?? nowIso),
    };

    if (prior.title !== event.title || prior.date !== event.date) {
      result.previousVersion = { title: prior.title, date: prior.date };
    } else if (prior.previousVersion) {
      result.previousVersion = prior.previousVersion;
    }

    return result;
  });

  return [...others, ...merged];
}
