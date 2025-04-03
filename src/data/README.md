# 757 Community Data Files

This directory contains data files used by the 757 Community website.

## Meetups Data

The `meetup-groups.json` file contains information about all the meetups in the Hampton Roads area. The data is organized as an array of objects, with each object representing a meetup.

### Adding or Updating a Meetup

To add a new meetup or update an existing one, edit the `meetup-groups.json` file. Each meetup object should have the following properties:

```json
{
  "name": "Name of the Meetup",
  "url": "https://url-to-the-meetup.com",
  "tags": ["Tag1", "Tag2"],
  "category": "Development | Technology | Design | Cloud",
  "rssFeed": "https://url-to-the-meetup.com/events/rss/",
  "coverImage": "https://url-to-cover-image.com/image.jpg"
}
```

- **name**: The name of the meetup
- **url**: The URL to the meetup's website or page
- **tags**: An array of tags that describe the meetup
- **category**: The category of the meetup (must be one of: "Development", "Technology", "Design", or "Cloud")
- **rssFeed**: The URL to the meetup's RSS feed for events
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
  "category": "Development",
  "rssFeed": "https://www.meetup.com/NorfolkJS/events/rss/"
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

## Calendar Events

The `calendar-events.json` file contains upcoming tech events in the Hampton Roads area. This file is automatically updated every 3 hours by a GitHub Action that fetches events from various sources, including Meetup.com RSS feeds.

### Adding Events

There are two ways to add events to the calendar:

1. **Automatic (for Meetup groups)**: If your event is hosted on Meetup.com, you can add your group's RSS feed to the `meetup-groups.json` file. The GitHub Action will automatically fetch events from your feed.

2. **Manual**: You can manually add events to the `calendar-events.json` file by creating a pull request. This is useful for events that are not hosted on Meetup.com.

### Event Format

Each event in the `calendar-events.json` file should have the following format:

```json
{
  "title": "Event Title",
  "link": "https://example.com/event",
  "date": "2023-06-15T18:30:00.000Z",
  "description": "A brief description of the event.",
  "source": "meetup|eventbrite|website|other",
  "group": "Organizing Group Name"
}
```

- `title`: The title of the event
- `link`: A URL to the event page
- `date`: The date and time of the event in ISO 8601 format
- `description`: A brief description of the event
- `source`: The source of the event (e.g., "meetup", "eventbrite", "website", "other")
- `group`: The name of the organizing group

### Adding a Meetup Group

To add a Meetup group to the automatic updates, add an entry to the `meetup-groups.json` file with the following format:

```