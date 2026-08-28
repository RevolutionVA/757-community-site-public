# Task Completion

There is **no test suite, no linter, and no formatter** configured in this repo. The checks that exist:

1. `npm run validate` — AJV validation of `src/data/conferences.json` + `meetups-combined.json` against `src/data/schemas/*.schema.json`. Mandatory after **any** data-file edit.
2. `npm run build` — the only real type/template check (Astro + `astro/tsconfigs/strict`). Run it after touching `src/**`. Note it also regenerates `public/llms.txt` and may fetch meetup images, so re-check `git status` before committing.

Caveats:

- **No git hooks.** There is no husky setup and no `core.hooksPath`; the `precommit` npm script was removed because it never ran. Nothing validates for you locally — run `npm run validate` explicitly.
- CI on push/PR only validates JSON under `src/data/**` (`validate-json.yml`, via `ajv-cli`) and builds/deploys via the Azure SWA workflow. Nothing else gates a merge.
- `calendar-events.json` has **no** schema in `schemas/` and is not covered by `npm run validate`; changes there are only exercised by the build and the calendar scripts.
- `src/data/meetups-combined.json` frequently shows as modified with a zero-content CRLF-only diff. Leave it alone rather than committing the churn.
