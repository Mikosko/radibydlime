import { defineConfig } from 'astro/config';
import markdoc from '@astrojs/markdoc';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  integrations: [markdoc({ allowHTML: false })],
  vite: {
    plugins: [tailwindcss()],
  },
});
