/**
 * Script to rebuild the calendar events
 * This script deletes the existing calendar-events.json file and then runs the update-calendar.js script
 * It also logs the current timezone information to help diagnose timezone issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the calendar events JSON file
const CALENDAR_FILE_PATH = path.join(__dirname, '..', 'src', 'data', 'calendar-events.json');

console.log('Starting calendar rebuild process...');

// Log timezone information to help diagnose issues
console.log('Timezone information:');
console.log(`  Current time: ${new Date().toISOString()}`);
console.log(`  Timezone offset: ${new Date().getTimezoneOffset() / -60} hours`);
console.log(`  Timezone name: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
console.log(`  Local time string: ${new Date().toString()}`);

// Delete the calendar events file if it exists
if (fs.existsSync(CALENDAR_FILE_PATH)) {
  console.log(`Deleting existing calendar events file at ${CALENDAR_FILE_PATH}`);
  
  // Optional: Before deletion, check for duplicates and log them
  try {
    const fileContents = fs.readFileSync(CALENDAR_FILE_PATH, 'utf8');
    const events = JSON.parse(fileContents);
    
    console.log(`Read ${events.length} events from existing file`);
    
    // Count events by title and date (ignoring exact time)
    const eventCounts = new Map();
    const dateCounts = new Map();
    
    for (const event of events) {
      // Extract date part only for comparison (ignore time)
      const dateObj = new Date(event.date);
      const datePart = dateObj.toISOString().split('T')[0];
      
      // Create a key from title and date part
      const key = `${event.title}|${datePart}|${event.group}`;
      
      // Count occurrences
      eventCounts.set(key, (eventCounts.get(key) || 0) + 1);
      
      // Count by date to detect timezone issues
      dateCounts.set(datePart, (dateCounts.get(datePart) || 0) + 1);
    }
    
    // Find duplicates
    let duplicateCount = 0;
    for (const [key, count] of eventCounts.entries()) {
      if (count > 1) {
        duplicateCount++;
        console.log(`Found ${count} duplicate entries for: ${key}`);
      }
    }
    
    // Log date distribution
    console.log('Date distribution:');
    for (const [date, count] of dateCounts.entries()) {
      if (count > 5) {
        console.log(`  ${date}: ${count} events`);
      }
    }
    
    console.log(`Found ${duplicateCount} duplicate event groups`);
  } catch (error) {
    console.error('Error analyzing existing file:', error.message);
  }
  
  // Now delete the file
  fs.unlinkSync(CALENDAR_FILE_PATH);
  console.log('File deleted successfully');
} else {
  console.log('No existing calendar events file found, proceeding to create a new one');
}

// Run the update-calendar.js script
console.log('Running the calendar update script...');
try {
  execSync('node scripts/update-calendar.js', { stdio: 'inherit' });
  
  // Verify the newly created file for duplicates
  if (fs.existsSync(CALENDAR_FILE_PATH)) {
    try {
      const fileContents = fs.readFileSync(CALENDAR_FILE_PATH, 'utf8');
      const events = JSON.parse(fileContents);
      
      console.log(`Verifying new file with ${events.length} events`);
      
      // Check for duplicates with the same title, date (ignoring time), and group
      const eventMap = new Map();
      const duplicates = [];
      let featuredCount = 0;
      
      for (const event of events) {
        // Extract date part only for comparison (ignore time)
        const dateObj = new Date(event.date);
        const datePart = dateObj.toISOString().split('T')[0];
        
        // Create a key from title and date part
        const key = `${event.title}|${datePart}|${event.group}`;
        
        // Count featured events
        if (event.featuredEvent === true) {
          featuredCount++;
        }
        
        if (eventMap.has(key)) {
          duplicates.push({
            key,
            dates: [eventMap.get(key).date, event.date]
          });
        } else {
          eventMap.set(key, event);
        }
      }
      
      console.log(`Found ${featuredCount} featured events`);
      
      if (duplicates.length > 0) {
        console.warn(`WARNING: Found ${duplicates.length} potential duplicate events in the new file:`);
        for (const dup of duplicates) {
          console.warn(`  ${dup.key} - Dates: ${dup.dates.join(', ')}`);
        }
      } else {
        console.log('No duplicates found in the new file');
      }
    } catch (error) {
      console.error('Error verifying new file:', error.message);
    }
  }
  
  console.log('Calendar rebuild completed successfully');
} catch (error) {
  console.error('Calendar update failed with error:', error.message);
  process.exit(1);
} 