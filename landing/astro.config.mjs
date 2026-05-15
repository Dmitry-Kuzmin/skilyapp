import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://skilyapp.com',
  integrations: [
    tailwind(),
    react(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.9,
      lastmod: new Date(),
      filter: (page) => !page.includes('/old-landing'),
    }),
  ],
  output: 'static',
});
