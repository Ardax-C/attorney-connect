import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [sveltekit()],
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]'
        }
      }
    },
    define: {
      'process.env.PUBLIC_FIREBASE_API_KEY': JSON.stringify(env.PUBLIC_FIREBASE_API_KEY),
      'process.env.PUBLIC_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.PUBLIC_FIREBASE_AUTH_DOMAIN),
      'process.env.PUBLIC_FIREBASE_PROJECT_ID': JSON.stringify(env.PUBLIC_FIREBASE_PROJECT_ID),
      'process.env.PUBLIC_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.PUBLIC_FIREBASE_STORAGE_BUCKET),
      'process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
      'process.env.PUBLIC_FIREBASE_APP_ID': JSON.stringify(env.PUBLIC_FIREBASE_APP_ID),
      'process.env.PUBLIC_FIREBASE_MEASUREMENT_ID': JSON.stringify(env.PUBLIC_FIREBASE_MEASUREMENT_ID),
    }
  };
});