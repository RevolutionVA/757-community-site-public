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
  const options = { timeZone: 'America/New_York' };
  const etNow = new Date(now.toLocaleString('en-US', options));
  
  // Get the current day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const currentDay = etNow.getDay();
  
  // If today is Monday, use today's date
  // Otherwise, go back to the previous Monday
  const daysToMonday = currentDay === 1 ? 0 : currentDay === 0 ? 6 : currentDay - 1;
  
  // Create date objects for the start (Monday) and end (Sunday) of the week
  const monday = new Date(etNow);
  monday.setDate(etNow.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return { monday, sunday };
}

// Function to format a date in a readable format
function formatDate(date) {
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/New_York'
  };
  return date.toLocaleDateString('en-US', options);
}

// Function to format a date for the filename (YYYY-MM-DD)
function formatDateForFilename(date) {
  return date.toISOString().split('T')[0];
}

// Main function
async function generateWeeklyMeetups() {
  try {
    // Get the current week's dates
    const { monday, sunday } = getCurrentWeekDates();
    
    // Read the calendar events
    const rootDir = path.resolve(__dirname, '..');
    const calendarEventsPath = path.join(rootDir, 'src', 'data', 'calendar-events.json');
    const calendarEvents = JSON.parse(fs.readFileSync(calendarEventsPath, 'utf8'));
    
    // Filter events happening this week
    const thisWeekEvents = calendarEvents.filter(event => {
      const eventDate = new Date(event.date);
      const etEventDate = new Date(eventDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      return etEventDate >= monday && etEventDate <= sunday;
    });
    
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
      const etEventDate = new Date(eventDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const dayKey = etEventDate.toDateString();
      
      if (!eventsByDay[dayKey]) {
        eventsByDay[dayKey] = [];
      }
      
      eventsByDay[dayKey].push(event);
    });
    
    // Generate markdown content
    let markdownContent = `# Meetups This Week (${formatDate(monday).split(',')[0]} - ${formatDate(sunday).split(',')[0]})\n\n`;
    markdownContent += `Generated on: ${new Date().toISOString()}\n\n`;
    
    // Generate Slack-friendly format
    let slackContent = `*Meetups This Week (${formatDate(monday).split(',')[0]} - ${formatDate(sunday).split(',')[0]})*\n\n`;
    
    if (thisWeekEvents.length === 0) {
      markdownContent += "No meetups scheduled for this week.\n";
      slackContent += "No meetups scheduled for this week.\n";
    } else {
      markdownContent += `## ${thisWeekEvents.length} Meetups This Week\n\n`;
      slackContent += `*${thisWeekEvents.length} Meetups This Week*\n\n`;
      
      // Add events grouped by day
      Object.keys(eventsByDay).sort((a, b) => new Date(a) - new Date(b)).forEach(dayKey => {
        const dayEvents = eventsByDay[dayKey];
        const dayDate = new Date(dayKey);
        const dayFormatted = formatDate(dayDate).split(',').slice(0, 2).join(',');
        
        markdownContent += `### ${dayFormatted}\n\n`;
        slackContent += `*${dayFormatted}*\n`;
        
        dayEvents.forEach(event => {
          const eventDate = new Date(event.date);
          const timeString = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          
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