# Data Pipeline

`src/data/` is the content layer. `src/data/README.md` documents the field-by-field formats for contributors.

## Files

- `meetups-combined.json` — ~20 Meetup groups. Fields: `name`, `url`, `tags[]`, `category` (**exactly one of** `Development | Technology | Design | Cloud`), `rssFeed`, `metadata{imageUrl,title,description}`. Adding a group here is what enrolls it in automatic event fetching. Schema-validated.
- `conferences.json` — schema-validated. Past/upcoming split is computed from `date`, never stored.
- `calendar-events.json` — ~50 aggregated events, **machine-written**, no schema. Keys seen in practice: `title`, `link`, `date` (ISO UTC), `description` (markdown), `source` (`meetup|eventbrite|website|other`), `group`, `location`, `endDate`, `featuredEvent`, `createdDate`, `updatedDate`, `previousVersion`. `updatedDate`/`createdDate` feed the sitemap `lastmod` in `astro.config.mjs` — keep them present and ISO.
- `newsletter-recap.json` — hand-maintained recap of *last* week for the newsletter; **never auto-updates**, so verify it before drafting (see `mem:newsletter_and_social`).
- `community.ts` — typed community constants.

## Scripts

`update-calendar.js` (RSS fetch, rate-limited, `USE_MOCK_DATA_IF_EMPTY = false`), `rebuild-calendar.js`, `deduplicate-calendar.js`, `fix-calendar-duplicates.js`, `check-stale-events.js`, `fetch-meetup-images.js`, `generate-llms-txt.js`, `generate-weekly-meetups.js`, `add-meetup.js`, `validate-json.js`.

## Automation (`.github/workflows/`)

- `update-calendar.yml` — cron `0 */6 * * *`, runs `update-calendar.js` and commits changes. Expect constant calendar-JSON churn on `main`; rebase rather than fighting it.
- `weekly-meetups.yml` — cron `0 6 * * 1` (Mon), generates the `weekly-meetups/` files.
- `azure-static-web-apps-*.yml` — deploy on push to `main`, PR previews, plus cron `10 5 * * *` (just after ET midnight) to re-bake build-time dates.
- `validate-json.yml` — `ajv-cli` on `src/data/**/*.json`.
- `validate-event-submission.yml` / `process-event-submission.yml` — community event submissions arrive as **GitHub issues** labeled `event-submission`; the body is regex-parsed, and applying the `approved` label writes the event into the calendar.
- `claude.yml` (`@claude` mentions) and `claude-code-review.yml` (PR review, skips bot PRs).

## Known data hazards

- Cross-listed events: the same event appears under two Meetup groups (recurring: AI Collective Hampton Roads cross-lists a 757 Developers event). Dedupe by title-modulo-prefix + date + start time, keeping the 757dev listing.
- RSS lags the live Meetup page; on conflict the **live page is authoritative**.
