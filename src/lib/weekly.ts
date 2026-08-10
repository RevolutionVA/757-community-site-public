/**
 * Parser for the weekly meetup digests in weekly-meetups/.
 *
 * 73 files, one per Monday since 2025-03-10, written by
 * scripts/generate-weekly-meetups.js and until now published only to Slack and
 * the Bento newsletter. They are the only surviving record of past weeks —
 * calendar-events.json holds future events only — so they are parsed, never
 * regenerated.
 *
 * The files have no frontmatter, so structure is recovered from the body. Two
 * things make a naive line-based parse wrong, both verified against the corpus:
 *
 *   1. Event descriptions contain their own Markdown headings. Of 279 `### `
 *      lines, only 240 are day headings; of 426 `#### ` lines, only 410 are
 *      events. Headings are therefore only structural when they appear outside
 *      a description block.
 *   2. The `- **Time:** / - **Group:** / - **Link:**` triple appears exactly
 *      410 times, matching the declared event total precisely. A `#### ` line
 *      is an event only when a Time bullet follows it.
 *
 * Descriptions end at a `---` on its own line. Descriptions do contain `---`
 * runs, but escaped as `\-\-\-`, which does not match, so the terminator holds.
 */

import { collectionPageNode } from "./schema";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export interface ArchivedEvent {
  /** Display title, decorative emoji stripped. */
  title: string;
  /** Title exactly as written in the digest. */
  rawTitle: string;
  /** e.g. "06:30 PM" */
  time: string;
  group: string;
  link: string;
  descriptionMd: string;
}

export interface ArchiveDay {
  /** e.g. "Monday, July 27" */
  label: string;
  weekday: string;
  /** YYYY-MM-DD, derived from the week's Monday + weekday offset. */
  date: string;
  events: ArchivedEvent[];
}

export interface ArchiveWeek {
  /** YYYY-MM-DD, from the filename — the authoritative date. */
  monday: string;
  sunday: string;
  days: ArchiveDay[];
  count: number;
  /** The `## N Meetups This Week` figure, used to verify the parse. */
  declaredCount: number;
  groups: string[];
  titles: string[];
}

/**
 * Only the .md digests. The directory also holds 73 `-slack.txt` siblings which
 * are ~90% the same text reformatted for Slack; publishing both would be
 * duplicate content.
 */
const files = import.meta.glob("/weekly-meetups/*-weekly-meetups.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const addDays = (iso: string, n: number): string => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
};

/** Strip leading decorative emoji (and ZWJ sequences) from a title. */
const stripEmoji = (s: string): string =>
  s
    .replace(
      /^(?:[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2640}\u{2642}\u{1F3FB}-\u{1F3FF}]|\s)+/gu,
      "",
    )
    .trim();

/** "06:30 PM" -> 1110. Unparseable times sort last rather than first. */
function minutesOfDay(time: string): number {
  const m = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return 24 * 60 + 1;
  let h = Number(m[1]) % 12;
  if (m[3]?.toUpperCase() === "PM") h += 12;
  else if (!m[3]) h = Number(m[1]); // already 24h
  return h * 60 + Number(m[2]);
}

function parseWeek(path: string, raw: string): ArchiveWeek | null {
  const monday = path.match(/(\d{4}-\d{2}-\d{2})-weekly-meetups\.md$/)?.[1];
  if (!monday) return null;

  const lines = raw.split(/\r?\n/);
  const declaredCount = Number(
    raw.match(/^##\s+(\d+)\s+Meetups This Week/m)?.[1] ?? 0,
  );

  const days: ArchiveDay[] = [];
  let day: ArchiveDay | null = null;
  let event: ArchivedEvent | null = null;
  let descLines: string[] | null = null;

  const closeEvent = () => {
    if (event) {
      event.descriptionMd = (descLines ?? []).join("\n").trim();
      day?.events.push(event);
    }
    event = null;
    descLines = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Inside a description, only a bare `---` ends the block. Headings there are
    // the event author's own content, not structure.
    if (descLines) {
      if (line.trim() === "---") {
        closeEvent();
        continue;
      }
      descLines.push(line);
      continue;
    }

    const dayMatch = line.match(
      /^###\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(.+?)\s*$/,
    );
    if (dayMatch) {
      closeEvent();
      const weekday = dayMatch[1];
      const offset = WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number]);
      day = {
        label: `${weekday}, ${dayMatch[2].replace(/,\s*\d{4}$/, "")}`,
        weekday,
        // Derived from the filename Monday, not the printed date: day headings
        // are inconsistent about including the year.
        date: addDays(monday, offset < 0 ? 0 : offset),
        events: [],
      };
      days.push(day);
      continue;
    }

    if (line.startsWith("#### ")) {
      // A heading is an event only if a Time bullet follows within a few lines.
      const lookahead = lines.slice(i + 1, i + 5);
      if (!lookahead.some((l) => l.startsWith("- **Time:**"))) continue;

      closeEvent();
      if (!day) {
        // Defensive: an event before any day heading. Bucket it under Monday.
        day = { label: "", weekday: "Monday", date: monday, events: [] };
        days.push(day);
      }
      const rawTitle = line.slice(5).trim();
      event = {
        title: stripEmoji(rawTitle),
        rawTitle,
        time: "",
        group: "",
        link: "",
        descriptionMd: "",
      };
      continue;
    }

    if (!event) continue;

    const time = line.match(/^-\s+\*\*Time:\*\*\s*(.+?)\s*$/);
    if (time) { event.time = time[1]; continue; }

    const group = line.match(/^-\s+\*\*Group:\*\*\s*(.+?)\s*$/);
    if (group) { event.group = group[1]; continue; }

    const link = line.match(/^-\s+\*\*Link:\*\*\s*\[[^\]]*\]\(([^)]+)\)/);
    if (link) { event.link = link[1]; continue; }

    if (/^\*\*Description:\*\*/.test(line)) {
      descLines = [];
      continue;
    }
  }
  closeEvent();

  // 12 of the 73 digests (Apr-Jul 2025) list their day headings out of
  // chronological order — a bug in the generator at the time, e.g.
  // 2025-07-07 runs Thursday, Tuesday, Wednesday. Sort here so the archive
  // always reads chronologically regardless of how the source was written.
  const withEvents = days
    .filter((d) => d.events.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const d of withEvents) {
    d.events.sort((a, b) => minutesOfDay(a.time) - minutesOfDay(b.time));
  }

  const all = withEvents.flatMap((d) => d.events);

  return {
    monday,
    sunday: addDays(monday, 6),
    days: withEvents,
    count: all.length,
    declaredCount,
    groups: [...new Set(all.map((e) => e.group).filter(Boolean))],
    titles: all.map((e) => e.title),
  };
}

let cache: ArchiveWeek[] | null = null;

/** All parsed weeks, newest first. */
export function getWeeks(): ArchiveWeek[] {
  if (cache) return cache;

  const weeks: ArchiveWeek[] = [];
  for (const [path, raw] of Object.entries(files)) {
    const week = parseWeek(path, raw);
    if (!week) continue;
    // Surface parse drift loudly at build time rather than silently shipping a
    // week with missing events.
    if (week.declaredCount && week.count !== week.declaredCount) {
      console.warn(
        `[weekly] ${path}: parsed ${week.count} events but header declares ${week.declaredCount}`,
      );
    }
    weeks.push(week);
  }

  cache = weeks.sort((a, b) => b.monday.localeCompare(a.monday));
  return cache;
}

/** Monday (in US Eastern, where all these events happen) of the week containing `now`. */
export function currentMonday(now = new Date()): string {
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const dow = et.getDay(); // 0=Sun
  const back = dow === 0 ? 6 : dow - 1;
  const monday = new Date(et.getFullYear(), et.getMonth(), et.getDate() - back);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${monday.getFullYear()}-${p(monday.getMonth() + 1)}-${p(monday.getDate())}`;
}

/**
 * Weeks eligible for a dated archive page: strictly before the current week.
 *
 * The in-progress week lives only at /this-week/. Keeping it out of /weekly/
 * is what stops the archive from overlapping /calendar (which covers the
 * future), so the two never describe the same event and no canonical juggling
 * is needed.
 */
export function getArchivedWeeks(now = new Date()): ArchiveWeek[] {
  const cutoff = currentMonday(now);
  return getWeeks().filter((w) => w.monday < cutoff && w.count > 0);
}

/** The current week's digest, if one has been generated yet. */
export function getCurrentWeek(now = new Date()): ArchiveWeek | undefined {
  const monday = currentMonday(now);
  return getWeeks().find((w) => w.monday === monday);
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** "July 27, 2026" from an ISO date, without touching the local timezone. */
export function formatIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** "July 27–August 2, 2026" for a week range. */
export function formatRange(monday: string, sunday: string): string {
  const [my, mm, md] = monday.split("-").map(Number);
  const [sy, sm, sd] = sunday.split("-").map(Number);
  if (my === sy && mm === sm) return `${MONTHS[mm - 1]} ${md}–${sd}, ${my}`;
  if (my === sy) return `${MONTHS[mm - 1]} ${md}–${MONTHS[sm - 1]} ${sd}, ${my}`;
  return `${MONTHS[mm - 1]} ${md}, ${my}–${MONTHS[sm - 1]} ${sd}, ${sy}`;
}

/**
 * CollectionPage + ItemList for one week's events. Titles are the entity names
 * worth enumerating; each links to its meetup.com page, which is the canonical
 * destination for that event.
 */
export function itemListForWeek(week: ArchiveWeek, site: string, url?: string) {
  const pageUrl = new URL(url ?? `/weekly/${week.monday}/`, site).href;
  return collectionPageNode(site, {
    url: pageUrl,
    name: `Hampton Roads tech meetups, ${formatRange(week.monday, week.sunday)}`,
    description: weekDescription(week),
    items: week.days.flatMap((d) =>
      d.events.map((e) => ({ name: e.title, url: e.link })),
    ),
  });
}

/** Generated meta description: unique per week, entity-dense, no duplicates. */
export function weekDescription(week: ArchiveWeek): string {
  const range = formatRange(week.monday, week.sunday);
  const groups = week.groups.slice(0, 3).join(", ");
  const more = week.groups.length > 3 ? ", and more" : "";
  const n = week.count;
  return `${n} tech ${n === 1 ? "event" : "events"} in Hampton Roads, ${range}${
    groups ? ` — hosted by ${groups}${more}` : ""
  }.`.slice(0, 300);
}
