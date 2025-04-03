/**
 * Script to fix calendar duplicates caused by timezone issues
 * This script reads the calendar-events.json file, identifies duplicate events
 * that have the same title and date (with different times due to timezone issues),
 * and keeps only one entry for each duplicate.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the calendar events JSON file
const CALENDAR_FILE_PATH = path.join(__dirname, '..', 'src', 'data', 'calendar-events.json');

console.log('Starting calendar timezone fix process...');

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
  
  // Group events by title, date (ignoring time), and group name
  const eventGroups = new Map();
  
  // First, group all events by their key (title + date + group)
  for (const event of events) {
    // Parse date and extract just the date part (ignoring time)
    const dateObj = new Date(event.date);
    const datePart = dateObj.toISOString().split('T')[0];
    
    // Create a key from title, date part, and group
    const key = `${event.title}|${datePart}|${event.group}`;
    
    if (!eventGroups.has(key)) {
      eventGroups.set(key, []);
    }
    
    eventGroups.get(key).push({
      event,
      dateObj
    });
  }
  
  // Find groups with multiple events (duplicates)
  const duplicateGroups = [];
  
  for (const [key, group] of eventGroups.entries()) {
    if (group.length > 1) {
      duplicateGroups.push({
        key,
        events: group
      });
    }
  }
  
  console.log(`Found ${duplicateGroups.length} groups of duplicate events`);
  
  // Filter out duplicates, keeping only one event from each group
  // (preferably the one with the earliest time in the day)
  let fixedEvents = [];
  
  for (const [key, group] of eventGroups.entries()) {
    if (group.length === 1) {
      // No duplicates, keep the event
      fixedEvents.push(group[0].event);
    } else {
      // Sort by time and keep the earliest
      group.sort((a, b) => a.dateObj - b.dateObj);
      const keptEvent = group[0].event;
      
      console.log(`Fixing duplicate group: ${key}`);
      console.log(`  Keeping: ${keptEvent.date}`);
      console.log(`  Removed times:`);
      
      for (let i = 1; i < group.length; i++) {
        console.log(`    - ${group[i].event.date}`);
      }
      
      fixedEvents.push(keptEvent);
    }
  }
  
  // Sort events by date
  fixedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Calculate how many duplicates were removed
  const removedCount = events.length - fixedEvents.length;
  console.log(`Fixed ${removedCount} duplicate events`);
  
  if (removedCount > 0) {
    // Make a backup of the original file
    const backupPath = `${CALENDAR_FILE_PATH}.bak`;
    fs.copyFileSync(CALENDAR_FILE_PATH, backupPath);
    console.log(`Backup created at ${backupPath}`);
    
    // Write the fixed events back to the file
    fs.writeFileSync(CALENDAR_FILE_PATH, JSON.stringify(fixedEvents, null, 2));
    
    console.log(`Successfully fixed calendar. New count: ${fixedEvents.length} events (removed ${removedCount} duplicates)`);
  } else {
    console.log('No duplicates to fix');
  }
  
} catch (error) {
  console.error(`Error fixing calendar duplicates: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
} 