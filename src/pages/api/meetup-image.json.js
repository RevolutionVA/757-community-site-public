// This file has been modified to support static site generation
// Instead of fetching metadata at runtime, it uses pre-fetched metadata from the build process

// Enable prerendering for static mode
export const prerender = true;

// Import the pre-fetched meetup metadata
import meetupsData from '../../data/meetups-combined.json';

export const GET = async ({ params, request }) => {
  try {
    // Get the URL from the query parameters
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    
    // Validate the URL
    if (!targetUrl) {
      return new Response(JSON.stringify({ 
        error: 'Missing URL parameter' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Find the meetup in our data
    const meetup = meetupsData.find(m => m.url === targetUrl);
    
    if (!meetup) {
      // Return default metadata if meetup not found
      return new Response(JSON.stringify({
        imageUrl: '/images/external-default.jpg',
        title: "External Link",
        description: "Click to visit this website and learn more."
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Return the meetup's metadata
    return new Response(JSON.stringify(meetup.metadata), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error generating metadata:', error);
    
    // Create a fallback response with default values
    const fallbackMetadata = {
      error: 'Failed to generate metadata',
      imageUrl: '/images/external-default.jpg',
      title: "External Link",
      description: "Click to visit this website and learn more."
    };
    
    return new Response(JSON.stringify(fallbackMetadata), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}