import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    include: ['fuse.js']
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/]
    }
  },
  ssr: {
    noExternal: ['fuse.js']
  }
});