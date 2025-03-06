# 757 Community Data Files

This directory contains data files used by the 757 Community website.

## Meetups Data

The `meetups.json` file contains information about all the meetups in the Hampton Roads area. The data is organized as an array of objects, with each object representing a meetup.

### Adding or Updating a Meetup

To add a new meetup or update an existing one, edit the `meetups.json` file. Each meetup object should have the following properties:

```json
{
  "name": "Name of the Meetup",
  "url": "https://url-to-the-meetup.com",
  "tags": ["Tag1", "Tag2"],
  "category": "Development | Technology | Design",
  "coverImage": "https://url-to-cover-image.com/image.jpg"
}
```

- **name**: The name of the meetup
- **url**: The URL to the meetup's website or page
- **tags**: An array of tags that describe the meetup
- **category**: The category of the meetup (must be one of: "Development", "Technology", or "Design")
- **coverImage**: (Optional) URL to a fallback cover image for the meetup

### Dynamic Metadata Loading

The website automatically attempts to fetch Open Graph metadata from any URL at runtime. This means you don't need to manually specify cover images, titles, or descriptions for most meetups.

The system supports various platforms:
- **Meetup.com**: Extracts images, titles, and descriptions from Meetup group pages
- **LinkedIn**: Extracts metadata from LinkedIn company and profile pages
- **Other websites**: Works with any website that provides Open Graph metadata

The system will extract and display:
- **Open Graph Image**: The main image from the page's metadata
- **Open Graph Title**: The title specified in the page's metadata
- **Open Graph Description**: A brief description from the page's metadata

This provides visitors with more context about each meetup without requiring manual data entry.

If the metadata extraction fails, the system will use:
1. The `coverImage` specified in the JSON file (if provided)
2. A platform-specific default image (different for Meetup.com, LinkedIn, etc.)
3. The original title from the JSON file
4. A platform-appropriate generic description

### Example

```json
{
  "name": "Norfolk.js",
  "url": "https://www.meetup.com/NorfolkJS/",
  "tags": ["Javascript", "Web development"],
  "category": "Development"
}
```

After adding or updating a meetup, the changes will be reflected on the website after the next build.

## Contributing

1. Fork the repository
2. Make your changes to the `meetups.json` file
3. Submit a pull request

Thank you for contributing to the 757 Community website! 