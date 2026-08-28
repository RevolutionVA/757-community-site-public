# Newsletter & Social

## Weekly announcements

Authoritative templates: `CLAUDE.md` (root) → "Weekly Meetups Announcement Template". Full workflow: `.claude/skills/weekly-meetups/SKILL.md` (invoke via the `weekly-meetups` skill).

Three phases: **pull calendar → verify every Meetup link live → generate outputs** for Slack, Discord, LinkedIn, X, Bluesky, Threads, Instagram, email. Hard rules:
- Never publish an event not verified against its live Meetup page (not 404, not cancelled, title/date/time match semantically).
- **Never include an event count** in any header, subject, or cover slide.
- Deliver outputs as chat copy-paste blocks; the maintainer posts them manually.
- Source of truth for generation is `weekly-meetups/<monday>-weekly-meetups-slack.txt` (day headings are full day names; each event is 3 lines with a leading-zero time and a ` (Event Link)` suffix to strip). The year comes from the filename.
- LinkedIn renders no markdown — emoji + line breaks only; preferred variant keeps links out of the post body and puts them in the first comment.

Handles: X `@757techorg`, Threads `@757techorg`, Instagram `@757techorg`, Bluesky `@757tech.org` (the odd one out — domain handle).

## Bento email broadcasts

`scripts/create-bento-broadcast.js` (and `create-monthly-broadcast.js`) build the HTML broadcast and POST it to Bento as a draft; sending is done from the Bento dashboard.

```
op run --account revolutionva.1password.com --env-file .env -- \
  node scripts/create-bento-broadcast.js <slack.txt> [--exclude <url-substring>]... \
    [--preheader <text>] [--greeting <html>] [--html-out <file>] [--dry-run]
```

- Secrets are **1Password `op://` references only** (`.env.example` → copy to gitignored `.env`); item "Bento - RevolutionVA", Employee vault, `revolutionva.1password.com`. Never write raw keys to disk.
- `--dry-run` needs no credentials; `--html-out` renders for browser preview.
- Sender `newsletter@revolutionva.org` / `757tech`; segment `33230` ("757Tech Weekly Subscribed").
- `src/data/newsletter-recap.json` supplies the recap block and never auto-updates — confirm it describes *last* week before drafting, and never invent an organizer quote.
- Site-side tracking/signup: `BentoTracking.astro`, `NewsletterSignup.astro`, `/newsletter-thank-you` (noindex).

## Assets

`social/` holds backgrounds, logos, event photos, exports, newsletter assets. Carousel slides come from `npm run generate-carousel`. Compress images before committing — GitHub's 100 MB limit has been hit here before.
