import { defineConfig } from 'astro/config';

// The app is served from the root of the local server, so there's no `base` or `site` here.
// While developing (`npm run dev`), requests to /api go to the local server on port 4322.
export default defineConfig({
  vite: {
    server: {
      proxy: { '/api': 'http://127.0.0.1:4322' },
    },
  },
});
