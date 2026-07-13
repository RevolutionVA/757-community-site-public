---
name: weekly-meetups
description: Use when asked for this week's meetup lineup, weekly announcements, or Slack/Discord/LinkedIn/email newsletter posts for 757tech meetups — including "what's our lineup", "verify the links", or "generate the weekly posts".
---

# Weekly Meetups Announcements

## Overview

Produce validated, ready-to-post weekly meetup announcements for Slack, Discord, LinkedIn, and the email newsletter. Three phases: **pull latest calendar → verify every event link → generate the four outputs**. Never publish an event that hasn't been verified against its live Meetup page.

## Workflow

### 1. Pull the latest calendar

```bash
git pull
npm run update-calendar          # fetch fresh events from Meetup RSS feeds
npm run validate                 # schema-check the JSON before using it
node scripts/generate-weekly-meetups.js
```

- `update-calendar` rewrites `src/data/calendar-events.json`. Changes here are expected (GitHub Actions runs the same script every 6 hours). If committing, follow repo convention — calendar data: `Update calendar events with new data`; weekly files: `Generate weekly meetups for <monday-date>` — commit to `main` and push. Never commit the announcement text itself (it's chat output, step 3).
- The generator computes the current week (Monday–Sunday, Eastern Time) and writes two files, overwriting any existing ones for the same Monday (fine and expected):
  - `weekly-meetups/<monday-date>-weekly-meetups-slack.txt` ← **source of truth for the next steps**
  - `weekly-meetups/<monday-date>-weekly-meetups.md`
- Run on any day of the week; it resolves back to the current week's Monday.

**Source file format** (what you'll be parsing): day headings are full day names (`*Tuesday, July 14*`); each event is three lines — `• *Title* - 04:30 PM` (leading-zero time, hyphen separator), group name, then `<url> (Event Link)`. Normalize when generating outputs: strip the literal ` (Event Link)` suffix, drop leading zeros (`4:30 PM`), replace the hyphen with an em-dash, and abbreviate day names to three letters (`Tue, July 14`) everywhere except the email format. The year isn't in the headings — take it from the filename.

### 2. Verify every event link

For each event in the slack.txt file, fetch its Meetup URL (WebFetch, all in parallel) and confirm:

1. Page loads (not 404 / deleted).
2. Event is **not cancelled** (Meetup shows a "Canceled" banner at the top of the page).
3. Title, date, and start time match the source file — **semantically**, not character-for-character. Emoji differences, paraphrased summaries, and formatting deltas are matches.

Suggested WebFetch prompt: *"Is this Meetup event page valid and active (not cancelled, not 404)? What is the event title, date, and start time? Answer concisely."*

Outcome handling:

- **Cancelled or 404** → drop the event.
- **Live but details differ** (e.g. time moved 6:00 → 6:30 PM, title reworded) → keep the event, **use the live page's values** in the outputs, and tell the user what was corrected. The live page is authoritative; the RSS-fed calendar lags.
- **Different event entirely at that URL, or wrong date** → drop, flag as a calendar data problem.
- **Fetch fails or is inconclusive** (timeout, bot block, "couldn't determine date") → retry once; if still unverifiable, exclude it from the outputs and list it for the user under "needs manual check" so they can verify and re-add before posting.

The event count ("N events") in every output is the count of events that **passed** verification — not the count in the source file. Always report dropped or corrected events to the user with the reason (cancelled / 404 / wrong event or date / unverifiable / details corrected) so the calendar can be cleaned up. If an event's date falls outside the Monday–Sunday week, exclude it and flag it as a generator issue. If zero events pass, don't produce posts — tell the user the week is empty.

### 3. Generate the four outputs

**Deliver all four as copy-paste blocks in your reply.** Do not post, send, or commit them anywhere — the user publishes manually.

Shared rules for all formats:

- Strip decorative emoji from event titles (e.g. 🧜‍♀️).
- Em-dash (`—`) between title and time, and between header label and event count.
- Times as `H:MM AM/PM` (no leading zero).
- Group events under day headings in chronological order. Days with multiple events: list them on consecutive lines with **no blank line between events on the same day** (email is the exception — see its template); blank lines separate days.
- Header count = number of validated events.
- Intro lines, hashtags, greetings, and sign-offs shown in the templates are fixed boilerplate — copy verbatim.

#### Slack

Single-asterisk bold (`*...*`):

```
:calendar: *757tech Meetups This Week (Mon–Sun) — N events*

  *Tue, July 14*
  • *Event Title* — 5:45 PM (Group Name)
  https://www.meetup.com/.../events/<id>/

  *Wed, July 15*
  • *Another Event* — 1:00 PM (Group Name)
  https://www.meetup.com/.../events/<id>/
  • *Second Wednesday Event* — 6:00 PM (Group Name)
  https://www.meetup.com/.../events/<id>/

  Full details → https://757tech.org
```

#### Discord

Identical to Slack (including the `:calendar:` shortcode, which Discord also renders) but with double-asterisk bold (`**...**`) on the header, day headings, and event titles.

#### LinkedIn

LinkedIn does **not** render markdown — no asterisks anywhere. Use the links-in-first-comment variant (preferred; LinkedIn down-ranks posts with outbound links).

Post body — no event URLs:

```
📅 757tech Meetups This Week (Mon–Sun) — N events

Hampton Roads has a packed week of tech meetups. Here's what's happening:

🗓 Tue, July 14
Event Title — 5:45 PM (Group Name)

🗓 Wed, July 15
Another Event — 1:00 PM (Group Name)
Second Wednesday Event — 6:00 PM (Group Name)

🔗 Event links in the comments below 👇

#757tech #HamptonRoads #TechCommunity #Meetups #Developers
```

First comment (post immediately after publishing so it pins to top):

```
Tue — Event Title:
https://www.meetup.com/.../events/<id>/

Wed — Another Event:
https://www.meetup.com/.../events/<id>/

Wed — Second Wednesday Event:
https://www.meetup.com/.../events/<id>/

Full calendar → https://757tech.org
```

Repeat the day prefix for each event on a multi-event day, one blank line between entries.

#### Email newsletter

Plain text, links inline (email has no link penalty). Day headings in ALL CAPS; one blank line between events:

```
Subject: 757tech Meetups This Week — N events (July 14–18)

Hi 757tech!

Here's what's happening around Hampton Roads this week:

TUESDAY, JULY 14

Event Title — 5:45 PM
Group Name
https://www.meetup.com/.../events/<id>/

WEDNESDAY, JULY 15

Another Event — 6:00 PM
Group Name
https://www.meetup.com/.../events/<id>/

Full calendar → https://757tech.org

— The 757tech Team
```

Subject date range spans the first **validated** event's day to the last's (drops shrink the range). Month names, no year; cross-month weeks read `June 29 – July 4`. Email uses full day names in ALL CAPS and keeps one blank line between events even on the same day.

**Optional — create a Bento broadcast draft:** only when the user asks. The script reads the current week's slack.txt directly and renders the full branded 757Tech Weekly newsletter (intro boilerplate, Featured Events, event cards, footer with unsubscribe tag). Featured Events are the upcoming `calendar-events.json` entries with `featuredEvent: true` — to feature something, set that flag (plus optional `location` and `endDate`) on the calendar entry. Pass `--exclude <meetup-event-id>` for each event that failed link verification:

```bash
op run --account revolutionva.1password.com --env-file .env -- \
  node scripts/create-bento-broadcast.js --exclude <cancelled-event-id>
```

Credentials come from the "Bento - RevolutionVA" item in the **Employee** vault of the `revolutionva.1password.com` account via `op` secret references (see `.env.example`; `.env` is gitignored). The script creates a **draft** — the user reviews and sends from the Bento dashboard. Use `--dry-run` (no credentials needed) plus `--html-out <file>` to preview. Before running, check `src/data/newsletter-featured.json` is current and ask the user if the featured events look stale. Never pass raw API keys on the command line or write them to files.

## Quick Reference

| Step | Command / action |
|------|------------------|
| Refresh calendar | `git pull && npm run update-calendar && npm run validate` |
| Generate weekly file | `node scripts/generate-weekly-meetups.js` |
| Source file | `weekly-meetups/<monday>-weekly-meetups-slack.txt` |
| Verify links | WebFetch each event URL in parallel; drop cancelled/404/wrong-event, correct minor deltas from the live page |
| Outputs | Slack (`*bold*`), Discord (`**bold**`), LinkedIn (no markdown, links in first comment), Email (plain text, inline links) |
| Bento draft (on request) | `op run --account revolutionva.1password.com --env-file .env -- node scripts/create-bento-broadcast.js --exclude <dropped-event-id>` — full branded newsletter, draft only; keys in 1Password (revolutionva account, Employee vault) |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using the source file's event count in headers | Count only events that passed verification |
| Skipping verification because the file was "just generated" | RSS lags cancellations; always fetch each event page |
| Dropping a live event over a minor time/title delta | Keep it, use the live page's values, tell the user what changed |
| Bold asterisks in the LinkedIn post | LinkedIn renders them literally — emoji + line breaks only |
| Event URLs in the LinkedIn post body | Links go in the first comment; body gets the 🔗 pointer line |
| Leaving decorative emoji in titles, or the ` (Event Link)` suffix on URLs | Strip both in every format |
| Silently dropping a failed event | Tell the user which event was dropped and why |
| Posting/committing the announcement text | Outputs are chat-only copy-paste blocks; the user publishes |
