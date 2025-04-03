# Data Files

## Meetups Data

The `meetups-combined.json` file contains information about all the meetups in the Hampton Roads area. The data is organized as an array of objects, with each object representing a meetup.

### Meetup Properties

To add a new meetup or update an existing one, edit the `meetups-combined.json` file. Each meetup object should have the following properties:

```json
{
  "name": "Meetup Name",
  "url": "https://meetup.com/group-url",
  "tags": ["Tag1", "Tag2"],
  "category": "Development|Technology|Design|Cloud",
  "rssFeed": "https://meetup.com/group-url/events/rss/",
  "metadata": {
    "imageUrl": "/images/meetups/group-image.jpg",
    "title": "Meetup Title",
    "description": "Meetup Description"
  }
}
```

### Categories

Meetups are organized into the following categories:

- **Development**: Programming, software development, and related technologies
- **Technology**: General technology, hardware, and other tech-related groups
- **Design**: UX, UI, graphic design, and related fields
- **Cloud**: Cloud computing, DevOps, and related technologies

### Tags

Tags help categorize meetups more specifically. Some common tags include:

- Programming languages (JavaScript, Python, .NET, etc.)
- Technologies (Web development, Mobile, AI, etc.)
- Topics (Security, Cloud, DevOps, etc.)
- Community (DEI, General, Learning, etc.)

### Automatic Event Updates

The site automatically fetches events from Meetup.com groups using their RSS feeds. To add a Meetup group to the automatic updates, add an entry to the `meetups-combined.json` file with the following format:

```json
{
  "name": "Meetup Group Name",
  "url": "https://meetup.com/group-url",
  "tags": ["Tag1", "Tag2"],
  "category": "Development|Technology|Design|Cloud",
  "rssFeed": "https://meetup.com/group-url/events/rss/",
  "metadata": {
    "imageUrl": "/images/meetups/group-image.jpg",
    "title": "Meetup Title",
    "description": "Meetup Description"
  }
}
```

### Adding a New Meetup

1. Make your changes to the `meetups-combined.json` file
2. Run the validation script to ensure your changes are valid
3. Submit a pull request with your changes

### Validation

The site uses JSON Schema to validate the meetups data. The schema is defined in `src/data/schemas/meetups.schema.json`. You can validate your changes by running:

```bash
npm run validate-json
```

This will check that:
- All required fields are present
- URLs are valid
- Categories are valid
- Tags are valid
- The data structure is correct

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

1. **Automatic (for Meetup groups)**: If your event is hosted on Meetup.com, you can add your group's RSS feed to the `meetup-feeds.json` file. The GitHub Action will automatically fetch events from your feed.

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

To add a Meetup group to the automatic updates, add an entry to the `meetup-feeds.json` file with the following format:

```json
{
  "name": "Group Name",
  "rssFeed": "https://www.meetup.com/group-url-name/events/rss/"
}
```

- `name`: The name of the group
- `rssFeed`: The URL to the group's RSS feed for events

After adding your group, create a pull request. Once merged, the GitHub Action will automatically fetch events from your group's feed.

## Contributing

1. Fork the repository
2. Make your changes to the `meetups-combined.json` file
3. Submit a pull request

Thank you for contributing to the 757 Community website! 