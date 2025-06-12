/**
 * Script to check for stale events and create GitHub issues
 * This script identifies events that haven't been updated recently (indicating they may have been deleted)
 * and creates GitHub issues to alert for manual review and deletion.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the calendar events JSON file
const CALENDAR_FILE_PATH = path.join(__dirname, '..', 'src', 'data', 'calendar-events.json');

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'your-org/757-community-site-public';

// Configuration
const STALE_THRESHOLD_HOURS = 12; // Consider events stale if not updated in the last 12 hours

/**
 * Makes an HTTPS request
 * @param {string} url - The URL to request
 * @param {Object} options - Request options
 * @param {string} data - Request body data
 * @returns {Promise<Object>} - Response data
 */
function makeRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

/**
 * Gets existing GitHub issues to avoid creating duplicates
 * @returns {Promise<Array>} - Array of existing issues
 */
async function getExistingIssues() {
  try {
    console.log('Fetching existing GitHub issues...');
    
    const url = `https://api.github.com/repos/${GITHUB_REPO}/issues?labels=stale-event&state=open`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': '757-community-site',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    const response = await makeRequest(url, options);
    
    if (Array.isArray(response)) {
      console.log(`Found ${response.length} existing stale event issues`);
      return response;
    } else {
      console.warn('Unexpected response format when fetching issues:', response);
      return [];
    }
  } catch (error) {
    console.error('Error fetching existing issues:', error.message);
    return [];
  }
}

/**
 * Creates a GitHub issue for a stale event
 * @param {Object} event - The stale event
 * @returns {Promise<Object>} - Created issue data
 */
async function createStaleEventIssue(event) {
  try {
    const title = `🗑️ Review stale event: ${event.title}`;
    const body = `## Stale Event Detected

**Event:** ${event.title}
**Group:** ${event.group}
**Date:** ${new Date(event.date).toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
})}
**Link:** ${event.link}
**Last Updated:** ${new Date(event.updatedDate).toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
})}

### Description
${event.description ? event.description.substring(0, 500) + (event.description.length > 500 ? '...' : '') : 'No description available'}

---

**This event hasn't been updated in the last ${STALE_THRESHOLD_HOURS} hours, suggesting it may have been cancelled or deleted from the source.**

### Action Required
- [ ] Check if the event still exists at the source
- [ ] If cancelled/deleted, remove it from \`src/data/calendar-events.json\`
- [ ] If still valid, investigate why it's not being updated

### Event Data
\`\`\`json
${JSON.stringify(event, null, 2)}
\`\`\``;

    const issueData = {
      title,
      body,
      labels: ['stale-event', 'needs-review']
    };

    const url = `https://api.github.com/repos/${GITHUB_REPO}/issues`;
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': '757-community-site',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    };

    console.log(`Creating issue for stale event: ${event.title}`);
    const response = await makeRequest(url, options, JSON.stringify(issueData));
    
    if (response.id) {
      console.log(`✅ Created issue #${response.number}: ${response.title}`);
      return response;
    } else {
      console.error('❌ Failed to create issue:', response);
      return null;
    }
  } catch (error) {
    console.error(`Error creating issue for event ${event.title}:`, error.message);
    return null;
  }
}

/**
 * Checks for stale events and creates issues
 */
async function checkStaleEvents() {
  try {
    console.log('Starting stale event check...');
    
    if (!GITHUB_TOKEN) {
      console.log('No GitHub token provided, skipping stale event check');
      return;
    }
    
    // Read the calendar events
    if (!fs.existsSync(CALENDAR_FILE_PATH)) {
      console.log('Calendar events file not found, skipping stale event check');
      return;
    }
    
    const eventsData = await fs.promises.readFile(CALENDAR_FILE_PATH, 'utf8');
    const events = JSON.parse(eventsData);
    
    console.log(`Checking ${events.length} events for staleness...`);
    
    // Calculate the stale threshold
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - (STALE_THRESHOLD_HOURS * 60 * 60 * 1000));
    
    console.log(`Events last updated before ${staleThreshold.toISOString()} will be considered stale`);
    
    // Find stale events
    const staleEvents = events.filter(event => {
      if (!event.updatedDate) {
        // Events without updatedDate are considered stale
        return true;
      }
      
      const updatedDate = new Date(event.updatedDate);
      return updatedDate < staleThreshold;
    });
    
    console.log(`Found ${staleEvents.length} stale events`);
    
    if (staleEvents.length === 0) {
      console.log('No stale events found, no issues to create');
      return;
    }
    
    // Get existing issues to avoid duplicates
    const existingIssues = await getExistingIssues();
    const existingEventTitles = new Set(
      existingIssues.map(issue => 
        issue.title.replace('🗑️ Review stale event: ', '')
      )
    );
    
    // Create issues for stale events that don't already have issues
    let issuesCreated = 0;
    for (const event of staleEvents) {
      if (!existingEventTitles.has(event.title)) {
        const issue = await createStaleEventIssue(event);
        if (issue) {
          issuesCreated++;
        }
        
        // Rate limiting - wait 1 second between issue creation
        if (issuesCreated < staleEvents.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else {
        console.log(`⏭️ Skipping ${event.title} - issue already exists`);
      }
    }
    
    console.log(`✅ Stale event check completed. Created ${issuesCreated} new issues.`);
    
  } catch (error) {
    console.error('Error in stale event check:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the check
console.log('Starting stale event detection...');
checkStaleEvents()
  .then(() => {
    console.log('Stale event check completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Stale event check failed:', error.message);
    process.exit(1);
  }); 