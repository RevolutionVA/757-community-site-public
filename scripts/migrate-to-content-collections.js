/**
 * Migration script to convert JSON data to content collections
 * Converts:
 * - meetups-combined.json → src/content/meetups/{slug}.md
 * - calendar-events.json → src/content/events/YYYY-MM-DD-{slug}.md
 * - conferences.json → src/content/events/YYYY-MM-DD-{slug}.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEETUPS_JSON = path.join(__dirname, '..', 'src', 'data', 'meetups-combined.json');
const CALENDAR_JSON = path.join(__dirname, '..', 'src', 'data', 'calendar-events.json');
const CONFERENCES_JSON = path.join(__dirname, '..', 'src', 'data', 'conferences.json');

const EVENTS_DIR = path.join(__dirname, '..', 'src', 'content', 'events');
const MEETUPS_DIR = path.join(__dirname, '..', 'src', 'content', 'meetups');

/**
 * Generate a URL-safe slug from a string
 * @param {string} text - The text to slugify
 * @param {number} maxLength - Maximum length of slug
 * @returns {string} - The slugified text
 */
function slugify(text, maxLength = 50) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '')  // Trim hyphens from start/end
    .substring(0, maxLength); // Limit length
}

/**
 * Extract Meetup.com event ID from URL
 * @param {string} url - The Meetup.com event URL
 * @returns {string|null} - The event ID or null
 */
function extractMeetupEventId(url) {
  try {
    const match = url.match(/\/events\/(\d+)/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Format a date for filename (YYYY-MM-DD)
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
function formatDateForFilename(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a time for slug collision resolution
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted time (HHmm)
 */
function formatTimeForSlug(dateString) {
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}${minutes}`;
}

/**
 * Escape YAML special characters in strings
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeYaml(str) {
  if (!str) return '';
  // If string contains special characters or backslashes, wrap in quotes and escape
  if (str.includes(':') || str.includes('#') || str.includes('|') || str.includes('>') || str.includes('\\') || str.includes('\n')) {
    // Escape backslashes first, then quotes
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  }
  return str;
}

/**
 * Create frontmatter for markdown file
 * @param {Object} data - The data object
 * @returns {string} - The frontmatter string
 */
function createFrontmatter(data) {
  const lines = ['---'];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      if (value.length > 0) {
        lines.push(`${key}:`);
        value.forEach(item => lines.push(`  - ${escapeYaml(String(item))}`));
      }
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'string') {
      lines.push(`${key}: ${escapeYaml(value)}`);
    } else if (typeof value === 'number') {
      // Convert numbers to quoted strings for sourceId field
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Migrate meetup groups to content collection
 */
function migrateMeetups() {
  console.log('Migrating meetup groups...');

  const meetupsData = JSON.parse(fs.readFileSync(MEETUPS_JSON, 'utf-8'));
  let migratedCount = 0;

  for (const meetup of meetupsData) {
    const slug = slugify(meetup.name);
    const filename = `${slug}.md`;
    const filepath = path.join(MEETUPS_DIR, filename);

    const frontmatter = createFrontmatter({
      name: meetup.name,
      url: meetup.url,
      rssFeed: meetup.rssFeed,
      tags: meetup.tags || [],
      category: meetup.category,
      image: meetup.metadata?.imageUrl || meetup.imageUrl,
      active: true,
    });

    const description = meetup.metadata?.description || meetup.description ||
                       `${meetup.name} is a ${meetup.category.toLowerCase()} community group in Hampton Roads.`;

    const content = `${frontmatter}\n\n${description}\n`;

    fs.writeFileSync(filepath, content, 'utf-8');
    migratedCount++;
    console.log(`  ✓ Created ${filename}`);
  }

  console.log(`Migrated ${migratedCount} meetup groups\n`);
}

/**
 * Migrate calendar events to content collection
 */
function migrateCalendarEvents() {
  console.log('Migrating calendar events...');

  const eventsData = JSON.parse(fs.readFileSync(CALENDAR_JSON, 'utf-8'));
  let migratedCount = 0;
  let skippedCount = 0;
  const usedFilenames = new Set();

  // Get list of existing event files
  const existingFiles = fs.existsSync(EVENTS_DIR) ?
    new Set(fs.readdirSync(EVENTS_DIR).filter(f => f.endsWith('.md'))) :
    new Set();

  for (const event of eventsData) {
    const datePrefix = formatDateForFilename(event.date);
    let slug = slugify(event.title);
    let filename = `${datePrefix}-${slug}.md`;

    // Handle filename collisions by appending time
    if (usedFilenames.has(filename) || existingFiles.has(filename)) {
      const time = formatTimeForSlug(event.date);
      filename = `${datePrefix}-${slug}-${time}.md`;
    }
    usedFilenames.add(filename);

    const filepath = path.join(EVENTS_DIR, filename);

    // Skip if file already exists
    if (existingFiles.has(filename) || fs.existsSync(filepath)) {
      skippedCount++;
      if (skippedCount <= 10) {
        console.log(`  ⏭️  Skipping ${filename} (already exists)`);
      }
      continue;
    }

    // Extract sourceId from Meetup.com URLs (as string)
    const sourceId = event.link?.includes('meetup.com') ?
                     extractMeetupEventId(event.link) : undefined;

    const frontmatter = createFrontmatter({
      title: event.title,
      description: event.description || '',
      startDate: event.date,
      endDate: event.endDate,
      location: event.location,
      sourceUrl: event.link,
      sourceId: sourceId,
      source: event.source || 'meetup',
      group: event.group,
      tags: event.tags,
      category: event.category,
      image: event.image,
      cancelled: event.cancelled || false,
      featured: event.featuredEvent || false,
    });

    const content = `${frontmatter}\n\n${event.description || 'No description available.'}\n`;

    fs.writeFileSync(filepath, content, 'utf-8');
    migratedCount++;

    if (migratedCount % 50 === 0) {
      console.log(`  ✅ Migrated ${migratedCount} events...`);
    }
  }

  console.log(`Migrated ${migratedCount} new calendar events, skipped ${skippedCount} existing\n`);
}

/**
 * Migrate conferences to content collection
 */
function migrateConferences() {
  console.log('Migrating conferences...');

  if (!fs.existsSync(CONFERENCES_JSON)) {
    console.log('  No conferences.json file found, skipping...\n');
    return;
  }

  const conferencesData = JSON.parse(fs.readFileSync(CONFERENCES_JSON, 'utf-8'));
  let migratedCount = 0;

  for (const conference of conferencesData) {
    const datePrefix = formatDateForFilename(conference.date);
    const slug = slugify(conference.name);
    const filename = `${datePrefix}-${slug}.md`;
    const filepath = path.join(EVENTS_DIR, filename);

    // Don't overwrite if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`  ⚠ Skipping ${filename} (already exists)`);
      continue;
    }

    const tags = [...(conference.tags || []), 'conference'];

    const frontmatter = createFrontmatter({
      title: conference.name,
      description: conference.description || '',
      startDate: new Date(conference.date).toISOString(),
      endDate: conference.endDate ? new Date(conference.endDate).toISOString() : undefined,
      location: conference.location,
      sourceUrl: conference.url,
      source: 'conference',
      group: 'Conferences',
      tags: tags,
      category: 'Technology',
      image: conference.coverImage,
      cancelled: false,
      featured: true,
    });

    const content = `${frontmatter}\n\n${conference.description || 'Conference details coming soon.'}\n`;

    fs.writeFileSync(filepath, content, 'utf-8');
    migratedCount++;
    console.log(`  ✓ Created ${filename}`);
  }

  console.log(`Migrated ${migratedCount} conferences\n`);
}

/**
 * Main migration function
 */
function main() {
  console.log('Starting migration to content collections...\n');

  // Ensure directories exist
  if (!fs.existsSync(EVENTS_DIR)) {
    fs.mkdirSync(EVENTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(MEETUPS_DIR)) {
    fs.mkdirSync(MEETUPS_DIR, { recursive: true });
  }

  migrateMeetups();
  migrateCalendarEvents();
  migrateConferences();

  console.log('✅ Migration complete!');
  console.log('\nNext steps:');
  console.log('1. Review the generated markdown files');
  console.log('2. Test the dynamic routes');
  console.log('3. Update the calendar page to use content collections');
}

main();
