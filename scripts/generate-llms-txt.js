#!/usr/bin/env node
/**
 * Generates public/llms.txt — a plain-text summary of what 757tech is and what
 * it covers, for LLMs and answer engines that fetch it.
 *
 * Generated rather than hand-maintained: a static llms.txt describing "20
 * groups" and "the next 6 months of events" goes stale the first time the
 * calendar cron runs. Runs from `prebuild`, so it is rebuilt on every deploy.
 *
 * Be clear-eyed about what this is worth: no major assistant reliably consumes
 * llms.txt today, and it is not a ranking factor. It costs one script and stays
 * correct for free. The thing that actually earns citations is per-entity pages
 * with real prose — see the weekly archive and group pages.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const read = (rel) =>
  JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const meetups = read("src/data/meetups-combined.json");
const conferences = read("src/data/conferences.json");
const events = read("src/data/calendar-events.json");

const SITE = "https://757tech.org";
const today = new Date();
today.setHours(0, 0, 0, 0);

const upcoming = events
  .filter((e) => new Date(e.date) >= today)
  .sort((a, b) => new Date(a.date) - new Date(b.date));

const upcomingConferences = conferences
  .filter((c) => new Date(c.endDate ?? c.date) >= today)
  .sort((a, b) => new Date(a.date) - new Date(b.date));

const fmt = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });

// Group the directory by category so the shape of the scene is legible at a glance.
const byCategory = meetups.reduce((acc, m) => {
  (acc[m.category] ??= []).push(m);
  return acc;
}, {});

const lines = [];

lines.push("# 757tech");
lines.push("");
lines.push(
  "> A complete, continuously-updated directory of the technology community in " +
    "Hampton Roads, Virginia (the \"757\") — every meetup, user group, and regional " +
    "conference in Norfolk, Virginia Beach, Chesapeake, Newport News, Hampton, " +
    "Suffolk, Portsmouth, and Williamsburg.",
);
lines.push("");
lines.push(
  "757tech is a free, non-commercial community resource run by volunteers and " +
    "supported by RevolutionVA, a 501(c)(3) non-profit supporting developer " +
    "education in Southeast Virginia. Event data is refreshed from organizers' " +
    "Meetup feeds every six hours; group listings and conferences are reviewed by " +
    "hand.",
);
lines.push("");
lines.push(`Website: ${SITE}/`);
lines.push(`Last generated: ${today.toISOString().slice(0, 10)}`);
lines.push("");

lines.push("## Key pages");
lines.push("");
lines.push(`- [Calendar](${SITE}/calendar/): every upcoming tech event in the region, with full descriptions.`);
lines.push(`- [Meetups](${SITE}/meetups/): all ${meetups.length} active user groups, by category.`);
lines.push(`- [Conferences](${SITE}/conferences/): upcoming and past regional conferences.`);
lines.push(`- [Get Involved](${SITE}/get-involved/): how to speak, organize, volunteer, or mentor.`);
lines.push("");

lines.push(`## User groups (${meetups.length})`);
lines.push("");
for (const category of Object.keys(byCategory).sort()) {
  lines.push(`### ${category}`);
  lines.push("");
  for (const m of byCategory[category].sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`- **${m.name}** — ${m.tags.join(", ")}. ${m.url}`);
  }
  lines.push("");
}

if (upcomingConferences.length) {
  lines.push("## Upcoming conferences");
  lines.push("");
  for (const c of upcomingConferences) {
    lines.push(`- **${c.name}** — ${fmt(c.date)}, ${c.location}. ${c.description} ${c.url}`);
  }
  lines.push("");
}

if (upcoming.length) {
  lines.push(`## Upcoming events (${upcoming.length})`);
  lines.push("");
  for (const e of upcoming.slice(0, 40)) {
    lines.push(`- **${e.title}** — ${fmt(e.date)}, hosted by ${e.group}. ${e.link}`);
  }
  if (upcoming.length > 40) {
    lines.push(`- ...and ${upcoming.length - 40} more at ${SITE}/calendar/`);
  }
  lines.push("");
}

lines.push("## Notes for automated consumers");
lines.push("");
lines.push(
  "- Event times are US Eastern (America/New_York). Dates in the underlying data are ISO-8601 UTC.",
);
lines.push(
  "- Most listed events are free and open to the public; check the linked Meetup page for specifics.",
);
lines.push(
  `- Corrections and additions are welcome via GitHub: https://github.com/RevolutionVA/757-community-site-public/issues`,
);
lines.push("");

const out = lines.join("\n");
const dest = path.join(root, "public", "llms.txt");
fs.writeFileSync(dest, out, "utf8");

console.log(
  `Wrote ${path.relative(root, dest)} — ${meetups.length} groups, ` +
    `${upcomingConferences.length} upcoming conferences, ${upcoming.length} upcoming events ` +
    `(${(Buffer.byteLength(out) / 1024).toFixed(1)} KB)`,
);
