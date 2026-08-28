# Core

Astro **static** site for the 757 tech community (Hampton Roads, VA). Live at `https://757tech.org`, deployed to Azure Static Web Apps. Repo is public; content is data-driven JSON, not a CMS.

## Source map

- `src/pages/` — file-based routes. `index.astro` (landing), `calendar`, `meetups`, `conferences`, `this-week`, `get-involved`, `popup`, `newsletter-thank-you`, `404`, `weekly/index.astro` + `weekly/[date].astro` (dated archive), `api/*.json.js` (build-time JSON endpoints: meetup-image, url-metadata).
- `src/components/` — shared components; `src/components/landing/` is the homepage-only set (`SplitHero`, `EventsExplorer`, `Featured`, `Groups`, `Conferences`, `SubmitCTA`, `WaveDivider`, `Landing{Header,Footer}`, `utils.ts`).
- `src/layouts/` — only two: `MainLayout.astro` (inner pages, SEO/social meta) and `LandingLayout.astro`.
- `src/lib/` — `weekly.ts` (Mon–Sun ET week math, archive week parsing/caching), `seo.ts` (`SITE` constant), `schema.ts` (JSON-LD node builders), `markdown.ts`.
- `src/data/` — the content layer; see `mem:data_pipeline`.
- `src/styles/` — `tokens.css` → imported by `chrome.css` → `landing.css` / `main.css`. See `mem:design_system`.
- `scripts/` — Node ESM automation (calendar, images, carousel, broadcasts, validation).
- `.github/workflows/` — cron + CI automation, see `mem:data_pipeline`.
- `weekly-meetups/` — generated weekly output files, committed (~150 files). `social/` — generated/social image assets. Both are outputs, not sources.

## Invariants

- `output: 'static'` — no SSR, no runtime server. Anything "dynamic" is either build-time or client-side JS.
- Build-time `new Date()` is baked into the HTML. A daily 05:10 UTC cron rebuild exists purely to roll forward "upcoming/this week/past" markers; don't "fix" date staleness by adding runtime code.
- The sitemap `serialize()` in `astro.config.mjs` is deliberate: `lastmod` only on pages that really change (`/`, `/calendar` from newest event timestamp; `/weekly/<date>` frozen to that week's Sunday). Never reintroduce a blanket `lastmod: new Date()`.
- `/newsletter-thank-you` is both sitemap-excluded and `noindex`; keep both.

## Further reading

- Commands to run (dev, validate, calendar rebuild, carousel): `mem:suggested_commands`
- Stack, versions, package manager: `mem:tech_stack`
- Calendar/meetup/conference data shapes, schema validation, cron automation: `mem:data_pipeline`
- Design tokens, palette, typography, `DESIGN.md`/`PRODUCT.md`: `mem:design_system`
- Weekly announcements, Bento newsletter, 1Password secrets, social handles: `mem:newsletter_and_social`
- Code style + commit/branch conventions: `mem:conventions`
- What to run before calling a change done: `mem:task_completion`
