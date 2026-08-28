# Design System

Coastal ("Tide Chart") system. Root docs: `DESIGN.md` (colors, typography, layout, elevation, shapes, components, do/don't) and `PRODUCT.md` (users, positioning, principles, accessibility). `.impeccable/` holds design config plus critique output from the `/impeccable` skill.

## Tokens — `src/styles/tokens.css`

Single source of truth, imported by `chrome.css`, which feeds `landing.css` (homepage) and `main.css` (inner pages). It exists because the site previously shipped two unrelated looks; **never** add a second palette or reintroduce `public/styles/global.css`-style standalone CSS.

`--deep #07314A`, `--deep-2 #0a4a70`, `--tide #0AB6D6`, `--seafoam #5FD0BE`, `--sand #F2E6CE`, `--sand-soft #FBF6EC`, `--coral #FF6F59` (= `--accent`), `--ink #0c2536`, `--muted #5b7280`, `--line #e7ded0`. Type: `--font-head` Baloo 2, `--font-body` DM Sans. `--radius 18px`, three shadow steps.

## Notes

- Category colors are computed in `src/components/landing/utils.ts` (`CATEGORY_META`, `catColor`, `oklchToHex`) — oklch with a hex fallback. Category order/labels live there too; keep them in sync with the four `meetups-combined.json` categories.
- Signature elements: the wave divider (`WaveDivider.astro`, `SectionDivider.astro`) and the date badge.
- Accessibility: AA contrast has been audited and fixed once already; re-check any new foreground/background pair. Known doc bug: `DESIGN.md` prescribes coral kickers on white (~2.75:1, fails AA) while its own Navy-On-Coral rule says otherwise — fix the doc and the tokens together, not piecemeal.
