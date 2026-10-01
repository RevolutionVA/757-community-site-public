---
name: monthly-newsletter
description: Use when asked for the 757tech Monthly newsletter / monthly email / monthly Bento draft — drafting or finishing an issue's content.json, filling TODOs, previewing it, or creating the Bento broadcast draft. For the weekly meetup email use weekly-meetups instead.
---

# 757tech Monthly Newsletter

## Overview

The monthly is **editorial**, unlike the weekly, which is built from calendar data. Each issue is a hand-written JSON file that `scripts/create-monthly-broadcast.js` renders into the branded "757tech Monthly" email and posts to Bento as a **draft**. The work is: **build or finish `content.json` → check every link and image → tropes pass → user approval → deploy images → preview → create the draft.**

It goes out under Kevin Griffin's name and headshot (President, RevolutionVA). The greeting is written in his first-person voice.

## Files

| Path | What |
|------|------|
| `social/newsletter/<YYYY-MM>/content.json` | The issue. Folder name = issue month. The script defaults to the newest folder. |
| `public/images/newsletter/<YYYY-MM>/` | Images for "What's Happening" items |
| `public/images/recap/<event-date>-<slug>.jpg` | Recap photos (shared with the weekly's recap) |
| `src/data/community.ts` | Slack/Discord/social URLs for the Stay in Touch section. Don't hardcode them in content.json |
| `scripts/create-monthly-broadcast.js` | Renderer + Bento API call |

Past issues (`2026-08`, `2026-10`) are the style reference. Read the most recent one before drafting.

## content.json shape

Required: `broadcastName`, `subject`, `happening`. Everything else is optional; omitted sections don't render.

- `issue`, `broadcastName` (`757tech Monthly - <Month YYYY>`), `subject` (`757tech Monthly: <the 2–3 headline items>`), `preheader` (inbox preview, one sentence with dates)
- `disclaimer`: fixed boilerplate, copy from the previous issue. It contains `[unsubscribe]({{ visitor.unsubscribe_url }})`.
- `greeting`: array of plain-text paragraphs. **Escaped, so no HTML and no `[text](url)` links render here.**
- `happening`: `{ heading: "What's Happening This Month", items: [...] }`. Each item has `title`, `lead`, optional `image` / `imageAlt` / `imageLink`, `when` (e.g. `October 22nd, 2026, 6 pm at The Hive, Virginia Beach`), optional `price`, `url`, `ctaLabel`, optional `body[]`, optional `videoLink {url,label}`.
- `missed`: `{ heading: "What You Missed Last Month", items: [...] }`. Each item has `title`, `body[]`, optional `photo` / `photoAlt`, `bodyAfterPhoto[]`, optional `video {url,image,imageAlt,label}`. A single recap may put its fields directly on `missed` (the 2026-08 issue does).
- `regulars`: `{ heading: "Just Show Up", lead, items: [{title,url,when,note}] }`. These are the recurring events.
- `stayInTouch`: fixed; copy from the previous issue.
- `signoff`: `See ya next month!`

`lead` / `body` / `bodyAfterPhoto` / `regulars.lead` are trusted HTML: `<em>`/`<strong>` work, and `[text](url)` becomes a branded link. `title`, `when`, `price`, `ctaLabel` and the greeting are escaped.

## Workflow

### 1. Start the issue

The monthly sends around the first Friday of the month. If the folder doesn't exist, copy the previous issue's `content.json` into `social/newsletter/<YYYY-MM>/` and replace everything except the fixed sections (`disclaimer`, `stayInTouch`, `signoff`). If it exists (someone started it), finish it. `grep -n TODO` shows the gaps.

### 2. Gather "What's Happening"

Sources, in order:

1. `src/data/calendar-events.json` entries with `featuredEvent: true` dated in the issue month. These carry `location` and `endDate`, and the description usually has speaker, topic and venue.
2. `src/data/conferences.json` for conferences that month.
3. Ask the user about anything off-calendar (hack days, partner events, launches).

Rules:
- **Every item's `url`, date, time and venue come from the live event page.** Fetch each one (WebFetch or a `web-fetch` agent, in parallel) the same way the weekly verifies links. The calendar lags.
- For Pop-up Meetups, `url` is the Meetup event page (`ctaLabel: "RSVP on Meetup"`), not `757tech.org/popup/`.
- Times read `6 pm`, `10 am–4 pm`; dates read `October 22nd, 2026`.
- Summarize the speaker's abstract in 1–2 sentences of our own. Don't paste the Meetup blurb.

### 3. Gather "What You Missed"

Look back at last month. Candidates are the weekly recaps from last month (`git log -p -- src/data/newsletter-recap.json`), the photos in `public/images/recap/`, and press coverage. Ask the user which items make the cut and for organizer color. The weekly-meetups skill's sourcing rules apply: get color from an organizer or LinkedIn, and have the user confirm any trimmed quote with its author.

### 4. Check "Just Show Up"

The regulars list goes stale quietly. Check each cadence (`every other Tuesday, 6 pm`) against the group's recent events in `calendar-events.json`, and drop any series that has stopped.

### 5. Images

- Happening images go in `public/images/newsletter/<YYYY-MM>/<slug>.jpg`; recap photos go in `public/images/recap/<event-date>-<slug>.jpg`.
- Resize to 804px wide, JPEG q62, 4:2:0, mozjpeg, `withoutEnlargement`, targeting 45–50 KB. Use the `sharp` one-liner from the weekly-meetups skill. `sharp` isn't a direct dependency; if the import fails, run it via `npx -y -p sharp node -e ...`.
- Existing social cards (e.g. `public/images/popup/*.jpg`) are often 700 KB+ at full size. Make a resized copy under `newsletter/<YYYY-MM>/` rather than pointing the email at the original.
- **Images must be deployed before the draft is useful.** Check each image URL returns 200 on `757tech.org` (curl) before creating the draft.

### 6. Tropes pass

Invoke the `/tropes` skill on every freeform sentence you wrote or changed: greeting, leads, bodies, recap text, subject, preheader. Cite the tropes you found and fix them. Em-dash asides in prose count; rewrite them. The fixed boilerplate (`disclaimer`, `stayInTouch`, `signoff`) and the renderer's own `&mdash;`/`&rarr;` are format spec, not prose, so leave them alone. Organizer quotes stay verbatim.

### 7. Approval, then draft

1. Show the user the finished content (subject, preheader, and the prose of each section) and get approval. Nothing goes to Bento before that.
2. Commit the issue and images to `main` and push (convention: `✨ feat: add <Month> monthly newsletter` or `📝 docs: ...` for edits), then wait for the deploy and recheck image URLs.
3. Preview (no credentials needed):
   ```bash
   node scripts/create-monthly-broadcast.js <YYYY-MM> --dry-run --html-out <scratchpad>/monthly-<YYYY-MM>.html
   ```
4. Create the draft:
   ```bash
   op run --env-file .env -- node scripts/create-monthly-broadcast.js <YYYY-MM>
   ```
   On this machine `.env` resolves to the Private vault of `my.1password.com`. The `--account revolutionva.1password.com` form in the script's header is for other maintainers. `BENTO_MONTHLY_SEGMENT_ID` is `49933` ("757tech Monthly Subscribed"), not the weekly's 33230.
5. Give the user the `dashboard_url` from the response. **Each run adds another identically named draft.** Tell the user which ID to send and which older ones to delete. Never send; the user sends from Bento.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Shipping `TODO` placeholders | `grep -n TODO social/newsletter/<issue>/content.json` must be empty before the draft |
| Markdown link or `<em>` in `greeting`, `title` or `when` | Those fields are escaped; links only render in lead/body/bodyAfterPhoto/regulars.lead |
| Pointing the Pop-up CTA at `757tech.org/popup/` | Use the Meetup event URL so people can RSVP |
| Using the weekly segment (33230) | Monthly is 49933 |
| Hotlinking a 700 KB social card | Resize a copy into `public/images/newsletter/<issue>/` |
| Creating the draft before images deploy | Images 404 in the email; commit, push, verify 200s first |
| Stale "Just Show Up" cadences | Recheck against the calendar every issue |
| Skipping the tropes pass on "small" edits | Every sentence you touched gets the pass |
