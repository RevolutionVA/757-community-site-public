// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import events from './src/data/calendar-events.json' with { type: 'json' };

// Newest event touch time, used as `lastmod` for the two pages that actually
// change when the calendar cron runs. Everything else gets no lastmod at all.
//
// The previous config set `lastmod: new Date()` on every URL, which told Google
// all nine pages changed on every build — four-plus times a day, since the
// calendar workflow runs every 6 hours. Google's documented response to a
// lastmod it can't trust is to ignore the field site-wide, so the blanket
// timestamp was actively costing us the signal on the pages where it's real.
const newestEvent = events
  .map((e) => e.updatedDate ?? e.createdDate)
  .filter(Boolean)
  .sort()
  .at(-1);

// Spread rather than assigned directly: an empty calendar-events.json (or one
// with no timestamps) would otherwise put `lastmod: undefined` into the
// serializer. Omitting the key entirely is the correct degradation.
const eventLastmod = newestEvent ? { lastmod: newestEvent } : {};

/** @type {[RegExp, {priority: number, changefreq: string, lastmod?: string}][]} */
const RULES = [
  [/^\/$/, { priority: 1.0, changefreq: 'daily', ...eventLastmod }],
  [/^\/calendar\/?$/, { priority: 0.9, changefreq: 'daily', ...eventLastmod }],
  // Evergreen URL, rewritten every Monday — the one the weekly social posts link to.
  [/^\/this-week\/?$/, { priority: 0.9, changefreq: 'weekly' }],
  // A completed week never changes again, so it gets its own frozen lastmod
  // (the Sunday it ended) rather than a build timestamp.
  [/^\/weekly\/(\d{4}-\d{2}-\d{2})\/?$/, { priority: 0.5, changefreq: 'yearly' }],
  [/^\/weekly\/?$/, { priority: 0.7, changefreq: 'weekly' }],
  [/^\/meetups\/?$/, { priority: 0.9, changefreq: 'weekly' }],
  [/^\/conferences\/?$/, { priority: 0.8, changefreq: 'monthly' }],
  [/^\/get-involved\/?$/, { priority: 0.5, changefreq: 'monthly' }],
  // Welcome page for the Pop-up Meetup series; its event card follows whichever
  // pop-up is next in the calendar, so it turns over with the series.
  [/^\/popup\/?$/, { priority: 0.5, changefreq: 'weekly' }],
];

export default defineConfig({
  output: 'static',
  site: 'https://757tech.org',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/api/'),
      serialize(item) {
        const path = new URL(item.url).pathname;

        // Excluded from the sitemap AND marked noindex on the page itself.
        // A noindex URL listed in a sitemap is a mixed signal, so do both.
        if (path.startsWith('/newsletter-thank-you')) return undefined;

        const rule = RULES.find(([pattern]) => pattern.test(path))?.[1];
        if (!rule) return item;

        const next = { ...item, ...rule };

        // A dated archive page is frozen once built: stamp it with the Sunday
        // that week ended, which is a real date rather than the build time.
        const week = path.match(/^\/weekly\/(\d{4})-(\d{2})-(\d{2})\/?$/);
        if (week) {
          const [, y, m, d] = week;
          next.lastmod = new Date(Date.UTC(+y, +m - 1, +d + 6)).toISOString();
        }

        return next;
      },
    }),
  ],
});
