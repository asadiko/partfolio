import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// Project-pages deploy (github.com/asadiko/partfolio → asadiko.github.io/partfolio).
// Rename the repo to asadiko.github.io and set SITE_BASE=/ to serve from the root.
const base = process.env.SITE_BASE ?? '/partfolio';

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://asadiko.github.io',
  base,
  output: 'static',
  trailingSlash: 'never',
  integrations: [react(), mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
