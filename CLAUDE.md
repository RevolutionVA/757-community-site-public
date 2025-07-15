# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

All commands are run from the root directory:

- `npm install` - Install dependencies (uses Yarn as package manager)
- `npm run dev` - Start local development server
- `npm run build` - Build production site (runs `fetch-meetup-images.js` prebuild script)
- `npm run preview` - Preview production build locally
- `npm run validate` - Validate JSON data files against schemas (also runs as precommit hook)
- `npm run update-calendar` - Update calendar events from external RSS sources
- `npm run fetch-meetup-images` - Fetch and cache meetup group images
- `npm run rebuild-calendar` - Full calendar rebuild and deduplication
- `npm run deduplicate-calendar` - Remove duplicate calendar events
- `npm run fix-calendar` - Fix calendar data issues

## Architecture Overview

This is an **Astro-based static site** for the 757 Tech Community in Hampton Roads, Virginia. The site aggregates tech events, meetups, conferences, and community information.

### Key Architectural Patterns

**Data-Driven Content**: The site is built around JSON data files in `src/data/` that define:
- `meetups-combined.json` - Meetup groups with RSS feeds for automatic event fetching
- `calendar-events.json` - Aggregated events (auto-updated every 6 hours via GitHub Actions)
- `conferences.json` - Conference listings with automatic past/upcoming categorization

**Automated Event Aggregation**: GitHub Actions automatically:
- Fetch events from Meetup RSS feeds every 6 hours (`update-calendar.yml`)
- Generate weekly meetup reports every Monday (`weekly-meetups.yml`)
- Validate JSON schema on commits (`validate-json.yml`)

**Static Site Generation**: Built with Astro using:
- File-based routing in `src/pages/`
- Reusable components in `src/components/`
- Two main layouts: `Layout.astro` (basic) and `MainLayout.astro` (with SEO/social meta)

### Data Management System

**Event Sources**: Events are automatically fetched from:
- Meetup.com RSS feeds (defined in `meetups-combined.json`)
- Manual entries in `calendar-events.json`

**Schema Validation**: All JSON data is validated against schemas in `src/data/schemas/`:
- `meetups.schema.json` - Validates meetup group structure
- `conferences.schema.json` - Validates conference data

**Categories**: Meetups are organized into: Development, Technology, Design, Cloud

### Component Structure

Key reusable components:
- `MeetupImage.astro` - Handles meetup group images with fallbacks
- `UrlImage.astro` - Dynamic image loading with metadata
- `ThisWeekMeetups.astro` - Current week's events display
- `StatCard.astro` / `FeatureCard.astro` - Content cards
- `NewsletterSignup.astro` - Newsletter subscription form

### Scripts and Automation

Important utility scripts in `scripts/`:
- `update-calendar.js` - Fetches events from RSS feeds with rate limiting
- `fetch-meetup-images.js` - Downloads and caches meetup images
- `validate-json.js` - JSON schema validation
- `generate-weekly-meetups.js` - Creates weekly meetup summaries
- `deduplicate-calendar.js` - Removes duplicate events

### Site Configuration

- **Site URL**: https://757tech.org
- **Static generation**: `output: 'static'` in `astro.config.mjs`
- **SEO**: Sitemap integration with weekly updates
- **TypeScript**: Strict configuration extending Astro's defaults

### Development Guidelines

**Adding Meetup Groups**: Edit `meetups-combined.json` with group name, URL, RSS feed, tags, category, and metadata. The system will automatically fetch events.

**Adding Conferences**: Edit `conferences.json` with name, URL, description, dates, location, and tags. Past/upcoming categorization is automatic based on dates.

**Data Validation**: Always run `npm run validate` before committing. The precommit hook will enforce this.

**Image Handling**: Meetup images are automatically fetched and cached. Use `MeetupImage.astro` component for consistent display.

### Cursor Rules Integration

The project includes comprehensive Astro development guidelines in `.cursor/rules/astro.mdc` covering:
- Astro best practices and performance optimization
- Component development patterns
- Static generation and minimal JavaScript usage
- SEO and meta tag implementation
- File-based routing conventions