/**
 * Script to update calendar events as content collection markdown files
 * This script fetches events from RSS feeds and creates/updates markdown files in src/content/events/
 *
 * Behavior:
 * - New events: Creates markdown files, commits directly to main
 * - Updated events (date/title changed): Deletes old file, creates new file, opens PR
 * - Deleted events (no longer in RSS): Opens PR to delete file
 *
 * This is designed to be run by a GitHub Action periodically
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEETUPS_PATH = path.join(__dirname, '..', 'src', 'data', 'meetups-combined.json');
const EVENTS_DIR = path.join(__dirname, '..', 'src', 'content', 'events');
const MEETUPS_DIR = path.join(__dirname, '..', 'src', 'content', 'meetups');

// Create RSS parser
const parser = new Parser({
  customFields: {
    item: [
      ['meetup:startTime', 'startTime'],
      ['meetup:endTime', 'endTime'],
      ['pubDate', 'pubDate'],
      ['dc:date', 'dcDate'],
    ],
  },
});

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const LOG_LEVEL = process.env.LOG_LEVEL ? LOG_LEVELS[process.env.LOG_LEVEL] : LOG_LEVELS.INFO;

function log(message, level = LOG_LEVELS.INFO) {
  if (level >= LOG_LEVEL) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
    console.log(`[${timestamp}] [${levelName}] ${message}`);
  }
}

/**
 * Generate URL-safe slug from text
 */
function slugify(text, maxLength = 50) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, maxLength);
}

/**
 * Extract Meetup.com event ID from URL
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
 * Format date for filename (YYYY-MM-DD)
 */
function formatDateForFilename(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time for slug collision resolution
 */
function formatTimeForSlug(dateString) {
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}${minutes}`;
}

/**
 * Escape YAML special characters
 */
function escapeYaml(str) {
  if (!str) return '';
  // Always quote strings with special characters, multiline content, or backslashes
  if (str.includes('\n') || str.includes(':') || str.includes('#') || str.includes('|') || str.includes('>') || str.includes('\\')) {
    // Escape backslashes first, then quotes, then newlines
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  }
  return str;
}

/**
 * Create frontmatter for markdown file
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
 * Read all existing event files and build a map of sourceId → filename
 */
function buildExistingEventsMap() {
  const eventsMap = new Map(); // sourceId → { filename, frontmatter }

  if (!fs.existsSync(EVENTS_DIR)) {
    fs.mkdirSync(EVENTS_DIR, { recursive: true });
    return eventsMap;
  }

  const files = fs.readdirSync(EVENTS_DIR).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filepath = path.join(EVENTS_DIR, file);
    const content = fs.readFileSync(filepath, 'utf-8');

    // Extract frontmatter
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (match) {
      const frontmatter = match[1];
      const sourceIdMatch = frontmatter.match(/sourceId:\s*["']?(\d+)["']?/);

      if (sourceIdMatch) {
        const sourceId = sourceIdMatch[1];
        eventsMap.set(sourceId, { filename: file, filepath, content });
      }
    }
  }

  log(`Found ${eventsMap.size} existing events with sourceId`, LOG_LEVELS.INFO);
  return eventsMap;
}

/**
 * Parse date from various formats (simplified version from original script)
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    return null;
  } catch (error) {
    log(`Error parsing date ${dateStr}: ${error.message}`, LOG_LEVELS.ERROR);
    return null;
  }
}

/**
 * Clean description (simplified version)
 */
function cleanDescription(description) {
  if (!description) return '';

  let cleaned = description
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<\/?[^>]+(>|$)/g, '');

  return cleaned.trim().replace(/\n{3,}/g, '\n\n');
}

/**
 * Fetch events from meetup RSS feed
 */
async function fetchMeetupEvents(meetup) {
  try {
    if (!meetup.rssFeed) {
      log(`No RSS feed for ${meetup.name}`, LOG_LEVELS.WARN);
      return [];
    }

    log(`Fetching events for ${meetup.name}`, LOG_LEVELS.INFO);

    const feed = await parser.parseURL(meetup.rssFeed);
    const events = [];
    const now = new Date();

    for (const item of feed.items || []) {
      const date = parseDate(item.isoDate || item.pubDate);

      if (!date || date < now) continue;

      const title = item.title ? item.title.trim() : '';
      const description = cleanDescription(item.description || '');
      const sourceId = extractMeetupEventId(item.link);

      events.push({
        title,
        description,
        startDate: date.toISOString(),
        sourceUrl: item.link,
        sourceId,
        source: 'meetup',
        group: meetup.name,
      });
    }

    log(`Fetched ${events.length} events for ${meetup.name}`, LOG_LEVELS.INFO);
    return events;
  } catch (error) {
    log(`Error fetching events for ${meetup.name}: ${error.message}`, LOG_LEVELS.ERROR);
    return [];
  }
}

/**
 * Create or update event markdown file
 * Returns: { action: 'created'|'updated'|'unchanged', filename }
 */
function createOrUpdateEventFile(event, existingMap) {
  const datePrefix = formatDateForFilename(event.startDate);
  let slug = slugify(event.title);
  let filename = `${datePrefix}-${slug}.md`;
  const filepath = path.join(EVENTS_DIR, filename);

  // Check for filename collision
  if (fs.existsSync(filepath) && !existingMap.has(event.sourceId)) {
    const time = formatTimeForSlug(event.startDate);
    filename = `${datePrefix}-${slug}-${time}.md`;
  }

  const frontmatter = createFrontmatter({
    title: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    sourceUrl: event.sourceUrl,
    sourceId: event.sourceId,
    source: event.source,
    group: event.group,
    tags: event.tags,
    category: event.category,
    image: event.image,
    cancelled: false,
    featured: false,
  });

  const content = `${frontmatter}\n\n${event.description || 'No description available.'}\n`;

  // Check if this event already exists (by sourceId)
  if (event.sourceId && existingMap.has(event.sourceId)) {
    const existing = existingMap.get(event.sourceId);

    // Compare content to detect changes
    if (existing.content.trim() === content.trim()) {
      return { action: 'unchanged', filename: existing.filename };
    }

    // If filename changed (date or title changed), this is an update requiring PR
    if (existing.filename !== filename) {
      return {
        action: 'updated',
        oldFilename: existing.filename,
        newFilename: filename,
        oldFilepath: existing.filepath,
        newFilepath: path.join(EVENTS_DIR, filename),
        content,
      };
    }

    // Content changed but filename same - update in place
    fs.writeFileSync(existing.filepath, content, 'utf-8');
    return { action: 'updated', filename: existing.filename };
  }

  // New event - create file
  fs.writeFileSync(path.join(EVENTS_DIR, filename), content, 'utf-8');
  return { action: 'created', filename };
}

/**
 * Main function
 */
async function main() {
  try {
    log('Starting calendar update', LOG_LEVELS.INFO);

    // Read meetups
    const meetupsData = JSON.parse(fs.readFileSync(MEETUPS_PATH, 'utf-8'));
    const meetupsWithRss = meetupsData.filter(m => m.rssFeed);

    log(`Processing ${meetupsWithRss.length} meetups`, LOG_LEVELS.INFO);

    // Build map of existing events
    const existingEventsMap = buildExistingEventsMap();

    // Fetch all events
    const allNewEvents = [];
    for (const meetup of meetupsWithRss) {
      const events = await fetchMeetupEvents(meetup);
      allNewEvents.push(...events);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    log(`Fetched ${allNewEvents.length} total events from RSS`, LOG_LEVELS.INFO);

    // Process events
    const stats = { created: 0, updated: 0, unchanged: 0 };
    const updatedFiles = []; // Files that need PR

    const processedSourceIds = new Set();

    for (const event of allNewEvents) {
      if (!event.sourceId) continue; // Skip events without sourceId

      processedSourceIds.add(event.sourceId);

      const result = createOrUpdateEventFile(event, existingEventsMap);

      if (result.action === 'created') {
        stats.created++;
        log(`Created: ${result.filename}`, LOG_LEVELS.INFO);
      } else if (result.action === 'updated') {
        stats.updated++;
        if (result.oldFilename && result.newFilename) {
          updatedFiles.push(result);
          log(`Updated (needs PR): ${result.oldFilename} → ${result.newFilename}`, LOG_LEVELS.INFO);
        } else {
          log(`Updated: ${result.filename}`, LOG_LEVELS.INFO);
        }
      } else {
        stats.unchanged++;
      }
    }

    // Detect deleted events (exist in map but not in processed)
    const deletedEvents = [];
    for (const [sourceId, info] of existingEventsMap.entries()) {
      if (!processedSourceIds.has(sourceId)) {
        deletedEvents.push(info);
        log(`Deleted (needs PR): ${info.filename}`, LOG_LEVELS.INFO);
      }
    }

    log(`\nSummary:`, LOG_LEVELS.INFO);
    log(`  Created: ${stats.created}`, LOG_LEVELS.INFO);
    log(`  Updated: ${stats.updated}`, LOG_LEVELS.INFO);
    log(`  Unchanged: ${stats.unchanged}`, LOG_LEVELS.INFO);
    log(`  Deleted: ${deletedEvents.length}`, LOG_LEVELS.INFO);

    // Handle PR creation for updates/deletes
    if (updatedFiles.length > 0 || deletedEvents.length > 0) {
      log('\nChanges requiring PR detected:', LOG_LEVELS.INFO);

      // In GitHub Actions, create PR
      if (process.env.GITHUB_ACTIONS) {
        await createPRForChanges(updatedFiles, deletedEvents);
      } else {
        log('Not in GitHub Actions - skipping PR creation', LOG_LEVELS.WARN);
        log('Updated files:', LOG_LEVELS.INFO);
        updatedFiles.forEach(f => log(`  ${f.oldFilename} → ${f.newFilename}`, LOG_LEVELS.INFO));
        log('Deleted files:', LOG_LEVELS.INFO);
        deletedEvents.forEach(f => log(`  ${f.filename}`, LOG_LEVELS.INFO));
      }
    }

    log('\nCalendar update completed', LOG_LEVELS.INFO);
  } catch (error) {
    log(`Error: ${error.message}`, LOG_LEVELS.ERROR);
    if (error.stack) log(error.stack, LOG_LEVELS.DEBUG);
    process.exit(1);
  }
}

/**
 * Create PR for event updates/deletions
 */
async function createPRForChanges(updatedFiles, deletedEvents) {
  try {
    const branchName = `calendar-updates-${Date.now()}`;

    // Configure git if needed
    try {
      execSync('git config user.email "actions@github.com"');
      execSync('git config user.name "GitHub Actions Bot"');
    } catch (err) {
      log('Git already configured', LOG_LEVELS.DEBUG);
    }

    log(`Creating branch: ${branchName}`, LOG_LEVELS.INFO);
    execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });

    // Handle updated files (delete old, add new)
    for (const update of updatedFiles) {
      if (update.oldFilepath && update.newFilepath) {
        fs.unlinkSync(update.oldFilepath);
        fs.writeFileSync(update.newFilepath, update.content, 'utf-8');
        execSync(`git add "${update.oldFilepath}"`);
        execSync(`git add "${update.newFilepath}"`);
      }
    }

    // Handle deleted files
    for (const deleted of deletedEvents) {
      fs.unlinkSync(deleted.filepath);
      execSync(`git add "${deleted.filepath}"`);
    }

    // Commit and push
    const commitMsg = `Update calendar: ${updatedFiles.length} updated, ${deletedEvents.length} deleted`;
    execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
    execSync(`git push origin ${branchName}`, { stdio: 'inherit' });

    // Create PR using gh CLI
    const updatedList = updatedFiles.length > 0
      ? '### Updated Events\\n' + updatedFiles.map(f => `- ${f.oldFilename} → ${f.newFilename}`).join('\\n')
      : '';

    const deletedList = deletedEvents.length > 0
      ? '\\n### Deleted Events\\n' + deletedEvents.map(f => `- ${f.filename}`).join('\\n')
      : '';

    const prBody = `## Calendar Event Updates

- **Updated**: ${updatedFiles.length} events
- **Deleted**: ${deletedEvents.length} events

${updatedList}${deletedList}

🤖 Generated by calendar update automation`;

    // Write PR body to file to avoid shell escaping issues
    const prBodyFile = path.join(__dirname, '.pr-body.txt');
    fs.writeFileSync(prBodyFile, prBody, 'utf-8');

    execSync(`gh pr create --title "${commitMsg}" --body-file "${prBodyFile}"`, { stdio: 'inherit' });

    // Clean up temp file
    fs.unlinkSync(prBodyFile);

    log('PR created successfully', LOG_LEVELS.INFO);
  } catch (error) {
    log(`Error creating PR: ${error.message}`, LOG_LEVELS.ERROR);
    // Don't throw - we still want new events to be committed even if PR fails
  }
}

main();
