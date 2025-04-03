/**
 * Script to deduplicate the calendar events
 * This script reads the calendar-events.json file, removes duplicate events
 * that have the same title, group, and date (ignoring time), and saves the result.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the calendar events JSON file
const CALENDAR_FILE_PATH = path.join(__dirname, '..', 'src', 'data', 'calendar-events.json');

console.log('Starting calendar deduplication process...');

// Check if the file exists
if (!fs.existsSync(CALENDAR_FILE_PATH)) {
  console.error(`Calendar events file not found at ${CALENDAR_FILE_PATH}`);
  process.exit(1);
}

try {
  // Read the file
  const fileContents = fs.readFileSync(CALENDAR_FILE_PATH, 'utf8');
  const events = JSON.parse(fileContents);
  
  console.log(`Read ${events.length} events from file`);
  
  // Map to store unique events (by title, date without time, and group)
  const uniqueEventsMap = new Map();
  const duplicatesFound = [];
  
  // Process each event
  for (const event of events) {
    // Extract date part only (ignore time)
    const dateObj = new Date(event.date);
    const datePart = dateObj.toISOString().split('T')[0];
    
    // Create a key from title, date part, and group
    const key = `${event.title}|${datePart}|${event.group}`;
    
    // If we already have this event, log it as a duplicate
    if (uniqueEventsMap.has(key)) {
      const existingEvent = uniqueEventsMap.get(key);
      duplicatesFound.push({
        key,
        originalDate: existingEvent.date,
        duplicateDate: event.date
      });
      
      // Keep the event with the earlier time if both are on the same day
      const existingDateObj = new Date(existingEvent.date);
      if (dateObj < existingDateObj) {
        uniqueEventsMap.set(key, event);
      }
    } else {
      // This is a new unique event
      uniqueEventsMap.set(key, event);
    }
  }
  
  // Convert map back to array
  const dedupedEvents = Array.from(uniqueEventsMap.values());
  
  // Sort events by date
  dedupedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Log results
  const removedCount = events.length - dedupedEvents.length;
  console.log(`Found and removed ${removedCount} duplicate events`);
  
  // Log the duplicates that were found
  if (duplicatesFound.length > 0) {
    console.log(`Duplicates found (keeping the earliest time for each):`);
    for (const dup of duplicatesFound) {
      console.log(`  ${dup.key}`);
      console.log(`    Original: ${dup.originalDate}`);
      console.log(`    Duplicate: ${dup.duplicateDate}`);
    }
  }
  
  // Make a backup of the original file
  const backupPath = `${CALENDAR_FILE_PATH}.bak`;
  fs.copyFileSync(CALENDAR_FILE_PATH, backupPath);
  console.log(`Backup created at ${backupPath}`);
  
  // Write the deduplicated events back to the file
  fs.writeFileSync(CALENDAR_FILE_PATH, JSON.stringify(dedupedEvents, null, 2));
  
  console.log(`Successfully deduplicated events. New count: ${dedupedEvents.length} events (removed ${removedCount})`);
  
} catch (error) {
  console.error(`Error deduplicating calendar events: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
} 