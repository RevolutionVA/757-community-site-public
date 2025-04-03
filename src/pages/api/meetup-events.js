import Parser from 'rss-parser';
import { getCollection } from 'astro:content';
import meetupsData from '../../data/meetups-combined.json';

// Create a new RSS parser instance
const parser = new Parser();

export const GET = async () => {
  try {
    // Fetch all RSS feeds in parallel
    const feedPromises = meetupsData
      .filter(meetup => meetup.rssFeed) // Only process meetups with RSS feeds
      .map(async (meetup) => {
        try {
          const feed = await parser.parseURL(meetup.rssFeed);
          return feed.items.map(item => ({
            title: item.title,
            link: item.link,
            date: item.pubDate,
            description: item.content,
            meetupName: meetup.name,
            meetupUrl: meetup.url
          }));
        } catch (error) {
          console.error(`Error fetching RSS feed for ${meetup.name}:`, error);
          return [];
        }
      });

    // Wait for all feeds to be fetched
    const eventsArrays = await Promise.all(feedPromises);
    
    // Flatten the arrays and sort by date
    const events = eventsArrays
      .flat()
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return new Response(JSON.stringify(events), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch events' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
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
    
    const meetupIndex = Math.floor(Math.random() * meetupsData.length);
    const meetup = meetupsData[meetupIndex];
    
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