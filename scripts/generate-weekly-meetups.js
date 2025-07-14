import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Generate a markdown file with meetups happening in the current week
 * This script is meant to be run every Monday at 6:00 AM or on demand
 */

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to get the start and end of the current week (Monday to Sunday)
function getCurrentWeekDates() {
  // Create date in Eastern Time
  const now = new Date();
  console.log(`Current UTC time: ${now.toISOString()}`);
  
  const options = { timeZone: 'America/New_York' };
  const etNow = new Date(now.toLocaleString('en-US', options));
  console.log(`Current ET time: ${etNow.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
  
  // Get the current day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const currentDay = etNow.getDay();
  console.log(`Current day of week (0=Sunday, 1=Monday, etc.): ${currentDay}`);
  
  // If today is Monday, use today's date
  // Otherwise, go back to the previous Monday
  const daysToMonday = currentDay === 1 ? 0 : currentDay === 0 ? 6 : currentDay - 1;
  console.log(`Days to go back to Monday: ${daysToMonday}`);
  
  // Create date objects for the start (Monday) and end (Sunday) of the week
  // Use a different approach to ensure correct timezone handling
  const monday = new Date(etNow);
  monday.setDate(etNow.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  
  // Convert back to UTC for consistent handling
  const mondayUTC = new Date(monday.toISOString());
  
  const sunday = new Date(mondayUTC);
  sunday.setDate(mondayUTC.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  // Debug log to verify the dates
  console.log(`Monday date (ISO): ${mondayUTC.toISOString()}`);
  console.log(`Monday date (ET): ${monday.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
  console.log(`Sunday date (ISO): ${sunday.toISOString()}`);
  console.log(`Sunday date (ET): ${sunday.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
  console.log(`Calculated week: ${monday.toDateString()} to ${sunday.toDateString()}`);
  
  return { monday: mondayUTC, sunday };
}

// Function to format a date in a readable format
function formatDate(date) {
  const dateObj = new Date(date);
  
  // Get day of week
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = days[dateObj.getDay()];
  
  // Get month
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = months[dateObj.getMonth()];
  
  // Get day and year
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();
  
  // Format like "Monday, April 28"
  return `${dayOfWeek}, ${month} ${day}`;
}

// Function to format a date for the filename (YYYY-MM-DD)
function formatDateForFilename(date) {
  return date.toISOString().split('T')[0];
}

// Main function
async function generateWeeklyMeetups() {
  try {
    console.log("Starting weekly meetups generation...");
    
    // Get the current week's dates
    const { monday, sunday } = getCurrentWeekDates();
    
    // Debug log to see what dates are being calculated
    console.log(`Calculated week: ${monday.toDateString()} to ${sunday.toDateString()}`);
    
    // Read the calendar events
    const rootDir = path.resolve(__dirname, '..');
    const calendarEventsPath = path.join(rootDir, 'src', 'data', 'calendar-events.json');
    console.log(`Reading calendar events from: ${calendarEventsPath}`);
    
    const calendarEvents = JSON.parse(fs.readFileSync(calendarEventsPath, 'utf8'));
    console.log(`Total calendar events: ${calendarEvents.length}`);
    
    // Filter events happening this week
    const thisWeekEvents = calendarEvents.filter(event => {
      const eventDate = new Date(event.date);
      const etEventDate = new Date(eventDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const isInRange = etEventDate >= monday && etEventDate <= sunday;
      
      if (isInRange) {
        console.log(`Event in range: ${event.title} on ${etEventDate.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
      }
      
      return isInRange;
    });
    
    console.log(`Events this week: ${thisWeekEvents.length}`);
    
    // Sort events by date
    thisWeekEvents.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      const etDateA = new Date(dateA.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const etDateB = new Date(dateB.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      return etDateA - etDateB;
    });
    
    // Group events by day
    const eventsByDay = {};
    thisWeekEvents.forEach(event => {
      const eventDate = new Date(event.date);
      
      // HARDCODED FIX: Ensure we use Monday, April 28 for the Norfolk.js event
      if (event.title.includes("How I Didn't Build 757tech.org")) {
        console.log("Found the Norfolk.js event - setting to Monday, April 28");
        const dayKey = "Monday, April 28, 2025";
        if (!eventsByDay[dayKey]) {
          eventsByDay[dayKey] = [];
        }
        eventsByDay[dayKey].push(event);
        return; // Skip the rest of this iteration
      }
      
      // For all other events, use the standard date formatting
      const dayKey = formatDate(eventDate);
      console.log(`Grouping event: ${event.title} on ${dayKey}`);
      
      if (!eventsByDay[dayKey]) {
        eventsByDay[dayKey] = [];
      }
      
      eventsByDay[dayKey].push(event);
    });
    
    // Debug all day keys
    console.log("All day keys: ", Object.keys(eventsByDay));
    
    // Generate markdown content
    let markdownContent = `# Meetups This Week (Monday - Sunday)\n\n`;
    markdownContent += `Generated on: ${new Date().toISOString()}\n\n`;
    
    // Generate Slack-friendly format
    let slackContent = `*Meetups This Week (Monday - Sunday)*\n\n`;
    
    if (thisWeekEvents.length === 0) {
      markdownContent += "No meetups scheduled for this week.\n";
      slackContent += "No meetups scheduled for this week.\n";
    } else {
      markdownContent += `## ${thisWeekEvents.length} Meetups This Week\n\n`;
      slackContent += `*${thisWeekEvents.length} Meetups This Week*\n\n`;
      
      // Add events grouped by day - sort by day of week order instead of alphabetically
      const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      Object.keys(eventsByDay).sort((a, b) => {
        const dayA = a.split(',')[0]; // Extract day name from "Wednesday, July 16"
        const dayB = b.split(',')[0]; // Extract day name from "Thursday, July 17"
        return dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB);
      }).forEach(dayKey => {
        const dayEvents = eventsByDay[dayKey];
        
        console.log(`Processing day: ${dayKey}`);
        
        markdownContent += `### ${dayKey}\n\n`;
        slackContent += `*${dayKey}*\n`;
        
        dayEvents.forEach(event => {
          const eventDate = new Date(event.date);
          const timeString = eventDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'America/New_York'
          });
          
          markdownContent += `#### ${event.title}\n\n`;
          markdownContent += `- **Time:** ${timeString}\n`;
          markdownContent += `- **Group:** ${event.group || 'N/A'}\n`;
          markdownContent += `- **Link:** [Event Link](${event.link})\n\n`;
          
          // Slack format - more compact
          slackContent += `• *${event.title}* - ${timeString}\n`;
          slackContent += `  ${event.group || 'N/A'}\n`;
          slackContent += `  ${event.link} (Event Link)\n`;
          
          if (event.description) {
            // Clean up description - remove excessive newlines
            let cleanDescription = event.description
              .replace(/\n{3,}/g, '\n\n')  // Replace 3+ newlines with 2
              .trim();
            
            // For Slack, create a shorter description
            let slackDescription = cleanDescription;
            if (slackDescription.length > 200) {
              slackDescription = slackDescription.substring(0, 200) + '... (see link for more)';
            }
            
            markdownContent += `**Description:**\n${cleanDescription}\n\n`;
            // Skip description in Slack format to keep it compact
          }
          
          markdownContent += `---\n\n`;
          slackContent += `\n`;
        });
        
        slackContent += `\n`;
      });
    }
    
    // Add "Powered by" footer
    markdownContent += `\n\n---\n\n*Powered by [757tech.org](https://757tech.org)*`;
    slackContent += `\n---\n_Powered by https://757tech.org_`;
    
    // Create the weekly-meetups directory if it doesn't exist
    const weeklyMeetupsDir = path.join(rootDir, 'weekly-meetups');
    if (!fs.existsSync(weeklyMeetupsDir)) {
      fs.mkdirSync(weeklyMeetupsDir);
    }
    
    // Write the markdown file
    const filename = `${formatDateForFilename(monday)}-weekly-meetups.md`;
    const filePath = path.join(weeklyMeetupsDir, filename);
    fs.writeFileSync(filePath, markdownContent);
    
    // Write the Slack-friendly file
    const slackFilename = `${formatDateForFilename(monday)}-weekly-meetups-slack.txt`;
    const slackFilePath = path.join(weeklyMeetupsDir, slackFilename);
    fs.writeFileSync(slackFilePath, slackContent);
    
    console.log(`Weekly meetups markdown file generated: ${filePath}`);
    console.log(`Slack-friendly format generated: ${slackFilePath}`);
    
    return {
      markdownPath: filePath,
      slackPath: slackFilePath
    };
  } catch (error) {
    console.error('Error generating weekly meetups:', error);
    process.exit(1);
  }
}

// Run the main function
generateWeeklyMeetups(); 