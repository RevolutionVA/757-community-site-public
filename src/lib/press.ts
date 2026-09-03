// Press coverage view models, shared by the homepage band and /press/.
// Both render the same card, so the date formatting and sort order live here
// rather than being reimplemented (and quietly diverging) in two templates.
import pressData from "../data/press.json";

export interface PressEntry {
  outlet: string;
  outletShort?: string;
  title: string;
  url: string;
  date: string;
  author?: string;
  summary?: string;
  quote?: string;
  quoteBy?: string;
  quoteRole?: string;
}

export interface PressVM extends PressEntry {
  /** "September 2, 2026" — for display. */
  dateLabel: string;
  /** Chip text: the short form when there is one. */
  chip: string;
  /** "Chazona Baum, Late Night Builders" — empty when there's no quote. */
  attribution: string;
}

// Dates are plain YYYY-MM-DD. `new Date("2026-09-02")` parses as UTC midnight,
// which formats as September 1 west of Greenwich — so build the date from parts.
function label(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function pressEntries(limit?: number): PressVM[] {
  return (pressData as PressEntry[])
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit ?? undefined)
    .map((p) => ({
      ...p,
      dateLabel: label(p.date),
      chip: p.outletShort ?? p.outlet,
      attribution: p.quote
        ? [p.quoteBy, p.quoteRole].filter(Boolean).join(", ")
        : "",
    }));
}

export const pressCount = (pressData as PressEntry[]).length;
