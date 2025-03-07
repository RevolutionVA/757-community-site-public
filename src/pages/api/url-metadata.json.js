// This file has been modified to support static site generation
// Instead of fetching metadata at runtime, it returns static fallback data

// Enable prerendering for static mode
export const prerender = true;

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
    } else if (isLinkedInUrl) {
      metadata.imageUrl = '/images/linkedin-default.jpg';
      metadata.title = "LinkedIn Profile";
      metadata.description = "A professional profile or company on LinkedIn. Click to learn more.";
    }
    
    // Try to extract some information from the URL
    try {
      const urlObj = new URL(targetUrl);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const name = pathParts[pathParts.length - 1]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        metadata.title = name;
      } else {
        // Use hostname as fallback
        metadata.title = urlObj.hostname.replace('www.', '');
      }
    } catch (e) {
      console.error('Error extracting title from URL:', e);
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
    return new Response(JSON.stringify({ 
      error: 'Failed to generate metadata',
      details: error.message,
      imageUrl: '/images/external-default.jpg',
      title: "External Link",
      description: "Click to visit this website and learn more."
    }), {
      status: 200, // Return 200 instead of 500 to prevent client-side errors
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}