// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://757tech.org',
  integrations: [
    sitemap({
      // Configuration options
      filter: (page) => !page.includes('/api/'), // Exclude API routes
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ]
});