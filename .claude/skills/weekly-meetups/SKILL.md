---
name: weekly-meetups
description: Use when asked for this week's meetup lineup, weekly announcements, or Slack/Discord/LinkedIn/X/Bluesky/Threads/Instagram/email newsletter posts for 757tech meetups — including "what's our lineup", "verify the links", or "generate the weekly posts".
---

# Weekly Meetups Announcements

## Overview

Produce validated, ready-to-post weekly meetup announcements for Slack, Discord, LinkedIn, X, Bluesky, Threads, Instagram, and the email newsletter. Three phases: **pull latest calendar → verify every event link → generate the eight outputs**. Never publish an event that hasn't been verified against its live Meetup page.

Account handles: X `@757techorg`, Bluesky `@757tech.org` (domain handle — the only one that isn't `757techorg`), Threads `@757techorg`, Instagram `@757techorg`.

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

### 3. Generate the eight outputs

**Deliver all eight as copy-paste blocks in your reply.** Do not post, send, or commit them anywhere — the user publishes manually.

Shared rules for all formats:

- **Dedup cross-listed events.** The same event is sometimes posted to two Meetup groups (recurring case: AI Collective Hampton Roads cross-lists the Peninsula Builders Study Group that 757 Developers also runs). Same title-modulo-prefix, same date, same start time = one event. Keep the **757dev listing** and drop the other. This is why the header count can be lower than the source file's — say so when it happens.
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

  Full details → https://757tech.org/this-week/
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

Full calendar → https://757tech.org/this-week/
```

Repeat the day prefix for each event on a multi-event day, one blank line between entries.

#### X (@757techorg)

**Hard limit: 280 characters** (any URL counts as 23 regardless of length). No markdown — X renders asterisks literally. One line per event, no blank lines between events, no hashtags, no per-event URLs — just the bare site domain on the last line:

```
📅 757tech Meetups This Week — N events

Mon: Event Title, 5:45 PM (Group Name)
Wed: Another Event, 1:00 PM (Group Name)
Wed: Second Wednesday Event, 6:00 PM (Group Name)

757tech.org/this-week/
```

- Day prefix is the three-letter abbreviation with a colon (`Mon:`); repeat it for each event on a multi-event day.
- **Count characters before delivering.** If over 280, compress in this order until it fits: (1) shorten event titles (drop subtitles after `:` or `|`, e.g. `(CS)²AI Online™: Security Lifecycles of Connected Power Infrastructure` → `(CS)²AI Security Lifecycles`), (2) drop the `(Group Name)` parentheticals, (3) drop the empty line before `757tech.org`. Never drop an event to fit — if it still can't fit with all three compressions, split into a two-post thread (lineup post + reply) and say so.
- A one-line CTA (e.g. `🎤 BSides CFP closes Fri 7/31!`) may be added before the domain line only if the tweet still fits in 280.

#### Bluesky (@757tech.org)

**Hard limit: 300 graphemes.** Unlike X, Bluesky counts a URL at its **actual length** — no 23-char credit — so the bare `757tech.org/this-week/` costs 22. Same compact one-line-per-event shape as X, same compression ladder, same no-hashtags/no-per-event-URLs rule.

```
📅 757tech Meetups This Week — N events

Mon: Event Title, 5:45 PM (Group Name)
Wed: Another Event, 1:00 PM (Group Name)

757tech.org/this-week/
```

- A full week rarely fits in one post. **Prefer a two-post thread over mangling the lineup**: header + the first day(s) in post 1, the rest + the domain line in the reply. Split on a day boundary so a single day never straddles posts.
- Only fall back to a single compressed post when it lands with real margin. A post that fits at exactly 300 is not worth the group names and brand word it cost — thread instead.

#### Threads (@757techorg)

**Limit: 500 characters.** Links are clickable and carry no reach penalty. A typical 7-event week fits in one post with group names intact, so use the uncompressed X shape — full titles where they fit, `(Group Name)` retained, blank line before the domain. No markdown; Threads renders asterisks literally.

```
📅 757tech Meetups This Week — N events

Mon: Event Title, 5:45 PM (Group Name)
Wed: Another Event, 1:00 PM (Group Name)

757tech.org/this-week/
```

If a heavy week exceeds 500, apply the X compression ladder before threading.

#### Instagram (@757techorg)

**Limit: 2,200 characters, max 30 hashtags.** Captions are long-form, so no compression is needed — but **links in captions are not clickable**, so every URL is dead weight. Point at the bio instead. Hashtags do real discovery work here, so the block is longer than LinkedIn's and mixes brand, geography, and topic tags drawn from the week's actual events.

**This post needs an image** — a caption-only Instagram post gets no distribution. Generate the carousel:

```bash
npm run generate-carousel -- --exclude <dropped-event-id>
```

Writes `social/exports/<monday>/slide-NN-*.png` — 1080×1350 (4:5 portrait), cover slide plus one slide per event, on the wave background. Upload in filename order.

- **Pass the same `--exclude` list you passed the Bento draft**, once per dropped or deduped event. The script parses the raw `weekly-meetups/<monday>-weekly-meetups.md`, which knows nothing about link verification or cross-listing — without the flag it renders a slide for a cancelled event and bakes the wrong count into the cover.
- **The cover count must match the caption.** It comes from the post-exclusion event count; if the cover says 8 and the caption says 7, an exclusion is missing.
- A stale `--exclude` that matches nothing warns but still generates — check the warning rather than ignoring it, since a typo'd ID silently ships the slide it was meant to drop.
- Reruns clear the week's previous slides first, so an exclusion that shortens the set won't leave an orphan slide behind.
- Spot-check the cover and one event slide before handing them over; long titles auto-shrink and can still overflow at the smallest size.

```
📅 757tech Meetups This Week — N events

Hampton Roads has a packed week of tech meetups 👇

🗓 MON, JULY 14
Event Title — 5:45 PM
Group Name

Second Monday Event — 7:00 PM
Group Name

🗓 WED, JULY 16
Another Event — 1:00 PM (online)
Group Name

🔗 Full lineup + RSVP links → link in bio

#757tech #HamptonRoads #757 #Norfolk #VirginiaBeach #NewportNews #TechCommunity #Meetups #Developers #TechEvents #HamptonRoadsTech #757Devs
```

- Day headings are `🗓 DDD, MONTH D` in ALL CAPS, three-letter day abbreviation.
- Group name goes on its own line under the event (like email, not like the parenthetical formats), and Instagram keeps a blank line between events on the same day.
- Mark online-only events `(online)` — IG's audience skews local and assumes in-person.
- Append topic hashtags for what's actually on the calendar that week (`#Cybersecurity`, `#Bitcoin`, `#SQLServer`, `#Java`, `#CodeAndCoffee`) after the fixed block above. Stay under 30 total.
- **Check the bio link before delivering.** The caption's CTA dead-ends if `@757techorg`'s bio link doesn't reach `757tech.org/this-week/` — flag it for the user to confirm.

#### Counting characters

X, Bluesky, and Threads all have hard caps, and every one of them will be blown by a normal week if you eyeball it. **Count with a script, never by estimate** — write the candidate posts to a scratch file and measure:

```bash
node -e '
const seg = new Intl.Segmenter("en", {granularity:"grapheme"});
const post = require("fs").readFileSync(process.argv[1], "utf8");
console.log([...seg.segment(post)].length);
' /path/to/scratch/post.txt
```

Emoji count as one grapheme, not their UTF-16 length — `[...str].length` and `str.length` both overcount 📅 and 🗓, so use `Intl.Segmenter`. For X only, substitute any URL with 23 characters before measuring; for Bluesky and Threads, count the URL as written. Report the final count next to each post so the user can see the margin.

#### Email

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

Full calendar → https://757tech.org/this-week/

— The 757tech Team
```

Subject date range spans the first **validated** event's day to the last's (drops shrink the range). Month names, no year; cross-month weeks read `June 29 – July 4`. Email uses full day names in ALL CAPS and keeps one blank line between events even on the same day.

**Optional — create a Bento broadcast draft:** only when the user asks. The script reads the current week's slack.txt directly and renders the full branded 757Tech Weekly newsletter (intro boilerplate, Featured Events, event cards, footer with unsubscribe tag). Featured Events are the upcoming `calendar-events.json` entries with `featuredEvent: true` — to feature something, set that flag (plus optional `location` and `endDate`) on the calendar entry. Pass `--exclude <meetup-event-id>` for each event that failed link verification:

```bash
op run --account revolutionva.1password.com --env-file .env -- \
  node scripts/create-bento-broadcast.js --exclude <cancelled-event-id>
```

Credentials come from the "Bento - RevolutionVA" item in the **Employee** vault of the `revolutionva.1password.com` account via `op` secret references (see `.env.example`; `.env` is gitignored). The script creates a **draft** — the user reviews and sends from the Bento dashboard. Use `--dry-run` (no credentials needed) plus `--html-out <file>` to preview. Before running, check `src/data/newsletter-featured.json` is current and ask the user if the featured events look stale. Never pass raw API keys on the command line or write them to files.

**The weekly recap (`src/data/newsletter-recap.json`) is stale by default.** It replaces the boilerplate intro with a "did you miss X last week?" write-up, and it does **not** regenerate — whatever is in the file ships until someone edits it. Always check its contents against *last* week before creating a draft; if it still describes an older event, tell the user and ask whether to refresh or drop it. Deleting the file (or emptying `body`) falls back to the boilerplate intro, which is the right move on a week with nothing to recap.

Shape: `body` (array of HTML paragraphs — `body[0]` is the lead and renders above the photos), optional `heading` (omit it so the recap reads as a casual intro rather than a formal section), optional `quote` (`text` / `attribution` / `role`), optional `photoCredit`, optional `photos` (`src` / `alt`), optional `url`.

Rules when writing one:

- **Get the color from an organizer**, not the Meetup blurb — the blurb describes the topic, an organizer tells you why it mattered. Ask the user for a summary if you don't have one.
- **Check LinkedIn before concluding there's no color.** Meetup pages almost never carry post-event content, but speakers and organizers routinely write the night up on LinkedIn — that's where the concrete details live (what got demoed, how long it took, who hosted and fed the room). LinkedIn is login-walled, so WebFetch fails; use the Claude-in-Chrome tools to read the post. Ask the user for links to the speakers' posts.
- **Quote the organizer directly** rather than absorbing their words into the newsletter's voice. Trim for length (30–45 words is the sweet spot) and cut anything that repeats the lead paragraph, but **have the user confirm the trimmed version with its author before sending** — their name goes on it.
- **Host images in the repo** under `public/images/recap/`, named for the **event** date (`2026-08-12-platform-devops.jpg`), not hotlinked and not named for the day you processed them. Resize to **804px wide** (1.5× the 536px display width), JPEG with 4:2:0 chroma, and **`mozjpeg: true`** — without mozjpeg the same q70 lands near 90 KB instead of 50. Target 45–50 KB each; the whole email should stay near 100 KB of images. Check the resulting size rather than trusting a quality number: q70 with mozjpeg ≈ 60 KB, q62 ≈ 50 KB. Pass `withoutEnlargement: true` so a source already under 804px isn't upscaled into mush.

  ```bash
  node -e 'import("sharp").then(({default:sharp})=>sharp(process.argv[1])
    .resize(804,null,{withoutEnlargement:true})
    .jpeg({quality:62,chromaSubsampling:"4:2:0",mozjpeg:true})
    .toFile(process.argv[2]).then(i=>console.log(i.width+"x"+i.height, Math.round(i.size/1024)+" KB")))' \
    <source> public/images/recap/<event-date>-<slug>.jpg
  ```
- **Images must be deployed before the draft is useful.** `757tech.org/images/...` 404s until `main` deploys, so commit and merge first, then create the draft. To preview locally before deploying, rewrite the image URLs to base64 data URIs in the `--html-out` file.
- **Creating a draft never replaces an earlier one.** Every run adds another identically-named draft; tell the user which ID to send and which to delete.

## Quick Reference

| Step | Command / action |
|------|------------------|
| Refresh calendar | `git pull && npm run update-calendar && npm run validate` |
| Generate weekly file | `node scripts/generate-weekly-meetups.js` |
| Source file | `weekly-meetups/<monday>-weekly-meetups-slack.txt` |
| Verify links | WebFetch each event URL in parallel; drop cancelled/404/wrong-event, correct minor deltas from the live page |
| Outputs | Slack (`*bold*`), Discord (`**bold**`), LinkedIn (no markdown, links in first comment), X (≤280), Bluesky (≤300 graphemes), Threads (≤500), Instagram (≤2200, link in bio, needs an image), Email (plain text, inline links) |
| Character caps | X 280 (URL = 23) · Bluesky 300 graphemes (URL = actual length) · Threads 500 · Instagram 2200. Count with `Intl.Segmenter`, never by eye |
| IG carousel | `npm run generate-carousel -- --exclude <dropped-event-id>` → `social/exports/<monday>/slide-NN-*.png` (1080×1350). Same exclusion list as the Bento draft; cover count must match the caption |
| Weekly recap | `src/data/newsletter-recap.json` — **never auto-updates**; check it describes *last* week before drafting. Delete or empty `body` to fall back to the boilerplate intro |
| Bento draft (on request) | `op run --account revolutionva.1password.com --env-file .env -- node scripts/create-bento-broadcast.js --exclude <dropped-event-id>` — full branded newsletter, draft only; keys in 1Password (revolutionva account, Employee vault) |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using the source file's event count in headers | Count only events that passed verification |
| Skipping verification because the file was "just generated" | RSS lags cancellations; always fetch each event page |
| Dropping a live event over a minor time/title delta | Keep it, use the live page's values, tell the user what changed |
| Bold asterisks in the LinkedIn post | LinkedIn renders them literally — emoji + line breaks only |
| Event URLs in the LinkedIn post body | Links go in the first comment; body gets the 🔗 pointer line |
| X post over 280 characters | Compress titles → drop groups → drop blank line; thread rather than dropping an event |
| Estimating character counts instead of measuring | Every cap gets blown by a normal week — count with `Intl.Segmenter` and report the number |
| Counting a Bluesky URL as 23 characters | That's X's rule; Bluesky counts the URL's real length |
| Squeezing a full week into one 300-char Bluesky post | If it only fits at exactly 300, thread it — the margin isn't worth the group names |
| Clickable-looking URLs in an Instagram caption | IG captions don't linkify; point at the bio and verify the bio link resolves |
| Delivering an Instagram caption with no image | Caption-only IG posts get no reach — run `npm run generate-carousel` |
| Running the carousel without the `--exclude` list | It parses the raw `.md`, so it renders cancelled/deduped events and bakes a wrong cover count |
| Carousel cover count disagreeing with the caption | An exclusion is missing — regenerate rather than shipping the mismatch |
| Listing a cross-listed event twice (AICHR + 757dev) | Same title/date/time = one event; keep the 757dev listing and note the dedup |
| Leaving decorative emoji in titles, or the ` (Event Link)` suffix on URLs | Strip both in every format |
| Silently dropping a failed event | Tell the user which event was dropped and why |
| Posting/committing the announcement text | Outputs are chat-only copy-paste blocks; the user publishes |
| Shipping last week's recap again | `newsletter-recap.json` never regenerates — verify it before every draft |
| Creating a Bento draft before the recap images deploy | The URLs 404 until `main` deploys; commit and merge first |
| Editing an organizer's quote without telling them | Trim freely, but have the user get the author's OK — their name is on it |
