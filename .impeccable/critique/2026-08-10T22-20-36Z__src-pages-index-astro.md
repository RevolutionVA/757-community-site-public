---
target: src/pages/index.astro
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-10T22-20-36Z
slug: src-pages-index-astro
---
Method: dual-agent (A: design review · B: detector + browser evidence, isolated, parallel)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | `.chip-count` is server-rendered once and never recomputed — reads "All 35" while the week view shows 5 and a zero-result search still shows 35. No freshness stamp, despite "updated every 6 hours" being core positioning. |
| 2 | Match System / Real World | 3 | Coastal language is committed and consistent; times are real ET. Undercut by generic "List / Week / Month" and by "Community" — a code-level fallback — surfacing as a real chip. |
| 3 | User Control and Freedom | 2 | Reset, search-clear, and This week/This month pills are all present. But List→Week collapses ~2,600px with no scroll anchoring and dumps you at the footer; no URL state, so nothing is shareable. |
| 4 | Consistency and Standards | 2 | Two chip systems that disagree (events chips carry counts and include "Community"; group chips don't and include Cloud/Design). `.wc-today` sets white on coral — 2.74:1 — which DESIGN.md's own Navy-On-Coral Rule forbids by name. |
| 5 | Error Prevention | 2 | `required` + `pattern` on email and a stray-Enter guard. But the hero demands first *and* last name for a free newsletter with no stated reason, and there is no inline error copy. |
| 6 | Recognition Rather Than Recall | 2 | Date badges and category dots are well-built, but hues 168/192/200/150 are not discriminable and there's no legend. Group marks collide: "HA" ×5, "75" ×3, "VI" ×2 — while real cached group images sit unused. |
| 7 | Flexibility and Efficiency | 2 | Three views, filter, and search give a returning attendee a path — but no deep links, no persisted state, no keyboard affordance, and no "add to calendar"/ICS on a product that *is* a calendar. |
| 8 | Aesthetic and Minimalist Design | 3 | Palette, type, radii, and the flat-at-rest/lift-on-hover model are disciplined. Dragged down by 35 undifferentiated cards, a one-card conferences band stranded at far left, and ~208px dead zones between sections. |
| 9 | Error Recovery | 1 | One generic empty state for every failure mode, with no explanation of the actual constraint (search covers only the next 8 weeks of *events*, not groups or conferences). No form error copy at all. |
| 10 | Help and Documentation | 1 | Nothing says what the Monday digest contains, when it arrives, or what a past issue looks like. "Automated aggregation plus human verification" — PRODUCT.md's #1 uncopyable claim — appears nowhere on the page. |
| **Total** | | **19/40** | **Poor band — but see Overall Impression: the deficit is informational, not visual.** |

## Design Specificity Verdict

**LLM assessment.** Roughly 60% authored, 40% off-the-shelf — and the off-the-shelf part is the part that does the actual job. Genuinely product-specific: the coastal token system, the Baloo 2 / DM Sans pairing that makes a directory read as an invitation, the `WaveDivider` silhouette, the voice ("in one tide", "Worth the drive", "20 groups, one tide"), the ET-locked date math that refuses to drift with the viewer's clock, the one-hue-per-category OKLCH derivation, and the hero's next-event peek — the most product-specific composition on the page, because it commits to showing *every* event on the nearest date rather than one hero event.

Category-interchangeable: the entire `EventsExplorer` interaction model. Filter chips + search + List/Week/Month over an auto-fill card grid is the stock events-directory pattern; recolor it and it's Luma or any city tech calendar. `Groups.astro` is a generic initial-avatar directory row. `SubmitCTA` is a stock SaaS band — navy gradient, dot-grid overlay, blurred radial blob, floating white chip — and could sit on a fintech pricing page unchanged.

The deeper failure is a mismatch between the stated North Star and the shipped default. DESIGN.md says "The Tide Chart" — an object whose entire subject is *when*. The default state is a 35-card grid sorted by date but chunked by nothing, with a category filter as the primary control: an object whose subject is *what*. The one surface that genuinely is a tide chart — the week view, with seven columns, a coral ring on today, and a live "5 events" subhead — is hidden behind the second tab. **The brand is authored for this product; the information architecture is borrowed.**

**Deterministic scan.** CLI detector: 1 advisory finding across `src/pages/index.astro` + `src/components/landing` (exit 2); the page file alone scanned clean (exit 0). Browser overlay: 21 findings across 13 element groups — `cramped-padding` ×7, `kicker-above-heading` ×4, `low-contrast` ×2, `layout-transition` ×2, `dark-glow` ×2, plus one each of `gpt-thin-border-wide-shadow`, `ai-color-palette`, `skipped-heading`, `repeating-stripes-gradient`. Deduped to unique causes it's ~11 distinct issues, not 21: seven of them are one `.ec-date` rule repeated across seven cards, and four more are the same section-kicker pattern across four components.

Where the two agreed: **coral contrast**. The detector independently flagged `.peek-label` at 2.7:1 on white, which the design review found as a systemic pattern across `.kicker`, `.ec-rel` (2.44:1), and `.ec-dow` (2.55:1). Two methods, same conclusion, different entry points — that's the strongest signal in this report.

What the detector caught that the review missed: `cramped-padding` on `.ec-date` (`padding: 9px 0 7px` — zero horizontal inset on a 64px tile, ×7 instances), a `skipped-heading` (h2 "Running a group or event?" → h4 "Explore", no h3), `gpt-thin-border-wide-shadow` on `.hero-peek` (1px border + 40px blur), and `transition: padding` on the sticky header — a layout-animating property that can jank on scroll.

False positives, verified and dismissed: the `#fff` color finding (DESIGN.md defines `#ffffff`; the detector doesn't normalize 3-digit shorthand), both `dark-glow` hits (they're the documented `--shadow-lg` and coral-glow tokens), `ai-color-palette` on `.art-wave` (seafoam→tide are the brand palette, not generic AI cyan), and `repeating-stripes-gradient` (an intentional 14%-tint fallback behind missing conference photos).

**Visual overlays.** Injection succeeded — mutation was proven by preflight, the helper ran on port 8400, `detect.js` was injected and its console output captured, and the server was stopped cleanly afterward. The overlay tab has since been closed, so there is no live overlay in your browser now; the findings above are the captured result.

## Overall Impression

This is a genuinely well-made page carrying a borrowed skeleton. The craft is real and unusual — a coherent token system, contrast reasoning committed to code comments, timezone-correct date math, generated category color with sRGB fallbacks. Almost nothing here is sloppy.

But the 19/40 is not a scoring accident, and it's worth reading precisely: heuristic 8 (aesthetics) scored 3 while status, error recovery, and help all scored 1. **The deficit is informational, not visual.** The page is beautiful and it does not tell you what's happening. Counts lie after you filter, empty states don't explain the constraint that produced them, and nothing on the page says what the thing you're being asked to subscribe to actually is.

The single biggest opportunity: **make the week the default.** The tide chart already exists, fully built, correctly responsive, with today marked in the system's own urgency color — and it's behind a tab nobody is told about. Flipping one variable moves the page from answering "what kinds of tech exist here" to answering "what can I go to this week," which is the exact job PRODUCT.md says the primary user came to do.

## What's Working

1. **The token system produces a surface that could not have come out of a template.** One palette, warm `--line` borders instead of neutral grey, navy-tinted shadows instead of black, and the flat-at-rest/lift-on-hover rule applied consistently across event, featured, conference, and group cards — each with its own considered displacement (−3px, −4px, −5px, and `translateX(3px)` for the group *list*, because a list moves sideways). The Navy-On-Coral decision, with 4.96:1 vs 2.74:1 reasoning committed to a code comment, is evidence of a system that argues with itself rather than picking a look.

2. **The week view is the right object, correctly built.** It groups by day rather than category, marks today with the system's urgency color, shows a live count in its subhead, keeps past events visible at 48% opacity instead of hiding them, and restructures to a left-rail day list at ≤860px rather than crushing seven columns. It is the tide chart the brief asks for. It is also the second tab.

3. **The data plumbing is honest, and the honesty shows in the UI.** Chip counts are tallied in one pass from events actually present, so per-chip counts always sum to All even if a new category appears. Times render through `Intl` locked to `America/New_York`. Category colors derive from one hue at fixed lightness/chroma. Every OKLCH ships a computed sRGB hex beside it. Nothing on this page is invented — exactly what PRODUCT.md's no-fabrication rule demands.

## Priority Issues

### [P0] The default view is a list, not the week
**What:** `EventsExplorer.astro` ships `<button class="active" data-view="list">` (line 66) and initializes `let view = "list"` (line 146). *Verified in source.* The entry point into the calendar is a 35-card, 8-week, category-filterable grid.
**Why it matters:** PRODUCT.md states the primary user's job is "find one thing worth going to this week"; DESIGN.md's North Star is an object whose whole subject is *when*. The default answers "what kinds of tech exist here" instead. The view that answers the real question in one screen is a tab most visitors never click, and nothing on the page tells them it exists.
**Fix:** Default `view = "week"` and mark the Week button active in markup. Relabel the toggle to `This week / Month / All events` so the options describe scope, not layout. Server-render the current week into `.calendar-wrap` in `index.astro` — `weekDays()` already runs in Node — so the answer is in the HTML before hydration.
**Suggested command:** `/impeccable layout`

### [P0] The page ends with an organizer ask, and the digest is sold without proof
**What:** `index.astro` renders `<SubmitCTA />` as the final section before the footer. The `.news-section` closing-subscribe styles exist in `landing.css` (288–300) and **no component uses them** — *verified: zero references in `src/`*. The hero form's only support is 13.5px of `.hero-mini` text.
**Why it matters:** Success is measured in subscribers, and PRODUCT principle 2 says every surface earns the subscription. The last impression instead targets ~20 organizers region-wide. Meanwhile the strongest available reassurance — real, human-verified past digests in `weekly-meetups/`, already browsable at `/weekly/` — is mentioned once, in the footer, as "Weekly archive." Peak-end is being actively worked against: the strongest moment is behind a tab, and the final moment belongs to a secondary audience.
**Fix:** Add a closing subscribe band below `<SubmitCTA />` using the existing dead `.news-section` styles and the same Bento action from `SplitHero.astro`. Add a "See what last Monday's digest looked like →" link to `/weekly/` beside `.hero-mini`, plus one line naming what's inside.
**Suggested command:** `/impeccable clarify`

### [P1] Coral fails AA everywhere it carries meaning — and one rule violates the design system by name
**What:** `#FF6F59` on white is **2.75:1** (`.kicker` on all four section headers, `.peek-label`). On `color-mix(coral 12%, #fff)` it is **2.44:1** — that's `.ec-rel`, the Today/Tomorrow pill, the single most important urgency signal on the page. On `--sand-soft` it is **2.55:1** (`.ec-dow`, on every date badge). And `.wc-today` (landing.css:187) sets `color: #fff` on `background: var(--coral)` = **2.74:1** — *verified in source* — which DESIGN.md's Navy-On-Coral Rule forbids explicitly. The dead `.capture button` block (landing.css:54–59) repeats the same violation.
**Both assessments found this independently.**
**Why it matters:** Coral is the designated color of *now*. Every time-critical cue on the page is rendered in a color low-vision users, bright-daylight phone users, and anyone on a dim screen cannot read. The system solved this once for buttons and never generalized it.
**Fix:** Add a `--coral-ink` token to `tokens.css` — darkened coral at the same hue, ≥4.5:1 on both `#fff` and `--sand-soft` — and use it for every coral *text* rule (`.kicker`, `.peek-label`, `.ec-rel`, `.ec-dow`, `.fd-*`). Keep `--coral` for fills only. Change `.wc-today` to `color: var(--deep)`. Delete the dead `.capture` block. **Also correct DESIGN.md**, which currently prescribes coral kickers on white — that instruction is wrong and will propagate.
**Suggested command:** `/impeccable colorize`

### [P1] Switching views throws the user to the footer, and filter state is neither shown nor announced
**What:** The `viewBtns` handler (`EventsExplorer.astro`:317–332) swaps `display` with no scroll compensation; List→Week removes ~2,600px above the scroll position, landing the user in the footer. Separately `.chip-count` is baked server-side from the 8-week window and never recomputed, and neither `.chip` nor the view buttons carry ARIA state (live DOM shows only `class` and `data-cat`).
**Why it matters:** The one interaction that most improves the experience actively punishes the person who tries it. And because counts never move, the interface confidently reports "35" over an empty grid — the worst possible status signal.
**Fix:** Capture `section.getBoundingClientRect().top` before the DOM swap and restore scroll after. Recompute chip counts inside `render()` scoped to the active view's date range. Add `aria-pressed` to `.chip`, `role="tablist"` + `aria-selected` on the view toggle, and an `aria-live="polite"` "Showing N of M events" line above `.event-grid`.
**Suggested command:** `/impeccable harden`

### [P2] Groups answers neither of the newcomer's unknowns; Conferences renders as broken at n=1; date badges are cramped
**What:** `Groups.astro` renders 20 alphabetical rows keyed by two-letter initials — "HA" ×5, "75" ×3, "VI" ×2 — with tags but no dates, while `public/images/meetups/` already holds cached per-group images and `MeetupImage.astro` already exists to render them. `.conf-grid` uses `auto-fill, minmax(270px, 1fr)`, so today's single upcoming conference sits alone at the far left of a full-bleed sand band with ~900px of empty sand beside it. And the detector's `cramped-padding` ×7: `.ec-date` is `padding: 9px 0 7px` — zero horizontal inset on a 64px tile.
**Why it matters:** PRODUCT.md says the newcomer doesn't know which groups exist "**or which are alive**." A directory with no recency signal cannot make that distinction — the exact judgment the primary user came to make. And a one-card band reads as abandoned, not curated, undercutting "completeness is the credibility."
**Fix:** Replace `.group-mark` initials with the cached group image (initials as fallback) via `MeetupImage.astro`. Add a "Next: Tue Aug 18" line per card from the `meetupByName` map already built in `index.astro`, sorted by soonest, with dormant groups last. Give `.conf-grid` a `max-width` + `margin-inline: auto` so small-n states read as centered. Add horizontal padding to `.ec-date`.
**Suggested command:** `/impeccable polish`

## Persona Red Flags

**Jordan (Confused First-Timer), on a phone.** First screen: headline, paragraph, three input fields — first name, last name, email — before any event exists. Scrolls past the logo (second time, after the header) to three cards all dated Wed Aug 12 with no framing that says "this week." Hits **Featured events**: Sep 17 and Oct 9, five and eight weeks out, under a header saying "Don't miss" — noise for someone deciding tonight. Reaches the explorer: four chips whose distinction ("Development" vs "Technology") is meaningless to a newcomer. Then 35 cards in which "Peninsula Builders Study Group" appears on Aug 18, Sep 1, Sep 15, and Sep 29, and "Norfolk Cybersecurity Networking & Happy Hour" three times. Conclusion: *nothing much happens here, and it's all the same thing.* Specific breakages: `.ec-rel` — Jordan's only temporal anchor — renders on zero cards today, because the nearest event is +2 days; there are no date-group headings; the week view isn't the default; and at ≤860px `.week-col.empty { display: none }` removes today's column entirely when today is empty, so even in the week view on mobile, the coral "Today" marker vanishes at exactly the moment Jordan needs to know where "now" is.

**Casey (Distracted Mobile User).** 15,303px tall at 390px — about 19 thumb-screens. The header at rest shows a burger and a coral Subscribe with the brand at `opacity: 0`, so there's no left anchor. Casey taps **Month** to skim and gets colored slivers measuring **22.1 × 46px** — under WCAG 2.2's 24px minimum — with `.me-t { display: none }` at ≤640px, so the only visible label is a time overflowing its box: "6:3", "9:3 AM". Tapping is a coin flip. Back in List, tapping the Development chip leaves the count reading 12 with no statement of what's now on screen. Every event card is `target="_blank"`, so exploring three events leaves three orphan tabs and no path back. The explorer bar isn't sticky, so changing a filter after eight cards means scrolling all the way up.

**Riley (Deliberate Stress Tester).** Searches `python`: zero results, palm tree, generic message — while "757 Python Users Group" sits ~4,000px below on the same page, unsearched, because the `search` field in `toVM()` only indexes events. Searches `cloud`: no Cloud chip exists in the events row, but a Cloud chip *does* exist in the Groups row below — two filter systems on one page disagreeing about what categories are. Clicks List→Week and is thrown to the footer. Tabs the chips: no `aria-pressed`, no `aria-selected` on the view toggle, so a screen reader is told nothing changed. Reloads after filtering: no URL state, everything resets. Enables `prefers-reduced-motion`: `.art-wave` correctly stops, but `html { scroll-behavior: smooth }` has no reduced-motion guard, so every anchor click still animates the viewport. Submits the hero form with just an email: blocked by `required` on both name fields, with no copy anywhere explaining why a free weekly email needs a last name — the highest-friction field on the page's highest-value action.

## Minor Observations

- **The wave divider is used exactly once**, in `SplitHero.astro` — *verified*. DESIGN.md calls it "the system's signature move: sections don't butt against each other, they wash into each other," but Events→Conferences and Conferences→Groups both butt hard. The signature is stated, used once, abandoned.
- `.section` applies `clamp(64px, 9vw, 104px)` top *and* bottom, so adjacent sections carry up to **208px** of dead vertical space.
- `.section-head` uses `justify-content: space-between`, stranding `.section-lead` ~400px from the h2 it describes — it reads as an unrelated caption.
- `.hero-form` re-implements the pill-input styling `.capture` already defines, one of the two copies being dead. Consolidate into a `.field-pill` class in `chrome.css`.
- The hero logo is a 2048×1117 PNG rendered at ~184px with no `srcset` — roughly 11× the needed pixels on the highest-priority above-fold image.
- `.month-ev` relies on a `title` attribute for its tooltip, which is keyboard- and touch-inaccessible — and on mobile it's the *only* way to read the event name.
- Event card link text concatenates the whole card into one accessible name ("WED 12 AUG 1 PM Technology (CS)²AI Online™ REPLAY…"). Add `aria-label` to the `<a>` and `aria-hidden` to `.ec-date`.
- Nothing says when the calendar last refreshed, though the six-hour loop is one of two things PRODUCT.md says a competitor cannot copy. "Last updated 4 hours ago" is free credibility.
- The `Community` category is a code-level fallback (`meetup?.category ?? "Community"`) that surfaces as a real clickable chip. Two of the three featured events are tagged Community — the marquee slot is dominated by events whose category failed to resolve.
- Detector flagged `kicker-above-heading` ×4 as a saturated pattern. It's a legitimate call — the coral eyebrow above a heading is everywhere in current web design — but it is also the documented `label` role in DESIGN.md. Treat as advisory: the contrast problem is real, the pattern itself is a deliberate brand choice.
- One `skipped-heading`: h2 "Running a group or event?" is followed by h4 "Explore" in the footer, with no h3 between.

## Questions to Consider

1. **If the week view were the entire Events section — no toggle, no chips, no search, just "This week" with prev/next arrows and a link to `/calendar` for everything else — what would actually be lost?** The primary user's job is one week wide. The 35-card list, the filter, and the month grid serve regular attendees and organizers, and PRODUCT.md is explicit that those audiences are served, not optimized for.

2. **Four instances of "Peninsula Builders Study Group" in one scroll is a data-shape problem, not a card-design problem.** Should recurring series collapse into one entity — "757 Developers · Peninsula Builders Study Group — every other Tuesday, next Aug 18" — with occurrences expandable? That cuts 35 cards to ~15 distinct things and answers "which groups are alive" in the same stroke, because cadence *is* the aliveness signal.

3. **The digest is the success metric, and the site already generates and archives the exact artifact the visitor would receive — so why is the page describing it instead of showing it?** A real, dated excerpt of last Monday's send, directly above the email field, is the only social proof this product can honestly offer, and it costs nothing because `weekly-meetups/` is already in the repo.

4. **Coral is defined as "the color of *now*" — but on a page where the nearest event is 48 hours out, coral appears only on decorative kickers and the Subscribe button, and never on a single event.** Should "now" be computed and relative — the next event, tonight, this week — so the color always points at something, rather than an absolute that silently switches off whenever today is quiet?
