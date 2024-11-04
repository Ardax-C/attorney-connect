import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    fs: {
      allow: ['.']
    }
  },
  define: {
    // Make env vars available to server-side code
    'process.env.VITE_ELASTICSEARCH_CLOUD_ID': 
      JSON.stringify(process.env.VITE_ELASTICSEARCH_CLOUD_ID),
    'process.env.VITE_ELASTICSEARCH_API_KEY': 
      JSON.stringify(process.env.VITE_ELASTICSEARCH_API_KEY)
  }
});