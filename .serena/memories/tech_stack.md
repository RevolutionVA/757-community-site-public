# Tech Stack

- **Astro 6** (`astro@^6.0.0`), `output: 'static'`, `@astrojs/sitemap`. Astro 6 = Content Layer API; `.render()`/`.slug` from the old collections API were removed in a past migration — don't reintroduce them.
- **TypeScript** strict (`extends: astro/tsconfigs/strict`). `.ts` helpers in `src/lib/` and `src/components/landing/utils.ts`.
- **Node >= 22.12** (`engines`), `.nvmrc` = 22. All `scripts/*.js` are **ESM** (`"type": "module"` — use `import`, `import.meta.url` + `fileURLToPath` for `__dirname`).
- **Package manager: yarn 1.22.22** (`packageManager` field, `yarn.lock`, CI uses `yarn install --frozen-lockfile`). `npm run <script>` still works locally and is what the docs/scripts use.
- Runtime deps: `marked` (markdown), `rss-parser` (Meetup RSS). Dev: `ajv` + `ajv-formats` (schema validation), `chalk`, `node-fetch`.
- **Renovate** (`renovate.json`) opens dependency PRs; the Claude review workflow deliberately skips bot PRs.
- Hosting: **Azure Static Web Apps** (`staticwebapp.config.json` holds mime types, `nosniff`/`Referrer-Policy` headers, and cache-control per route — `_astro/*` immutable 1y, `/images/*` 1h SWR, `/styles/*` 10m SWR).
- Dev platform is **Windows** (PowerShell). `solo.yml` defines a Solo process `Astro` running `yarn run dev` with auto-start.
