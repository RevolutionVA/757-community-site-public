import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const eventsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    startDate: z.string(), // ISO 8601 format with timezone
    endDate: z.string().optional(), // ISO 8601 format with timezone
    location: z.string().optional(),
    sourceUrl: z.string().url(), // Original event URL (e.g., Meetup.com link)
    sourceId: z.string().optional(), // External ID from RSS feed for tracking updates
    source: z.string(), // Source type: 'meetup', 'manual', 'conference', etc.
    group: z.string(), // Meetup group name or event organizer
    tags: z.array(z.string()).optional(),
    category: z.string().optional(), // Development, Technology, Design, Cloud
    image: z.string().optional(),
    cancelled: z.boolean().default(false),
    featured: z.boolean().default(false),
  }),
});

const meetupsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/meetups' }),
  schema: z.object({
    name: z.string(),
    url: z.string().url(),
    rssFeed: z.string().url().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string(), // Development, Technology, Design, Cloud
    image: z.string().optional(),
    active: z.boolean().default(true),
  }),
});

export const collections = {
  events: eventsCollection,
  meetups: meetupsCollection,
};
