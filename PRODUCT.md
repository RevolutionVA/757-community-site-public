# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: the curious newcomer.** Someone new to Hampton Roads, new to tech, or newly
looking to plug in. They do not know which groups exist, which are alive, or which are for
them. Their job on this site is narrow and immediate: **"find one thing worth going to this
week."** Every design decision resolves in their favor when audiences conflict.

Other people demonstrably use the site — regular attendees scanning the full calendar,
group organizers wanting reach, employers gauging the scene — but they are served, not
optimized for. Nothing should be built *primarily* for them without revisiting this record.

## Product Purpose

757tech.org is the single front door to tech in Hampton Roads (the "757" — Norfolk,
Virginia Beach, Chesapeake, Hampton, Newport News and surrounding cities). It aggregates
every tech meetup, user group, and regional conference in the region into one continuously
refreshed calendar, then redistributes that calendar as a Monday digest and a weekly
multi-channel announcement packet.

**Success is digest subscribers.** A good month is one where the Monday newsletter list
grew. The site is the acquisition surface for that list; the calendar is the reason anyone
hands over an email address.

## Positioning

Two things a neighboring site could not truthfully copy:

1. **Automated aggregation plus human verification.** Events are pulled from 20 groups'
   Meetup RSS feeds every six hours, deduplicated across groups, and checked for
   staleness — then a human confirms each event is still live before it goes into the
   weekly announcements. Neither a pure scraper nor a hand-maintained list produces this.
2. **Platform-agnostic scope.** The calendar spans Meetup.com groups, independent regional
   conferences, Slack, and Discord. No single event platform's directory covers the region
   the way this does, because no platform can see the others.

Supporting position: it is community infrastructure, not a business — supported by
RevolutionVA, a 501(c)(3) non-profit, and built by community members.

## Operating Context

- **The six-hour loop.** A GitHub Action refreshes `calendar-events.json` from Meetup RSS
  feeds four times a day. A scheduled rebuild keeps build-time date math current.
- **The Monday ritual.** Each Monday a weekly report is generated, every event link is
  opened and verified as still active and correctly titled/timed, and the confirmed set is
  published as a Bento digest plus Slack, Discord, LinkedIn, X, and Instagram carousel
  variants. Verification gates publication — an unverified event does not ship.
- **Growth by contribution.** New groups enter through `meetups-combined.json` (schema
  validated, `add-meetup` script) prompted by a submit CTA on the landing page.
- **Archive.** Past weeks remain browsable; the current week has its own surface.

## Capabilities and Constraints

- Static Astro build, no server and no database. All content lives in JSON data files
  under `src/data/`, validated against JSON Schema on commit and in CI.
- Because the site is statically generated, "today" is resolved at build time. Freshness
  depends on the scheduled rebuild, not on the visitor's clock.
- Group categories are a fixed set of four: Technology, Development, Cloud, Design.
- The newsletter is hosted by Bento. The hero form posts directly to a Bento endpoint and
  redirects to `/newsletter-thank-you`.
- Every event and group link is outbound to its source (Meetup, conference site). The site
  never owns RSVP, ticketing, or attendance data and should not appear to.
- **Confirmed decision: `/work`, `/learning`, and `/communities` are vestigial and will be
  retired.** All three run on hardcoded placeholder arrays that were never wired to real
  data; they dilute the site's actual job. *Undecided:* whether each is deleted or
  redirected, and where any surviving content lands. **Hard constraint on that removal:**
  the 757dev Slack and Discord entry points currently living on `/communities` must remain
  reachable elsewhere (they exist today in the footer and on `/get-involved`) — retiring
  the page must not remove the community's front doors.

## Brand Commitments

- **Name:** 757tech / 757tech.org. The region is referred to as "the 757" and as Hampton
  Roads.
- **Voice:** coastal and tidal, warm and plainspoken. Established in live copy: "The front
  door to tech in the 757", "in one tide", "Keep Surfing", wave dividers between sections.
  This metaphor is in use and is a commitment, not a suggestion.
- **Assets:** logo at `public/images/757tech-logo.png`; cached per-group images under
  `public/images/meetups/`.
- **Attribution, required in the footer:** "Supported by RevolutionVA, a 501(c)(3)
  non-profit — built by the community, for the community," crediting Ted Patterson and
  Kevin Griffin.
- **Handles:** `@757techorg` on X, Instagram, and Threads; `@757tech.org` on Bluesky;
  `757tech` on LinkedIn; the 757dev Slack workspace and Discord server.

## Evidence on Hand

Real, in-repo, usable:

- 20 meetup groups with tags, categories, RSS feeds, and cached images
  (`src/data/meetups-combined.json`)
- 11 conferences (`src/data/conferences.json`)
- 54 calendar events, refreshed automatically (`src/data/calendar-events.json`)
- Generated weekly announcement archives (`weekly-meetups/`) and a browsable weekly archive
- A weekly social carousel generator (`scripts/generate-weekly-carousel.js`)

**Absences future work must not fabricate:** there are no testimonials, no attendance
figures, no publishable subscriber count, no sponsors, no pricing, and no employer
endorsements. Do not invent social proof for this site. If a number is needed, it must be
sourced and confirmed first.

## Product Principles

1. **Answer "what can I go to this week?" before anything else.** The newcomer's first
   question outranks completeness, navigation, and brand expression on every surface.
2. **Every surface earns the subscription.** Success is measured in digest subscribers, so
   no page is a dead end — the path to the Monday digest is always available and never
   nagging.
3. **Completeness is the credibility.** A dead link or a cancelled event costs more trust
   than a missing feature gains. Verification is a product feature, not overhead.
4. **Always link out; never impersonate the source.** This is a front door, not a walled
   garden. Groups keep their identity and their traffic.
5. **Automation proposes, humans verify.** Nothing reaches the community — site or social
   — on automation's word alone.

## Accessibility & Inclusion

No product-specific standard has been established. The codebase shows general good
practice (form `aria-label`s, focus management, `oklch` color with fallbacks) but this is
convention, not a stated requirement. *Undecided:* whether to formally commit to WCAG 2.2
AA.
