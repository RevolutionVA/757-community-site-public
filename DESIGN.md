---
name: 757tech
description: The coastal design system for the front door to tech in Hampton Roads.
colors:
  deep: "#07314A"
  deep-2: "#0a4a70"
  tide: "#0AB6D6"
  seafoam: "#5FD0BE"
  coral: "#FF6F59"
  sand: "#F2E6CE"
  sand-soft: "#FBF6EC"
  ink: "#0c2536"
  muted: "#5b7280"
  line: "#e7ded0"
typography:
  display:
    fontFamily: "Baloo 2, system-ui, sans-serif"
    fontSize: "clamp(38px, 6vw, 72px)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Baloo 2, system-ui, sans-serif"
    fontSize: "clamp(30px, 4vw, 46px)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Baloo 2, system-ui, sans-serif"
    fontSize: "16.5px"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Baloo 2, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 700
    letterSpacing: "0.1em"
rounded:
  tile: "12px"
  badge: "14px"
  mark: "16px"
  card: "18px"
  feature: "20px"
  panel: "22px"
  billboard: "28px"
  chip: "999px"
spacing:
  tight: "8px"
  snug: "12px"
  base: "16px"
  card: "18px"
  gutter: "28px"
  section: "clamp(64px, 9vw, 104px)"
components:
  button-primary:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.deep}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    padding: "13px 22px"
  button-ghost:
    backgroundColor: "#ffffff"
    textColor: "{colors.deep}"
    rounded: "{rounded.chip}"
    padding: "11px 20px"
  button-ghost-dark:
    backgroundColor: "transparent"
    textColor: "#ffffff"
    rounded: "{rounded.chip}"
    padding: "13px 22px"
  chip:
    backgroundColor: "#ffffff"
    textColor: "{colors.deep}"
    rounded: "{rounded.chip}"
    padding: "8px 15px"
  chip-active:
    backgroundColor: "{colors.deep}"
    textColor: "#ffffff"
    rounded: "{rounded.chip}"
    padding: "8px 15px"
  input:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "13px 16px"
  card-event:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "18px"
  date-badge:
    backgroundColor: "{colors.sand-soft}"
    textColor: "{colors.deep}"
    rounded: "{rounded.badge}"
    padding: "9px 0 7px"
    width: "64px"
---

# Design System: 757tech

## Overview

**Creative North Star: "The Tide Chart"**

A tide chart is a beautiful, useful object whose entire subject is *when*. It doesn't
argue, it doesn't sell, and it never makes you hunt: it lays out what's coming in, in
order, so you can plan your day around it. That is what this system is. Every surface
answers a newcomer's first question — *what can I go to this week?* — and the design's job
is to make that answer immediate, warm, and worth returning to on a Monday.

The world is Hampton Roads' actual coast, not a generic beach: deep harbor navy under warm
sand, cut by a bright tide cyan and punctuated with coral. Headings are set in Baloo 2, a
rounded display face with real warmth to it, over DM Sans for anything you actually read.
Corners are generous — cards at 18px, panels at 22px, and every pill and control fully
rounded — so the page feels handmade and welcoming rather than engineered. Wave dividers
carry one section into the next, which is the system's signature move: sections don't butt
against each other, they wash into each other.

Nothing floats until you reach for it. Surfaces sit flat on sand-tinted borders and rise on
hover with a navy-tinted shadow — the buoyancy is a *response*, not decoration. The result
should read as a community bulletin kept by people who live here, never as a SaaS product
page. It is run by volunteers under a 501(c)(3) and it should look like it was made with
care by locals, because it was.

**Key Characteristics:**
- Warm sand grounds; deep harbor navy for text and authority
- Rounded, buoyant geometry — 12–28px corners, fully-pilled controls
- Baloo 2 display over DM Sans body: friendly, never corporate
- Coral reserved for *now*; tide cyan for navigation and interaction
- Flat at rest, lifting on touch — depth is feedback, not ornament
- Wave dividers as the connective tissue between sections
- Category color derived programmatically in OKLCH, with sRGB fallbacks

## Colors

A coastal palette read at low tide: warm sand light, deep harbor dark, with cyan and coral
as the two things that catch your eye.

### Primary
- **Harbor Navy** (`--deep`): The system's authority. Every heading, every high-contrast
  surface, the active filter chip, the conference month tag, and the label on the coral
  button. Also the base of the two dark bands (Submit and Newsletter), where it gradients
  toward a slightly lighter harbor blue.
- **Deep Water** (`--deep-2`): Navy's readable sibling. Body links on inner pages, event
  times, tag text, and the current-page nav marker. Use it wherever navy would be too heavy
  but muted would be too quiet.

### Secondary
- **Tide Cyan** (`--tide`): The interaction color. Focus rings, hover borders, the nav
  underline that wipes in from the left, the "757" highlight in the hero headline, link
  hovers, and the default left-edge stripe on calendar events. If something responds to
  you, it responds in tide.
- **Seafoam** (`--seafoam`): The soft counterpart. Text selection background, tag chip
  fills at 20% over white, the light-on-dark kicker, and the radial core of the Submit
  card's animated wave.

### Tertiary
- **Signal Coral** (`--coral`, aliased as `--accent`): The color of *now*. Today markers,
  "Today" and "Tomorrow" pills, the next-up peek label, section kickers, and the single
  primary action on any screen.

### Neutral
- **Warm Sand** (`--sand`): Conference tag fills and the default wave-divider fill. The
  warmest surface in the system.
- **Sea Foam Paper** (`--sand-soft`): The workhorse background. Hero gradients, date
  badges, week and month calendar cells, the view-toggle track, and the conferences band.
- **Squid Ink** (`--ink`): Body text. Slightly warmer and softer than pure navy so long
  reading doesn't feel severe.
- **Driftwood Grey** (`--muted`): Secondary text — group names, locations, timestamps,
  helper copy, empty states.
- **Shell Line** (`--line`): Every border in the system. Warm rather than grey, which is
  what keeps outlined cards from reading as clinical.

### Category Hues
Event and group categories are **generated, not hand-picked**. `landing/utils.ts` holds one
hue per category (Development 168°, Technology 192°, Cloud 200°, Design 280°, Community
150°, unknown 195°) and derives three matched values at fixed lightness and chroma:
background `oklch(0.94 0.06 H)`, foreground `oklch(0.42 0.12 H)`, dot `oklch(0.62 0.15 H)`.
Every value ships with an sRGB hex fallback computed from the same L/C/H, emitted as a
double declaration so old browsers keep the hex and modern ones override with OKLCH.

**The One Hue Rule.** A new category means adding one hue number to `CATEGORY_META` — never
a new hand-authored color. Fixed lightness and chroma across all categories is what keeps
twenty groups from looking like a bag of candy.

### Named Rules

**The Coral Means Now Rule.** Coral marks time, and one action. Today markers, urgency
pills, next-up labels, section kickers that announce what's below, and the single primary
button on a screen. Never use coral for decoration, for a second competing CTA, or for a
category. When everything is urgent, nothing is.

**The Navy-On-Coral Rule.** Coral buttons carry **navy** labels, never white. White on
`#FF6F59` measures 2.74:1 — well under the 4.5:1 floor — while `#07314A` on the same coral
measures 4.96:1. Darkening the coral enough to carry white would visibly shift the brand
hue toward red, so the label moves instead of the brand.

**The Warm Line Rule.** Borders are `--line`, a warm sand-grey. Never `#ddd`, never a
neutral grey, never `rgba(0,0,0,0.1)`. One cool border in a sand-toned card is instantly
visible and reads as a bug.

## Typography

**Display Font:** Baloo 2 (with `system-ui, sans-serif`), weights 500–800
**Body Font:** DM Sans (with `system-ui, sans-serif`), optical-sized 9–40, weights 400–700
**Mono:** DM Mono (with `ui-monospace, monospace`) — used only for the conference photo
placeholder label

**Character:** Baloo 2 is round, slightly chunky, and unmistakably friendly — it does the
work of making a directory of events feel like an invitation rather than a database. DM
Sans underneath is quiet and highly legible at small sizes, which is what lets event cards
carry a title, group, time, and three tags without turning into noise. The pairing is warm
on top, efficient underneath.

### Hierarchy
- **Display** (800, `clamp(38px, 6vw, 72px)`, 1.04): The hero headline, once per page.
  Always `text-wrap: balance` — an orphaned word in a 72px heading is very visible.
- **Headline** (800, `clamp(30px, 4vw, 46px)`, 1.04): Section headings. Inner pages run a
  quieter parallel scale (`clamp(2rem, 5vw, 3rem)` for h1, `clamp(1.4rem, 3vw, 1.9rem)` for
  h2) at line-height 1.15.
- **Title** (700, 16.5px, 1.25): Card titles. Steps up to 19px on featured cards and 22px
  on conference cards; drops to 13px inside calendar cells.
- **Body** (400, 16px, 1.5): All reading copy in DM Sans. Prose contexts loosen — inner
  pages run 1.6, and event descriptions run 1.8 so inline links clear the 24px touch-target
  minimum. Lead paragraphs cap at 440–560px.
- **Label** (700, 13.5px, `0.1em`, uppercase): Section kickers in coral. The system's
  smaller labels — date badges, day-of-week headers, footer column heads — run 10–13px at
  `0.04–0.08em`, always Baloo 2, always uppercase.

### Named Rules

**The Two Voices Rule.** Baloo 2 speaks; DM Sans informs. Headings, buttons, labels, dates,
times, and chips are Baloo 2. Sentences and paragraphs are DM Sans. A component that mixes
them within one line is almost always wrong.

**The No Fallback Font Rule.** Never let a component reset to `system-ui` or a native font
stack. Both faces load from Google Fonts in the layout head with `display=swap`; a
component that opts out breaks the pairing everywhere it appears.

## Layout

A centered 1200px column with 28px gutters governs the site (the landing hero runs slightly
narrower at 1160px, and the Submit and Newsletter bands break full-bleed while keeping their
inner content on the same 1200px rail). Vertical rhythm is one clamped step:
`clamp(64px, 9vw, 104px)` for landing sections, `clamp(2.5rem, 6vw, 4rem)` for inner-page
heroes.

Content grids are auto-fitting rather than fixed-column, so density follows the viewport
instead of a breakpoint table: events at `minmax(380px, 1fr)`, featured at `minmax(330px,
1fr)`, conferences at `minmax(270px, 1fr)`, groups at `minmax(310px, 1fr)`. The hero is the
one deliberate asymmetry — a `1.05fr / 0.95fr` split that gives the copy and signup form
slightly more room than the logo and next-event peek.

Responsive behavior collapses in stages rather than at one breakpoint: the header sheds its
social icons at 920px and becomes a burger menu at 760px; the hero stacks at 860px, as does
the week calendar (from seven columns to stacked rows with the day head rotating to a left
rail); the calendar header becomes a three-column grid at 640px so the reset pill drops to
its own row; month cells shed event titles at 640px; the event grid goes single-column at
480px. Sticky-header offset is handled with `scroll-margin-top: 86px` scoped to `section[id]`
and `#subscribe`.

**The Auto-Fit Rule.** New grids use `repeat(auto-fill, minmax(<min>, 1fr))` with a real
minimum, not a fixed column count with breakpoint overrides. The column count is an outcome,
not a decision.

**The Nothing Hides Behind The Header Rule.** The header is sticky and condenses on scroll,
so any focusable element that keyboard focus reaches must be fully visible once it lands —
never tucked under that bar. This is why `scroll-margin-top: 86px` exists, and why any new
anchor target, skip link, in-page jump, or scroll-into-view call needs the same clearance.
WCAG 2.2 AA is a binding product requirement here (SC 2.4.11, Focus Not Obscured), not a
nicety: a focus ring the visitor cannot see is the same as no focus ring.

## Elevation & Depth

**Flat at rest, lifting on touch.** Surfaces sit on a 1px `--line` border with no shadow;
depth appears only as a response to interaction. On hover a card rises 2–5px and takes a
navy-tinted shadow, and — importantly — its border goes transparent as the shadow arrives,
so the two never stack into a hard double edge. This is where the system's buoyancy lives:
things float when you reach for them.

Shadows are tinted with the harbor navy (`rgba(7,49,74,…)`), never neutral black. A black
shadow under a sand-toned card reads as dirt; the navy tint reads as water.

A small number of resting surfaces carry `--shadow-sm` at rest because they are containers
rather than targets: the calendar panel, featured cards, the hero's next-event peek, and the
scrolled header. Everything clickable starts flat.

### Shadow Vocabulary
- **`--shadow-sm`** (`0 2px 8px rgba(7,49,74,.06)`): Resting containers and the condensed
  sticky header. Barely there by design.
- **`--shadow`** (`0 14px 40px -16px rgba(7,49,74,.28)`): The hover lift. The workhorse.
- **`--shadow-lg`** (`0 30px 70px -24px rgba(7,49,74,.4)`): Reserved for elements floating
  above an illustration — currently only the Submit card's chip.
- **Coral glow** (`0 8px 20px -8px color-mix(in srgb, var(--accent) 70%, transparent)`): The
  primary button's own shadow, tinted with its own color rather than navy, deepening to
  `0 14px 26px -10px` at 75% on hover.

### Named Rules

**The Reach-For-It Rule.** Shadow is feedback. If an element can't be clicked, hovered, or
focused, it doesn't get a shadow — it gets a border.

**The Border Handoff Rule.** When a card takes its hover shadow, its border goes
`transparent` in the same transition. Shadow and border never both define the edge.

## Shapes

Everything is rounded, and the radius encodes scale: the bigger the surface, the softer the
corner. Small marks and month cells at 12px, date badges at 14px, group marks and inline
cards at 16px, event cards and content boxes at 18px (`--radius`, the only named radius
token), conference cards at 20px, calendar and peek panels at 22px, and the Submit
billboard at 28px. Controls — buttons, chips, inputs, search, view toggles, count badges,
"Today" pills — are always fully pilled at 999px. Circles are reserved for icon buttons:
social icons and calendar nav at 38px.

Borders are hairline and warm: 1px `--line` on surfaces, 1.5px on interactive controls so
buttons and inputs read as touchable. Calendar events add a 3px left stripe in their
category color — the one place a border carries meaning rather than structure.

The **wave** is the system's signature silhouette: a single hand-tuned SVG path
(`WaveDivider.astro`, `viewBox="0 0 1440 120"`, `preserveAspectRatio="none"`) absolutely
positioned at `bottom: -1px` and scaled `clamp(60px, 8vw, 110px)` tall. The `-1px` matters —
it prevents a subpixel seam between the wave and the section below.

**The Pill-Or-Panel Rule.** If it's a control, it's a pill (999px). If it's a surface, it's
a panel (12–28px, scaled to its size). There is no middle radius for controls.

## Components

### Buttons
- **Shape:** Fully pilled (`999px`), Baloo 2 at weight 700.
- **Primary** (`.btn-coral`): Coral fill, **navy** label (see The Navy-On-Coral Rule),
  16px, `13px 22px` padding, with its own coral-tinted glow. Hover rises 2px, deepens the
  glow, and brightens 4%; active returns to 0.
- **Ghost** (`.btn-ghost`): White fill, navy label, 1.5px `--line` border, 15px,
  `11px 20px`. Hover shifts both border and label to tide cyan.
- **Ghost Dark** (`.btn-ghost-dark`): For navy bands. Transparent fill, white label, 1.5px
  white-at-45% border. Hover fills to white-at-12% and brightens the border to solid.
- **Transitions:** `.15s ease` on transform, shadow, and filter. Never longer on a button.

### Chips
- **Filter chips:** White fill, 1.5px `--line` border, navy Baloo 2 at 14.5px, `8px 15px`.
  Hover shifts the border to tide. **Active** inverts entirely to a navy fill with white
  text and a navy border.
- **Count badge:** A nested pill inside the chip — tide at 16% over white, navy text, 12px
  bold. Inside an active chip it flips to white-at-20% on navy.
- **Tag chips:** Non-interactive. Seafoam at 20% over white with `--deep-2` text (event
  tags), or solid `--sand` with `--deep-2` text (conference tags), 11.5px at weight 600.
- **Category badge:** Generated OKLCH background and foreground plus a 7px dot in the
  category's dot color. Always paired with its dot; the dot is what makes the category
  legible at a glance.

### Cards / Containers
- **Corner Style:** 18px for event cards and content boxes; 20–22px for conference cards
  and panels.
- **Background:** White. Sand-soft is for the surfaces *behind* cards, not the cards.
- **Shadow Strategy:** Flat at rest, `--shadow` on hover with the border handing off to
  transparent (see Elevation).
- **Border:** 1px `--line`.
- **Internal Padding:** 18px on event and conference cards, 22px on panels,
  `clamp(1.25rem, 3vw, 2rem)` on content boxes.
- **Motion:** `translateY(-3px)` for event cards, `-4px` featured, `-5px` conferences.
  Group cards move sideways instead — `translateX(3px)` — because they're a list, not a
  grid.

### Inputs / Fields
- **Style:** White fill, 1.5px `--line` border, fully pilled, DM Sans at 15–16px,
  `13px 16px` padding. 16px minimum on anything a phone will focus, to prevent iOS zoom.
- **Focus:** Border shifts to tide cyan plus a 4px ring of tide at 16–18%
  (`color-mix(in srgb, var(--tide) 18%, transparent)`). Never remove the outline without
  replacing it with this ring.
- **Search:** A 38px left inset for the icon and a right-aligned clear button, both
  `--muted`.

### Navigation
- Baloo 2 at 15.5px weight 600, navy at 82% opacity, rising to full on hover.
- **The underline wipe:** a 2px tide bar pinned to the left that animates `right: 100% → 0`
  over `.2s`. It is driven by `aria-current="page"` for the active state, so the visual
  marker and the accessibility signal cannot drift apart.
- **Scroll behavior:** transparent at rest over the hero, condensing at scroll to
  white-at-88% with a 12px backdrop blur, a `--line` hairline, and reduced padding. The
  brand logo is hidden at the top (the hero already shows it large) and fades in as the
  header condenses. Inner pages start in the condensed state, since there's no hero behind
  the bar.
- **Mobile (≤760px):** burger toggle; the nav drops as a blurred white sheet with 10px
  rounded rows, `--sand-soft` on hover, and the underline disabled.

### Wave Divider (signature)
One SVG path, full-bleed, `preserveAspectRatio="none"` so it stretches rather than crops.
Its `fill` prop is set to the color of the section *below* it, so the wave reads as that
section rising into this one. Defaults to `--sand`. It is `aria-hidden`, always — it carries
no information.

### Date Badge (signature)
The system's most-repeated object: a 64px sand-soft tile stacking day-of-week (11px coral,
uppercase), day number (25px Baloo 2 at 800, navy), month (11px muted, uppercase), and time
below a hairline rule. In the hero and featured band the whole badge takes the category's
generated color instead of sand-soft, and the internal rule switches to
`color-mix(in srgb, currentColor 25%, transparent)` so it tints with whatever it sits on.

## Do's and Don'ts

### Do:
- **Do** put every new color, font, radius, and shadow through `src/styles/tokens.css`. It
  exists because the site previously shipped two palettes and read as two products.
- **Do** give coral to time and to one action per screen — today markers, urgency pills,
  next-up labels, kickers, the primary CTA.
- **Do** label coral buttons in `--deep` navy (4.96:1), never white (2.74:1).
- **Do** tint shadows with harbor navy `rgba(7,49,74,…)`.
- **Do** start surfaces flat with a 1px `--line` border and add elevation on hover, handing
  the border off to `transparent` as the shadow arrives.
- **Do** pill every control at 999px and scale surface radii to surface size (12–28px).
- **Do** add a category by adding **one hue** to `CATEGORY_META` in `landing/utils.ts`.
- **Do** ship both the sRGB hex and the OKLCH value, hex first, when writing color into an
  inline `style` attribute.
- **Do** drive active navigation from `aria-current="page"` so the visual and assistive
  signals stay welded together.
- **Do** use real 757 photography, cached Meetup group images, or the wave and dot-grid
  motifs when a surface needs an image. **This is no longer aspirational** — photographs of
  actual 757 events exist and are cleared for site use, not email only. Email-ready
  derivatives are tracked in `public/images/newsletter/<issue>/`; the working sources and
  the member photo archive sit untracked in `social/`. **Two conditions travel with every
  photo:** the photographer is credited wherever it appears, and the specific shot is
  cleared for that placement. A credit line is part of the composition — design the caption
  slot in, don't bolt it on.
- **Do** honor `prefers-reduced-motion` on anything that loops — the Submit card's pulsing
  wave already does.
- **Do** underline links inside prose. Color alone measured 1.87:1 against surrounding
  text, under the 3:1 minimum.
- **Do** hold WCAG 2.2 AA. It is a binding product requirement, not a convention the
  codebase happens to follow. Three parts of it bite this system specifically: every
  interactive target clears **24×24 CSS px** (SC 2.5.8 — this is why event-description
  line-height runs 1.8), focus never lands under the sticky header (SC 2.4.11), and the
  4px tide focus ring is the replacement for any outline you remove, never a deletion.
- **Do** bring an existing surface up to WCAG 2.2 AA when you touch it. The standard
  applies to new work outright and to old work on contact.

### Don't:
- **Don't** use generic stock photography. The Unsplash beach and conference images
  currently in `KeepSurfing.astro` and the `FeatureCard` calls on `/calendar`,
  `/conferences`, and `/meetups` are an **anti-reference**, not a pattern: a site about a
  specific local community must not be illustrated with a stranger's stock beach. There is
  now a real archive to replace them from — the excuse is gone.
- **Don't** publish an event photo without its credit, and don't pull straight from the
  untracked archive on the assumption that anything in it is cleared. Uncredited or
  uncleared is the same as unusable.
- **Don't** reproduce the pre-token component style. `Card.astro`, `FeatureCard.astro`,
  `StatCard.astro`, `SectionDivider.astro`, and `NewsletterSignup.astro` still use 8–12px
  radii, generic `0 4px 6px rgba(0,0,0,0.1)` black shadows, and — in NewsletterSignup — a
  `system-ui` font stack and a hardcoded `rgba(0,149,255,.15)` focus ring that isn't tide.
  These are **drift to be migrated**, not precedent. New work follows the coastal system.
- **Don't** let a component reset the font stack to `system-ui` or a native stack.
- **Don't** use neutral grey or black borders and shadows anywhere.
- **Don't** put white text on coral at body size.
- **Don't** hand-author a category color, or vary lightness and chroma between categories.
- **Don't** give a resting shadow to something clickable, or a shadow at all to something
  that isn't interactive and isn't a container.
- **Don't** add a fixed-column grid with breakpoint overrides where `auto-fill` +
  `minmax()` would do.
- **Don't** scope landing calendar styles to a component. The week and month views build
  their DOM at runtime, and Astro's scoped-style hashing only tags build-time elements —
  that CSS must stay global in `landing.css`.
- **Don't** use a middle radius on a control. Controls are pills; there is no 8px button.
