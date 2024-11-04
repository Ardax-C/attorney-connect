import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [sveltekit()],
    define: {
      'process.env.VITE_ELASTICSEARCH_API_KEY': 
        JSON.stringify(env.VITE_ELASTICSEARCH_API_KEY)
    }
  };
});