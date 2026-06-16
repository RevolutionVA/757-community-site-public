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

// Preferred display order for category chips (source of truth for the names:
// meetups.schema.json). "Community" is the neutral fallback for events whose
// group/category can't be resolved. Anything not listed sorts to the end.
export const CATEGORY_ORDER = ["Development", "Technology", "Cloud", "Design", "Community"];

// Orders an arbitrary set of category names by CATEGORY_ORDER, unknowns appended
// alphabetically. Chips are built from the categories that actually appear in
// the data (not a hardcoded list), so chip counts always sum to the "All" count
// even if a new meetup category is introduced.
export function orderCategories(cats: string[]): string[] {
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? Infinity : i;
  };
  return [...new Set(cats)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

// Per-category hue; the lightness/chroma are fixed across categories (see catColor).
export const CATEGORY_META: Record<string, { hue: number }> = {
  Development: { hue: 168 },
  Technology: { hue: 192 },
  Cloud: { hue: 200 },
  Design: { hue: 280 },
  Community: { hue: 150 },
};

const DEFAULT_HUE = 195;

export interface CatColor {
  bg: string; fg: string; dot: string;          // live oklch()
  bgHex: string; fgHex: string; dotHex: string; // sRGB fallback, derived from the same oklch
}

// oklch(L C h) → "#rrggbb" (D65). The inline-style fallbacks below are computed
// from the same L/C/h as the live oklch() colors, so the two can never drift.
function oklchToHex(L: number, C: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return "#" + channels.map((x) => {
    const srgb = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, srgb)) * 255).toString(16).padStart(2, "0");
  }).join("");
}

export function catColor(cat: string): CatColor {
  const h = CATEGORY_META[cat]?.hue ?? DEFAULT_HUE;
  return {
    bg: `oklch(0.94 0.06 ${h})`, bgHex: oklchToHex(0.94, 0.06, h),
    fg: `oklch(0.42 0.12 ${h})`, fgHex: oklchToHex(0.42, 0.12, h),
    dot: `oklch(0.62 0.15 ${h})`, dotHex: oklchToHex(0.62, 0.15, h),
  };
}

// Inline `style` values that progressively enhance: a browser that doesn't
// understand the oklch() declaration keeps the preceding hex one; modern
// browsers override with oklch(). Works inside the style="" attribute too.
export function catStyle(c: CatColor): string {
  return `background:${c.bgHex};background:${c.bg};color:${c.fgHex};color:${c.fg}`;
}
export function catDot(c: CatColor): string {
  return `background:${c.dotHex};background:${c.dot}`;
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

// Urgency cue only. The date badge already carries the weekday + full date,
// so this deliberately returns just "Today"/"Tomorrow" (or "") to avoid
// showing the day of week twice.
export function relativeLabel(dateKey: string, todayKey: string): string {
  const diff = dayDiffKeys(dateKey, todayKey);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return "";
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
    const key = utcDateKey(cur);
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

// Reads the UTC fields verbatim — NOT an ET conversion. Callers anchor their
// arithmetic off `todayKey` (already computed in ET via etDateKey) and build
// dates with Date.UTC, so reading UTC fields back yields the correct ET-day key.
function utcDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

export function weekRangeLabel(days: WeekDay[]): string {
  const a = days[0], b = days[6];
  return a.mon === b.mon
    ? `${MON[a.mon]} ${a.day} – ${b.day}`
    : `${MON[a.mon]} ${a.day} – ${MON[b.mon]} ${b.day}`;
}

/* ---------- month calendar math (client) ---------- */

export const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface MonthCell { key: string; day: number; inMonth: boolean; isToday: boolean; }
export interface MonthView { label: string; year: number; days: MonthCell[]; }

// Full 7-wide grid (5 or 6 rows) for the month containing today + offset months.
export function monthGrid(todayKey: string, offset: number): MonthView {
  const [y, m] = todayKey.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + offset, 1));
  const year = first.getUTCFullYear();
  const monthIndex = first.getUTCMonth();
  const leading = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const start = new Date(Date.UTC(year, monthIndex, 1 - leading));
  const days: MonthCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const cur = new Date(Date.UTC(
      start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i,
    ));
    const key = utcDateKey(cur);
    days.push({
      key,
      day: cur.getUTCDate(),
      inMonth: cur.getUTCMonth() === monthIndex,
      isToday: key === todayKey,
    });
  }
  return { label: `${MONTHS_FULL[monthIndex]} ${year}`, year, days };
}
