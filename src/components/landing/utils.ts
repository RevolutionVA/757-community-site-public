/* 757tech.org landing — shared formatting + category helpers.
   Used by .astro frontmatter (Node) and by the client island scripts
   (Astro bundles component <script> imports, so these run in the browser too).
   All event times render in America/New_York: these are 757 / Hampton Roads
   events and the source dates are stored as ISO-UTC. */

export const ET = "America/New_York";

export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MON = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// The site's real meetup categories (source of truth: meetups.schema.json),
// ordered by how many groups fall in each. "Community" is the neutral fallback
// for events whose group/category can't be resolved.
export const CATEGORIES = ["Development", "Technology", "Cloud", "Design"];

export const CATEGORY_META: Record<string, { hue: number }> = {
  Development: { hue: 168 },
  Technology: { hue: 192 },
  Cloud: { hue: 200 },
  Design: { hue: 280 },
  Community: { hue: 150 },
};

export interface CatColor { bg: string; fg: string; dot: string; }

export function catColor(cat: string): CatColor {
  const h = (CATEGORY_META[cat] || { hue: 195 }).hue;
  return {
    bg: `oklch(0.94 0.06 ${h})`,
    fg: `oklch(0.42 0.12 ${h})`,
    dot: `oklch(0.62 0.15 ${h})`,
  };
}

/* ---------- timezone-aware date display ---------- */

// "YYYY-MM-DD" calendar date in Eastern Time (used as the bucket key for the
// week calendar and for relative-day math, free of UTC/viewer drift).
export function etDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ET, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

export interface EventDisplay {
  dateKey: string; // ET calendar date, YYYY-MM-DD
  dow: string;     // "Tue"
  day: string;     // "9"
  mon: string;     // "Jun"
  year: string;    // "2026"
  timeLabel: string; // "6 PM" / "6:30 PM"
}

export function eventDisplay(d: Date): EventDisplay {
  const f = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: ET, ...opts }).format(d);
  const timeLabel = f({ hour: "numeric", minute: "2-digit", hour12: true })
    .replace(":00", "");
  return {
    dateKey: etDateKey(d),
    dow: f({ weekday: "short" }),
    day: f({ day: "numeric" }),
    mon: f({ month: "short" }),
    year: f({ year: "numeric" }),
    timeLabel,
  };
}

// Whole-day difference between two YYYY-MM-DD keys (a - b).
export function dayDiffKeys(a: string, b: string): number {
  return Math.round(
    (Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000,
  );
}

export function relativeLabel(dateKey: string, todayKey: string): string {
  const diff = dayDiffKeys(dateKey, todayKey);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff < 7) {
    return DOW[new Date(dateKey + "T00:00:00Z").getUTCDay()];
  }
  const d = new Date(dateKey + "T00:00:00Z");
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/* ---------- week calendar math (client) ----------
   Operates on pure date keys via UTC anchors so there is no timezone drift:
   the anchor's getUTC* methods describe the ET calendar date we built it from. */

export interface WeekDay {
  key: string; dow: string; day: number; mon: number; year: number; isToday: boolean;
}

export function weekDays(todayKey: string, offset: number): WeekDay[] {
  const [y, m, d] = todayKey.split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d));
  const start = new Date(
    Date.UTC(y, m - 1, d - anchor.getUTCDay() + offset * 7),
  );
  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(Date.UTC(
      start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i,
    ));
    const key = etKeyFromUTC(cur);
    days.push({
      key,
      dow: DOW[cur.getUTCDay()],
      day: cur.getUTCDate(),
      mon: cur.getUTCMonth(),
      year: cur.getUTCFullYear(),
      isToday: key === todayKey,
    });
  }
  return days;
}

function etKeyFromUTC(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

export function weekRangeLabel(days: WeekDay[]): string {
  const a = days[0], b = days[6];
  return a.mon === b.mon
    ? `${MON[a.mon]} ${a.day} – ${b.day}`
    : `${MON[a.mon]} ${a.day} – ${MON[b.mon]} ${b.day}`;
}
