# Conventions

## Code

- Astro components: `PascalCase.astro`. Helper modules: lowercase `.ts` (`weekly.ts`, `seo.ts`, `utils.ts`).
- `scripts/*.js` are standalone Node ESM CLIs with a top-of-file `Usage:` comment block. Repeatable `--exclude <url-substring>` is the shared flag idiom across `create-bento-broadcast.js` and `generate-weekly-carousel.js` — match it for new scripts, and warn when an `--exclude` matches nothing.
- Comments in this repo explain **why a non-obvious choice was made** (see `astro.config.mjs` sitemap block, `tokens.css` header). Preserve those; they encode decisions that were regressions once.
- CSS: no framework. Everything flows from `src/styles/tokens.css`; never hardcode a hex that duplicates a token. See `mem:design_system`.
- Dates/times: the site's canonical week is **Monday–Sunday in Eastern Time** (`src/lib/weekly.ts`, `landing/utils.ts` `ET`/`etDateKey`). Event `date` fields in JSON are ISO-8601 UTC. Don't mix local-time math into week bucketing.

## Git

- Default branch `main`. Feature/fix work goes on a branch + PR; routine calendar/newsletter data churn is committed straight to `main` by the maintainer.
- Established commit-message forms for automated content: `Update calendar events with new data` (calendar JSON), `Generate weekly meetups for <monday-date>` (weekly files). Feature work uses conventional prefixes (`feat:`, `fix:`).
- Never commit the generated announcement text for social platforms — those are chat deliverables the maintainer posts by hand. The `weekly-meetups/*.txt|.md` generator output *is* committed.
- `.env` is gitignored; `.env.example` holds only `op://` references (see `mem:newsletter_and_social`).

## Docs

`CLAUDE.md` (repo root) carries the authoritative weekly-announcement templates and formatting rules; `.claude/skills/weekly-meetups/SKILL.md` is the fuller workflow. When either changes, keep them consistent.
