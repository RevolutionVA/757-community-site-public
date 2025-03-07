// This is a simple API endpoint that fetches a page and extracts Open Graph metadata
// It uses a cache to avoid fetching the same data multiple times

// Opt out of prerendering in static mode
export const prerender = false;

// Simple in-memory cache
const metadataCache = new Map();

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
    
    // Check if we have cached metadata for this URL
    if (metadataCache.has(targetUrl)) {
      return new Response(JSON.stringify(metadataCache.get(targetUrl)), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Determine the type of URL for platform-specific handling
    const isMeetupUrl = targetUrl.includes('meetup.com');
    const isLinkedInUrl = targetUrl.includes('linkedin.com');
    
    // Set up headers to mimic a browser request
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://www.google.com/'
    };
    
    // Fetch the page
    const response = await fetch(targetUrl, { headers });
    const html = await response.text();
    
    // Extract Open Graph metadata
    const metadata = {
      imageUrl: null,
      title: null,
      description: null
    };
    
    // Set default image based on URL type
    if (isMeetupUrl) {
      metadata.imageUrl = '/images/default-meetup.jpg';
    } else if (isLinkedInUrl) {
      metadata.imageUrl = '/images/linkedin-default.jpg';
    } else {
      metadata.imageUrl = '/images/external-default.jpg';
    }
    
    // Extract the og:image
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (ogImageMatch && ogImageMatch[1]) {
      metadata.imageUrl = ogImageMatch[1];
      console.log(`Found OG image for ${targetUrl}: ${metadata.imageUrl}`);
    } else if (isMeetupUrl) {
      // Meetup-specific fallback: try to find any image with "group" or "logo" in the URL
      const imgMatch = html.match(/https:\/\/secure\.meetupstatic\.com\/photos\/event\/[^"]+/);
      if (imgMatch) {
        metadata.imageUrl = imgMatch[0];
        console.log(`Found fallback image for ${targetUrl}: ${metadata.imageUrl}`);
      } else {
        console.log(`No image found for ${targetUrl}, using default`);
      }
    } else if (isLinkedInUrl) {
      // LinkedIn-specific fallback: try to find company logo
      const logoMatch = html.match(/https:\/\/media\.licdn\.com\/dms\/image\/[^"]+/);
      if (logoMatch) {
        metadata.imageUrl = logoMatch[0];
        console.log(`Found LinkedIn image for ${targetUrl}: ${metadata.imageUrl}`);
      } else {
        console.log(`No image found for ${targetUrl}, using default`);
      }
    } else {
      console.log(`No image found for ${targetUrl}, using default`);
    }
    
    // Extract the og:title
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    if (ogTitleMatch && ogTitleMatch[1]) {
      metadata.title = ogTitleMatch[1];
      console.log(`Found OG title for ${targetUrl}: ${metadata.title}`);
    } else {
      // Fallback: try to extract the name from the URL
      try {
        const urlObj = new URL(targetUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          const name = pathParts[pathParts.length - 1]
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          metadata.title = name;
          console.log(`Using URL-based title for ${targetUrl}: ${metadata.title}`);
        } else {
          // Use hostname as fallback
          metadata.title = urlObj.hostname.replace('www.', '');
          console.log(`Using hostname as title for ${targetUrl}: ${metadata.title}`);
        }
      } catch (e) {
        console.error('Error extracting title from URL:', e);
      }
    }
    
    // Extract the og:description
    const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    if (ogDescMatch && ogDescMatch[1]) {
      metadata.description = ogDescMatch[1];
      console.log(`Found OG description for ${targetUrl}: ${metadata.description}`);
    } else {
      // Platform-specific fallback descriptions
      if (isMeetupUrl) {
        metadata.description = "A meetup group on Meetup.com. Click to learn more and join upcoming events.";
      } else if (isLinkedInUrl) {
        metadata.description = "A professional profile or company on LinkedIn. Click to learn more.";
      } else {
        metadata.description = "Click to visit this website and learn more.";
      }
      console.log(`Using fallback description for ${targetUrl}`);
    }
    
    // Cache the metadata
    metadataCache.set(targetUrl, metadata);
    
    // Return the metadata
    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch metadata',
      details: error.message,
      imageUrl: '/images/external-default.jpg'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}