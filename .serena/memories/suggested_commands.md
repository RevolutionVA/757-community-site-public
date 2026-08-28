# Suggested Commands

Run from repo root.

## Everyday

- `npm run dev` — Astro dev server (or use the Solo `Astro` process from `solo.yml`).
- `npm run build` — prebuild runs `scripts/fetch-meetup-images.js` then `scripts/generate-llms-txt.js` (writes `public/llms.txt`), then `astro build`. A build therefore **mutates tracked files**; check `git status` afterwards.
- `npm run preview` — serve `dist/`.
- `npm run validate` — AJV schema check of `src/data/conferences.json` and `meetups-combined.json`. See `mem:task_completion`.

## Data / content

- `npm run update-calendar` — refetch Meetup RSS into `src/data/calendar-events.json` (same script the 6-hourly Action runs).
- `npm run rebuild-calendar` — full rebuild + dedupe. `npm run deduplicate-calendar`, `npm run fix-calendar` for the narrower fixes.
- `npm run add-meetup` — interactive add to `meetups-combined.json`.
- `node scripts/check-stale-events.js` — HTTP-checks event links for dead/cancelled listings.
- `node scripts/generate-weekly-meetups.js` — writes `weekly-meetups/<monday>-weekly-meetups{.md,-slack.txt}` for the current ET week.
- `npm run generate-carousel -- [YYYY-MM-DD] [--exclude <url-substring>]...` — Instagram carousel slides.

## Windows specifics

- Shell is PowerShell; `&&` works (pwsh 7+). No `head`/`tail`/`which` — use `Get-Content -TotalCount/-Tail`, `(Get-Command x).Source`. A Bash (Git Bash) tool is also available for POSIX one-liners.
- `create-workflow.ps1` is a PowerShell helper, not an npm script.
