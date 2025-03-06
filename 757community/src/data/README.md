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

## Conferences Data

The `conferences.json` file contains information about all the conferences in the Hampton Roads area. The data is organized as an array of objects, with each object representing a conference.

### Adding or Updating a Conference

To add a new conference or update an existing one, edit the `conferences.json` file. Each conference object should have the following properties:

```json
{
  "name": "Name of the Conference",
  "url": "https://url-to-the-conference.com",
  "description": "A brief description of the conference",
  "date": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "location": "City, State",
  "tags": ["Tag1", "Tag2"],
  "coverImage": "https://url-to-cover-image.com/image.jpg"
}
```

- **name**: The name of the conference
- **url**: The URL to the conference's website
- **description**: A brief description of the conference
- **date**: The start date of the conference in YYYY-MM-DD format
- **endDate**: (Optional) The end date of the conference in YYYY-MM-DD format
- **location**: The location of the conference
- **tags**: An array of tags that describe the conference
- **coverImage**: (Optional) URL to a fallback cover image for the conference

### Dynamic Categorization

The website automatically categorizes conferences as "Upcoming" or "Past" based on their dates:
- Conferences with a start date in the future are listed under "Upcoming Conferences"
- Conferences with a start date in the past are listed under "Past Conferences"

This dynamic categorization ensures that the website always shows the most relevant information without requiring manual updates.

### Example

```json
{
  "name": "RevolutionConf 2024",
  "url": "https://revolutionconf.com/",
  "description": "A two-day, multi-track technology conference in Virginia Beach",
  "date": "2024-06-13",
  "endDate": "2024-06-14",
  "location": "Virginia Beach, VA",
  "tags": ["Web", "Mobile", "Cloud", "DevOps"]
}
```

After adding or updating a conference, the changes will be reflected on the website after the next build.

## Contributing

1. Fork the repository
2. Make your changes to the `meetups.json` file
3. Submit a pull request

Thank you for contributing to the 757 Community website! 