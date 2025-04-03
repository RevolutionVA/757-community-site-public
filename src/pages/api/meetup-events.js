import Parser from 'rss-parser';
import meetupGroups from '../../data/meetup-groups.json';

// Create a new RSS parser instance
const parser = new Parser();

export async function GET({ request }) {
  try {
    // Set up CORS headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers, status: 204 });
    }

    // Use mock data for development if needed
    const useMockData = false;
    
    if (useMockData) {
      return new Response(JSON.stringify(getMockEvents()), { headers });
    }

    // Fetch all RSS feeds in parallel
    const feedPromises = meetupGroups.map(async (meetup) => {
      try {
        // In a real implementation, we would fetch the actual RSS feed
        // For now, we'll use a proxy or mock data
        const feed = await parser.parseURL(meetup.rssFeed);
        
        // Add the meetup name to each event
        const events = feed.items.map(item => ({
          ...item,
          meetupName: meetup.name
        }));
        
        return events;
      } catch (error) {
        console.error(`Error fetching RSS feed for ${meetup.name}:`, error);
        return [];
      }
    });

    // Wait for all feeds to be fetched
    const allEvents = await Promise.all(feedPromises);
    
    // Flatten the array of arrays into a single array of events
    const flattenedEvents = allEvents.flat();
    
    // Sort events by date
    const sortedEvents = flattenedEvents.sort((a, b) => {
      return new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime();
    });
    
    // Filter out past events
    const futureEvents = sortedEvents.filter(event => {
      const eventDate = new Date(event.isoDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDate >= today;
    });
    
    // Return the events as JSON
    return new Response(JSON.stringify(futureEvents), { headers });
  } catch (error) {
    console.error('Error fetching meetup events:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch meetup events' }), 
      { 
        status: 500, 
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
}

// Function to generate mock events for testing
function getMockEvents() {
  const today = new Date();
  const mockEvents = [];
  
  // Generate events for the next 6 months
  for (let i = 0; i < 20; i++) {
    const eventDate = new Date(today);
    eventDate.setDate(today.getDate() + Math.floor(Math.random() * 180)); // Random date in next 6 months
    
    const meetupIndex = Math.floor(Math.random() * meetupGroups.length);
    const meetup = meetupGroups[meetupIndex];
    
    mockEvents.push({
      title: `${meetup.name} Meetup - ${i + 1}`,
      link: meetup.rssFeed.replace('/events/rss/', '/events/'),
      pubDate: eventDate.toISOString(),
      content: `<p>Join us for the ${i + 1}th meetup of ${meetup.name}!</p>`,
      contentSnippet: `Join us for the ${i + 1}th meetup of ${meetup.name}!`,
      isoDate: eventDate.toISOString(),
      meetupName: meetup.name
    });
  }
  
  return mockEvents.sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime());
} 