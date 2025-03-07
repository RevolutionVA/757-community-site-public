/**
 * Script to update the calendar events JSON file
 * This script fetches events from various sources and updates the calendar-events.json file
 * It is designed to be run by a GitHub Action every 3 hours
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the calendar events JSON file
const CALENDAR_FILE_PATH = path.join(__dirname, '..', 'src', 'data', 'calendar-events.json');
// Path to the meetup feeds JSON file
const MEETUP_FEEDS_PATH = path.join(__dirname, '..', 'src', 'data', 'meetup-feeds.json');

// Flag to use mock data if no real events are found
const USE_MOCK_DATA_IF_EMPTY = false;

// Create a new RSS parser instance with custom fields
const parser = new Parser({
  customFields: {
    item: [
      ['meetup:startTime', 'startTime'],
      ['meetup:endTime', 'endTime'],
      ['pubDate', 'pubDate'],
      ['dc:date', 'dcDate']
    ]
  }
});

// Configure logging
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const LOG_LEVEL = process.env.LOG_LEVEL ? LOG_LEVELS[process.env.LOG_LEVEL] : LOG_LEVELS.INFO;

// Add a simple rate limiter
const rateLimiter = {
  lastRequestTime: 0,
  minDelay: 1000, // Minimum delay between requests in milliseconds
  
  /**
   * Wait if needed to respect rate limits
   * @returns {Promise<void>} - A promise that resolves when it's safe to make the next request
   */
  async wait() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minDelay) {
      const delay = this.minDelay - timeSinceLastRequest;
      log(`Rate limiting: waiting ${delay}ms before next request`, LOG_LEVELS.DEBUG);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }
};

/**
 * Logs a message with the specified level
 * @param {string} message - The message to log
 * @param {number} level - The log level
 */
function log(message, level = LOG_LEVELS.INFO) {
  if (level >= LOG_LEVEL) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
    
    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(`[${timestamp}] [${levelName}] ${message}`);
        break;
      case LOG_LEVELS.WARN:
        console.warn(`[${timestamp}] [${levelName}] ${message}`);
        break;
      case LOG_LEVELS.DEBUG:
        console.debug(`[${timestamp}] [${levelName}] ${message}`);
        break;
      default:
        console.log(`[${timestamp}] [${levelName}] ${message}`);
    }
  }
}

/**
 * Parses a date string from various formats
 * @param {string} dateStr - The date string to parse
 * @returns {Date|null} - The parsed date or null if parsing failed
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Try parsing as ISO date
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      log(`Successfully parsed date: ${dateStr} -> ${date.toISOString()}`, LOG_LEVELS.DEBUG);
      return date;
    }
    
    // Try parsing other formats
    // Example: "Monday, March 11, 2024 at 6:30 PM"
    const meetupDateRegex = /(\w+), (\w+) (\d+), (\d+) at (\d+):(\d+) (AM|PM)/;
    const match = dateStr.match(meetupDateRegex);
    
    if (match) {
      const [_, dayOfWeek, month, day, year, hour, minute, ampm] = match;
      const months = {
        January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
        July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
      };
      
      let hours = parseInt(hour, 10);
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      const parsedDate = new Date(
        parseInt(year, 10),
        months[month],
        parseInt(day, 10),
        hours,
        parseInt(minute, 10)
      );
      
      if (!isNaN(parsedDate.getTime())) {
        log(`Successfully parsed date using regex: ${dateStr} -> ${parsedDate.toISOString()}`, LOG_LEVELS.DEBUG);
        return parsedDate;
      }
    }
    
    log(`Failed to parse date: ${dateStr}`, LOG_LEVELS.WARN);
    return null;
  } catch (error) {
    log(`Error parsing date ${dateStr}: ${error.message}`, LOG_LEVELS.ERROR);
    return null;
  }
}

/**
 * Extracts event date from Meetup event page JSON-LD data
 * @param {string} eventUrl - The URL of the Meetup event
 * @returns {Promise<Date|null>} - A promise that resolves to the event date or null if extraction failed
 */
async function extractEventDateFromEventPage(eventUrl) {
  try {
    log(`Fetching event page for date extraction: ${eventUrl}`, LOG_LEVELS.DEBUG);
    
    // Fetch the event page HTML
    const html = await fetchUrl(eventUrl);
    
    // Extract JSON-LD data from the page
    const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
    const matches = [...html.matchAll(jsonLdRegex)];
    
    if (matches.length === 0) {
      log(`No JSON-LD data found in page: ${eventUrl}`, LOG_LEVELS.DEBUG);
      
      // Try to extract date from meta tags
      const ogStartTimeRegex = /<meta property="og:title" content="[^,]+, ([^|]+)\|/;
      const ogMatch = html.match(ogStartTimeRegex);
      
      if (ogMatch && ogMatch[1]) {
        const dateStr = ogMatch[1].trim();
        log(`Found date in meta tag: ${dateStr}`, LOG_LEVELS.DEBUG);
        
        // Parse date like "Tue, Mar 11, 2025, 6:00 PM"
        const metaDate = parseDate(dateStr);
        if (metaDate) {
          log(`Successfully extracted date from meta tag: ${metaDate.toISOString()}`, LOG_LEVELS.INFO);
          return metaDate;
        }
      }
      
      return null;
    }
    
    for (const match of matches) {
      try {
        const jsonLdString = match[1];
        const jsonLd = JSON.parse(jsonLdString);
        
        // Look for Event type JSON-LD
        if (jsonLd['@type'] === 'Event' && jsonLd.startDate) {
          log(`Found event date in JSON-LD: ${jsonLd.startDate}`, LOG_LEVELS.DEBUG);
          const eventDate = new Date(jsonLd.startDate);
          
          if (!isNaN(eventDate.getTime())) {
            log(`Successfully extracted event date from page: ${eventDate.toISOString()}`, LOG_LEVELS.INFO);
            return eventDate;
          }
        }
      } catch (jsonError) {
        log(`Error parsing JSON-LD: ${jsonError.message}`, LOG_LEVELS.DEBUG);
        // Continue to next match
      }
    }
    
    // If we get here, try to extract date from the HTML directly
    // Look for patterns like "startDate":"2025-03-11T18:00:00-04:00"
    const startDateRegex = /"startDate":"([^"]+)"/;
    const startDateMatch = html.match(startDateRegex);
    
    if (startDateMatch && startDateMatch[1]) {
      const dateStr = startDateMatch[1];
      log(`Found startDate in HTML: ${dateStr}`, LOG_LEVELS.DEBUG);
      
      const eventDate = new Date(dateStr);
      if (!isNaN(eventDate.getTime())) {
        log(`Successfully extracted date from HTML: ${eventDate.toISOString()}`, LOG_LEVELS.INFO);
        return eventDate;
      }
    }
    
    log(`No valid JSON-LD event data found in page`, LOG_LEVELS.DEBUG);
    return null;
  } catch (error) {
    log(`Error extracting date from event page: ${error.message}`, LOG_LEVELS.ERROR);
    return null;
  }
}

/**
 * Extracts the event date from a Meetup RSS item
 * @param {Object} item - The RSS item
 * @returns {Date|null} - The extracted date or null if extraction failed
 */
function extractEventDate(item) {
  // Log all available date fields for debugging
  log(`Date fields for event "${item.title}":`, LOG_LEVELS.DEBUG);
  log(`  isoDate: ${item.isoDate}`, LOG_LEVELS.DEBUG);
  log(`  pubDate: ${item.pubDate}`, LOG_LEVELS.DEBUG);
  log(`  startTime: ${item.startTime}`, LOG_LEVELS.DEBUG);
  log(`  endTime: ${item.endTime}`, LOG_LEVELS.DEBUG);
  log(`  dcDate: ${item.dcDate}`, LOG_LEVELS.DEBUG);
  
  // If we have a link to the event page, try to extract the date from there
  if (item.link) {
    // Return a promise that will be resolved later
    // This makes the function async, but that's okay since we'll await it when used
    return extractEventDateFromEventPage(item.link)
      .then(date => {
        if (date) {
          return date;
        }
        
        // If we couldn't extract the date from the event page, fall back to other methods
        return extractEventDateFromOtherSources(item);
      })
      .catch(error => {
        log(`Error in extractEventDateFromEventPage: ${error.message}`, LOG_LEVELS.ERROR);
        return extractEventDateFromOtherSources(item);
      });
  }
  
  // If we don't have a link, use other methods
  return extractEventDateFromOtherSources(item);
}

/**
 * Extract event date from other sources (description, title, etc.)
 * @param {Object} item - The RSS item
 * @returns {Date|null} - The extracted date or null if extraction failed
 */
function extractEventDateFromOtherSources(item) {
  // Special handling for Hampton Roads .NET Users Group
  if (item.link && item.link.includes('hampton-roads-net-users-group')) {
    log(`Detected Hampton Roads .NET Users Group event: ${item.title}`, LOG_LEVELS.DEBUG);
    
    // These events typically happen on the second Tuesday of the month at 6:30 PM
    // Use the pubDate to determine the next meeting date
    if (item.pubDate) {
      const pubDate = new Date(item.pubDate);
      
      if (!isNaN(pubDate.getTime())) {
        // Start with the publication month
        const eventDate = new Date(pubDate);
        
        // Move to the next month (most events are announced for the next month)
        eventDate.setMonth(eventDate.getMonth() + 1);
        
        // Set to the second Tuesday of that month
        eventDate.setDate(1); // Start with the 1st of the month
        
        // Find the first Tuesday
        while (eventDate.getDay() !== 2) { // 2 is Tuesday
          eventDate.setDate(eventDate.getDate() + 1);
        }
        
        // Move to the second Tuesday
        eventDate.setDate(eventDate.getDate() + 7);
        
        // Set time to 6:30 PM
        eventDate.setHours(18, 30, 0);
        
        log(`Created .NET Users Group event date: ${eventDate.toISOString()}`, LOG_LEVELS.DEBUG);
        return eventDate;
      }
    }
  }
  
  // First, try to extract the event date from the description
  // Many Meetup events have the date in the description
  if (item.description) {
    // Look for patterns like "Monday, March 11, 2024 at 6:30 PM"
    const dateRegex = /(\w+day), (\w+) (\d+), (\d{4}) at (\d{1,2}):(\d{2}) (AM|PM)/i;
    const match = item.description.match(dateRegex);
    
    if (match) {
      const [_, dayOfWeek, month, day, year, hour, minute, ampm] = match;
      const months = {
        January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
        July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
      };
      
      let hours = parseInt(hour, 10);
      if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
      
      const parsedDate = new Date(
        parseInt(year, 10),
        months[month],
        parseInt(day, 10),
        hours,
        parseInt(minute, 10)
      );
      
      if (!isNaN(parsedDate.getTime())) {
        log(`Extracted date from description: ${parsedDate.toISOString()}`, LOG_LEVELS.DEBUG);
        return parsedDate;
      }
    }
    
    // Try another common pattern: "March 18th, 2025 from 6:30PM - 8:30PM"
    const dateRegex2 = /(\w+) (\d+)(?:st|nd|rd|th)?, (\d{4})(?:.*?)(\d{1,2}):(\d{2})(?:PM|AM)/i;
    const match2 = item.description.match(dateRegex2);
    
    if (match2) {
      const [_, month, day, year, hour, minute] = match2;
      const months = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
      };
      
      let hours = parseInt(hour, 10);
      // Assume PM for evening events (most tech meetups are in the evening)
      if (hours < 12) hours += 12;
      
      const parsedDate = new Date(
        parseInt(year, 10),
        months[month.toLowerCase()],
        parseInt(day, 10),
        hours,
        parseInt(minute, 10)
      );
      
      if (!isNaN(parsedDate.getTime())) {
        log(`Extracted date from description using pattern 2: ${parsedDate.toISOString()}`, LOG_LEVELS.DEBUG);
        return parsedDate;
      }
    }
  }
  
  // Try to extract the date from the title
  // Example: "Thu, Mar 14, 2024 6:30 PM: Norfolk.js Meetup"
  const titleDateRegex = /^([A-Za-z]{3}), ([A-Za-z]{3}) (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2}) ([AP]M):/;
  const titleMatch = item.title.match(titleDateRegex);
  
  if (titleMatch) {
    const [_, dayOfWeek, monthStr, day, year, hour, minute, ampm] = titleMatch;
    const months = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
    };
    
    let hours = parseInt(hour, 10);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    const parsedDate = new Date(
      parseInt(year, 10),
      months[monthStr],
      parseInt(day, 10),
      hours,
      parseInt(minute, 10)
    );
    
    if (!isNaN(parsedDate.getTime())) {
      log(`Extracted date from title: ${item.title} -> ${parsedDate.toISOString()}`, LOG_LEVELS.DEBUG);
      return parsedDate;
    }
  }
  
  // For Hampton Roads .NET Users Group and similar groups, try to extract a future date
  // based on the pubDate and a reasonable assumption (next month, same day, evening time)
  if (item.pubDate) {
    const pubDate = new Date(item.pubDate);
    
    if (!isNaN(pubDate.getTime())) {
      // Create a future date based on the pubDate
      // For most tech meetups, events are typically scheduled 1-2 months in advance
      const eventDate = new Date(pubDate);
      
      // If the group name contains ".NET" or other specific keywords, adjust accordingly
      const groupName = item.link ? new URL(item.link).hostname.split('.')[0] : '';
      
      // Set the event date to be 1-2 months after the pubDate
      // This is a heuristic that works for many tech meetups
      eventDate.setMonth(eventDate.getMonth() + 2);
      
      // Set a reasonable time for the event (6:30 PM for tech meetups)
      eventDate.setHours(18, 30, 0);
      
      log(`Created future event date from pubDate for ${groupName}: ${pubDate.toISOString()} -> ${eventDate.toISOString()}`, LOG_LEVELS.DEBUG);
      return eventDate;
    }
  }
  
  // Try parsing the various date fields
  return parseDate(item.startTime) || 
         parseDate(item.isoDate) || 
         parseDate(item.pubDate) || 
         parseDate(item.dcDate);
}

/**
 * Cleans up HTML and preserves Markdown in the description
 * @param {string} description - The description to clean
 * @returns {string} - The cleaned description
 */
function cleanDescription(description) {
  if (!description) return '';
  
  // Remove CDATA markers if present
  let cleaned = description.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  
  // Replace common HTML entities
  cleaned = cleaned.replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'");
  
  // Preserve Markdown formatting
  // We don't want to strip out Markdown syntax like **, #, etc.
  
  // Remove HTML tags but preserve the content
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n')  // Replace <br> with newlines
                  .replace(/<p>([\s\S]*?)<\/p>/gi, '$1\n\n')  // Replace <p> with content and newlines
                  .replace(/<\/?\w+(?:\s+[\w\-.:]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[\w\-.:]+))?)*\s*\/?>/g, ''); // Remove other HTML tags
  
  // Trim whitespace and normalize newlines
  cleaned = cleaned.trim().replace(/\n{3,}/g, '\n\n');
  
  return cleaned;
}

/**
 * Fetches data from a URL and returns the response as a string
 * @param {string} url - The URL to fetch
 * @returns {Promise<string>} - The response as a string
 */
async function fetchUrl(url) {
  log(`Fetching URL: ${url}`, LOG_LEVELS.DEBUG);
  
  // Wait for rate limiter
  await rateLimiter.wait();
  
  return new Promise((resolve, reject) => {
    // Add a timeout to prevent hanging connections
    const timeout = setTimeout(() => {
      log(`Request timed out for URL: ${url}`, LOG_LEVELS.ERROR);
      reject(new Error(`Request timed out for URL: ${url}`));
    }, 15000); // 15 second timeout
    
    const req = https.get(url, (res) => {
      const { statusCode } = res;
      
      if (statusCode !== 200) {
        const error = new Error(`Status code ${statusCode}`);
        log(`HTTP error: ${error.message} for URL: ${url}`, LOG_LEVELS.ERROR);
        res.resume(); // Consume response to free up memory
        clearTimeout(timeout);
        reject(error);
        return;
      }
      
      res.setEncoding('utf8');
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        log(`Successfully fetched data from ${url}`, LOG_LEVELS.DEBUG);
        clearTimeout(timeout);
        resolve(data);
      });
    });
    
    req.on('error', (err) => {
      log(`Network error: ${err.message} for URL: ${url}`, LOG_LEVELS.ERROR);
      clearTimeout(timeout);
      reject(err);
    });
    
    req.end();
  });
}

/**
 * Fetches events from a Meetup RSS feed
 * @param {Object} meetup - The meetup object with name and rssFeed properties
 * @returns {Promise<Array>} - A promise that resolves to an array of events
 */
async function fetchMeetupEvents(meetup) {
  try {
    log(`Fetching events for ${meetup.name} from ${meetup.rssFeed}`, LOG_LEVELS.INFO);
    
    // Add a timeout to the parser.parseURL call
    const feedPromise = parser.parseURL(meetup.rssFeed);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('RSS parsing timed out')), 10000); // 10 second timeout
    });
    
    // Race the feed parsing against the timeout
    const feed = await Promise.race([feedPromise, timeoutPromise])
      .catch(error => {
        log(`Error parsing RSS feed for ${meetup.name}: ${error.message}`, LOG_LEVELS.ERROR);
        return { items: [] };
      });
    
    log(`Found ${feed.items?.length || 0} events for ${meetup.name}`, LOG_LEVELS.INFO);
    
    if (!feed.items || feed.items.length === 0) {
      return [];
    }
    
    // Log the first item for debugging
    if (feed.items.length > 0) {
      log(`Sample item for ${meetup.name}:`, LOG_LEVELS.DEBUG);
      log(JSON.stringify(feed.items[0], null, 2), LOG_LEVELS.DEBUG);
    }
    
    // Map the feed items to our event format
    const events = [];
    
    // Process items sequentially to avoid too many concurrent requests
    for (const item of feed.items) {
      try {
        // Extract the event date - this is now async
        const date = await extractEventDate(item);
        
        if (!date) {
          log(`Could not extract date for event: ${item.title}`, LOG_LEVELS.WARN);
          continue;
        }
        
        // Check if the event is in the future
        const now = new Date();
        if (date < now) {
          log(`Skipping past event: ${item.title} on ${date.toISOString()}`, LOG_LEVELS.DEBUG);
          continue;
        }
        
        // Clean up the title
        let title = item.title || '';
        
        // The RSS parser should have already handled CDATA, but just in case:
        // If the title contains CDATA markers, extract the content
        if (title.includes('CDATA')) {
          const cdataMatch = title.match(/<!\[CDATA\[(.*?)\]\]>/);
          if (cdataMatch && cdataMatch[1]) {
            title = cdataMatch[1];
          }
        }
        
        // Remove any leading/trailing whitespace
        title = title.trim();
        
        // Clean up the description, preserving Markdown
        const description = cleanDescription(item.description || item.contentSnippet || '');
        
        // Log the original and processed title for debugging
        log(`Original title: "${item.title}"`, LOG_LEVELS.DEBUG);
        log(`Processed title: "${title}"`, LOG_LEVELS.DEBUG);
        
        // Create the event object
        const event = {
          title: title,
          link: item.link,
          date: date.toISOString(),
          description: description,
          source: 'meetup',
          group: meetup.name
        };
        
        events.push(event);
        log(`Added event: ${event.title} on ${event.date}`, LOG_LEVELS.DEBUG);
      } catch (itemError) {
        log(`Error processing item ${item.title}: ${itemError.message}`, LOG_LEVELS.ERROR);
        // Continue with next item
      }
    }
    
    log(`Parsed ${events.length} valid future events for ${meetup.name}`, LOG_LEVELS.INFO);
    return events;
  } catch (error) {
    log(`Error fetching events for ${meetup.name}: ${error.message}`, LOG_LEVELS.ERROR);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`, LOG_LEVELS.DEBUG);
    }
    return [];
  }
}

/**
 * Creates manual test events for development
 * @returns {Array} - An array of test events
 */
function createManualTestEvents() {
  log('Creating manual test events', LOG_LEVELS.INFO);
  
  const events = [];
  const today = new Date();
  
  // Create a few test events for the next 6 months
  const groups = [
    'Norfolk.js',
    '757 Developers',
    'Hampton Roads Azure Users Group',
    '757ColorCoded',
    'Platform Engineering and DevOps - Hampton Roads'
  ];
  
  const topics = [
    'Modern Web Development with React and TypeScript',
    'Cloud Computing Best Practices',
    'Building Scalable Applications with .NET',
    'Introduction to Machine Learning',
    'DevOps Pipeline Automation'
  ];
  
  const descriptions = [
    'Join us for an in-depth discussion on modern web development techniques using React and TypeScript. We\'ll cover component architecture, state management, and performance optimization.',
    'Learn about cloud computing best practices from industry experts. Topics include security, cost optimization, and high availability architectures.',
    'This session will cover building scalable applications with .NET, including microservices architecture, performance tuning, and deployment strategies.',
    'An introduction to machine learning concepts and practical applications. No prior experience required!',
    'Automate your development pipeline with modern DevOps tools and techniques. We\'ll demonstrate CI/CD pipelines, infrastructure as code, and monitoring solutions.'
  ];
  
  // Create one event per month for the next 6 months
  for (let i = 0; i < 6; i++) {
    const eventDate = new Date(today);
    eventDate.setMonth(today.getMonth() + i);
    eventDate.setDate(15 + Math.floor(Math.random() * 10)); // Between 15th and 25th of the month
    eventDate.setHours(18, 30, 0); // 6:30 PM
    
    const groupIndex = i % groups.length;
    const topicIndex = i % topics.length;
    
    events.push({
      title: topics[topicIndex],
      link: `https://www.meetup.com/${groups[groupIndex].toLowerCase().replace(/\s+/g, '-')}`,
      date: eventDate.toISOString(),
      description: descriptions[topicIndex],
      source: 'manual',
      group: groups[groupIndex]
    });
  }
  
  log(`Created ${events.length} manual test events`, LOG_LEVELS.INFO);
  return events;
}

/**
 * Fetches events from all sources and returns a combined array
 * @returns {Promise<Array>} - A promise that resolves to an array of all events
 */
async function fetchAllEvents() {
  try {
    log('Starting to fetch events from all sources', LOG_LEVELS.INFO);
    
    // Check if meetup feeds file exists
    if (!fs.existsSync(MEETUP_FEEDS_PATH)) {
      throw new Error(`Meetup feeds file not found at ${MEETUP_FEEDS_PATH}`);
    }
    
    // Read the meetup feeds JSON file
    log(`Reading meetup feeds from ${MEETUP_FEEDS_PATH}`, LOG_LEVELS.DEBUG);
    const meetupFeedsData = await fs.promises.readFile(MEETUP_FEEDS_PATH, 'utf8');
    
    // Parse the JSON data
    let meetupFeeds;
    try {
      meetupFeeds = JSON.parse(meetupFeedsData);
      log(`Successfully parsed meetup feeds, found ${meetupFeeds.length} feeds`, LOG_LEVELS.INFO);
    } catch (error) {
      throw new Error(`Failed to parse meetup feeds JSON: ${error.message}`);
    }
    
    // Validate the meetup feeds data
    if (!Array.isArray(meetupFeeds)) {
      throw new Error('Meetup feeds data is not an array');
    }
    
    // Process feeds sequentially to avoid too many concurrent requests
    log(`Fetching events from ${meetupFeeds.length} meetup feeds`, LOG_LEVELS.INFO);
    const meetupEvents = [];
    
    // Process feeds in batches to avoid overwhelming the server
    const BATCH_SIZE = 3; // Process 3 feeds at a time
    
    for (let i = 0; i < meetupFeeds.length; i += BATCH_SIZE) {
      const batch = meetupFeeds.slice(i, i + BATCH_SIZE);
      log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(meetupFeeds.length / BATCH_SIZE)}`, LOG_LEVELS.DEBUG);
      
      const batchResults = await Promise.all(batch.map(feed => fetchMeetupEvents(feed)));
      batchResults.forEach(events => meetupEvents.push(...events));
      
      // Add a small delay between batches to be nice to the server
      if (i + BATCH_SIZE < meetupFeeds.length) {
        log(`Waiting before processing next batch...`, LOG_LEVELS.DEBUG);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }
    
    log(`Fetched a total of ${meetupEvents.length} events from meetup feeds`, LOG_LEVELS.INFO);
    
    // TODO: Add more sources here (e.g., Eventbrite, custom websites, etc.)
    
    // Combine all events
    let allEvents = [...meetupEvents];
    
    // If no events were found, create manual test events for development
    if (allEvents.length === 0 && USE_MOCK_DATA_IF_EMPTY) {
      log('No events found from real sources, creating manual test events', LOG_LEVELS.WARN);
      const manualEvents = createManualTestEvents();
      allEvents = [...manualEvents];
    }
    
    // Sort events by date
    const sortedEvents = allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    log(`Sorted ${sortedEvents.length} events by date`, LOG_LEVELS.DEBUG);
    
    return sortedEvents;
  } catch (error) {
    log(`Error fetching all events: ${error.message}`, LOG_LEVELS.ERROR);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`, LOG_LEVELS.DEBUG);
    }
    return [];
  }
}

/**
 * Updates the calendar events JSON file with new events
 */
async function updateCalendarEvents() {
  try {
    log('Starting calendar events update process', LOG_LEVELS.INFO);
    
    // Fetch all events
    const events = await fetchAllEvents();
    log(`Fetched ${events.length} total events`, LOG_LEVELS.INFO);
    
    // Filter out past events (should already be filtered, but just to be sure)
    const now = new Date();
    log(`Filtering events to keep only those after ${now.toISOString()}`, LOG_LEVELS.DEBUG);
    const futureEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      const isFuture = eventDate >= now;
      if (!isFuture) {
        log(`Filtering out past event: ${event.title} on ${event.date}`, LOG_LEVELS.DEBUG);
      }
      return isFuture;
    });
    log(`Found ${futureEvents.length} future events`, LOG_LEVELS.INFO);
    
    // Read the existing calendar events
    let existingEvents = [];
    try {
      if (fs.existsSync(CALENDAR_FILE_PATH)) {
        log(`Reading existing calendar events from ${CALENDAR_FILE_PATH}`, LOG_LEVELS.DEBUG);
        const existingEventsData = await fs.promises.readFile(CALENDAR_FILE_PATH, 'utf8');
        existingEvents = JSON.parse(existingEventsData);
        log(`Successfully read ${existingEvents.length} existing events`, LOG_LEVELS.INFO);
      } else {
        log(`Calendar events file does not exist at ${CALENDAR_FILE_PATH}, will create it`, LOG_LEVELS.WARN);
      }
    } catch (error) {
      log(`Could not read existing calendar events: ${error.message}, starting fresh`, LOG_LEVELS.WARN);
      if (error.stack) {
        log(`Stack trace: ${error.stack}`, LOG_LEVELS.DEBUG);
      }
    }
    
    // Merge existing events with new events, avoiding duplicates
    log('Merging existing events with new events', LOG_LEVELS.INFO);
    const mergedEvents = [...existingEvents];
    let newEventsCount = 0;
    
    // Create a map to track events by title, date, and group to avoid duplicates
    const eventMap = new Map();
    
    // First, add existing events to the map
    for (const event of existingEvents) {
      const key = `${event.title}|${event.date}|${event.group}`;
      eventMap.set(key, event);
    }
    
    // Add new events that don't already exist
    for (const newEvent of futureEvents) {
      const key = `${newEvent.title}|${newEvent.date}|${newEvent.group}`;
      
      // Check if we already have this event (by title, date, and group)
      if (!eventMap.has(key)) {
        eventMap.set(key, newEvent);
        newEventsCount++;
        log(`Adding new event: ${newEvent.title} on ${newEvent.date}`, LOG_LEVELS.DEBUG);
      }
    }
    
    // Convert the map back to an array
    const uniqueEvents = Array.from(eventMap.values());
    
    log(`Added ${newEventsCount} new events`, LOG_LEVELS.INFO);
    
    // Sort events by date
    const sortedEvents = uniqueEvents
      .filter(event => new Date(event.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    log(`Final calendar has ${sortedEvents.length} events`, LOG_LEVELS.INFO);
    
    // Create directory if it doesn't exist
    const dirPath = path.dirname(CALENDAR_FILE_PATH);
    if (!fs.existsSync(dirPath)) {
      log(`Creating directory ${dirPath}`, LOG_LEVELS.INFO);
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
    
    // Write the updated events to the calendar events JSON file
    log(`Writing updated calendar events to ${CALENDAR_FILE_PATH}`, LOG_LEVELS.INFO);
    await fs.promises.writeFile(CALENDAR_FILE_PATH, JSON.stringify(sortedEvents, null, 2));
    
    log(`Successfully updated calendar events: ${sortedEvents.length} events (${newEventsCount} new)`, LOG_LEVELS.INFO);
    
    // Print a summary of the events by month
    const eventsByMonth = {};
    for (const event of sortedEvents) {
      const date = new Date(event.date);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      if (!eventsByMonth[monthYear]) {
        eventsByMonth[monthYear] = [];
      }
      
      eventsByMonth[monthYear].push(event);
    }
    
    log('Events by month:', LOG_LEVELS.INFO);
    for (const [month, monthEvents] of Object.entries(eventsByMonth)) {
      log(`  ${month}: ${monthEvents.length} events`, LOG_LEVELS.INFO);
    }
    
    return sortedEvents;
  } catch (error) {
    log(`Error updating calendar events: ${error.message}`, LOG_LEVELS.ERROR);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`, LOG_LEVELS.DEBUG);
    }
    process.exit(1);
  }
}

// Run the update function
log('Starting calendar update script', LOG_LEVELS.INFO);
updateCalendarEvents()
  .then(() => {
    log('Calendar update completed successfully', LOG_LEVELS.INFO);
    // Explicitly exit the process after completion
    setTimeout(() => {
      process.exit(0);
    }, 1000); // Give a second for any pending logs to be written
  })
  .catch(error => {
    log(`Calendar update failed: ${error.message}`, LOG_LEVELS.ERROR);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`, LOG_LEVELS.DEBUG);
    }
    process.exit(1);
  }); 