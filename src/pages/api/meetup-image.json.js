// This file has been modified to support static site generation
// Instead of fetching metadata at runtime, it uses pre-fetched metadata from the build process

// Enable prerendering for static mode
export const prerender = true;

// Import the pre-fetched meetup metadata
import meetupMetadata from '../../data/meetup-metadata.json';
// Import meetups data to get LinkedIn image URLs if needed
import meetupsData from '../../data/meetups.json';

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
    
    // Check if we have pre-fetched metadata for this URL
    if (meetupMetadata[targetUrl]) {
      return new Response(JSON.stringify(meetupMetadata[targetUrl]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Determine the type of URL for platform-specific handling
    const isMeetupUrl = targetUrl.includes('meetup.com');
    const isLinkedInUrl = targetUrl.includes('linkedin.com');
    
    // Create static fallback metadata based on URL type
    const metadata = {
      imageUrl: '/images/external-default.jpg',
      title: "External Link",
      description: "Click to visit this website and learn more."
    };
    
    // Set platform-specific defaults
    if (isMeetupUrl) {
      metadata.imageUrl = '/images/default-meetup.jpg';
      metadata.title = "Meetup Group";
      metadata.description = "A meetup group on Meetup.com. Click to learn more and join upcoming events.";
      
      // Try to extract the meetup name from the URL
      try {
        const urlObj = new URL(targetUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          const meetupName = pathParts[0]
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          metadata.title = meetupName;
        }
      } catch (e) {
        console.error('Error extracting meetup name from URL:', e);
      }
    } else if (isLinkedInUrl) {
      // For LinkedIn URLs, try to find the coverImage in meetups.json
      const linkedInMeetup = meetupsData.find(meetup => meetup.url === targetUrl);
      if (linkedInMeetup && linkedInMeetup.coverImage) {
        metadata.imageUrl = linkedInMeetup.coverImage;
        metadata.title = linkedInMeetup.name;
      } else {
        metadata.imageUrl = '/images/linkedin-default.jpg';
        metadata.title = "LinkedIn Profile";
      }
      metadata.description = "A professional profile or company on LinkedIn. Click to learn more.";
    }
    
    // Return the static metadata
    return new Response(JSON.stringify(metadata), {
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