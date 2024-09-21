import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  define: {
    'import.meta.env.VITE_PUBLIC_FIREBASE_API_KEY': JSON.stringify(process.env.VITE_PUBLIC_FIREBASE_API_KEY),
    'import.meta.env.VITE_PUBLIC_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.VITE_PUBLIC_FIREBASE_AUTH_DOMAIN),
    'import.meta.env.VITE_PUBLIC_FIREBASE_PROJECT_ID': JSON.stringify(process.env.VITE_PUBLIC_FIREBASE_PROJECT_ID),
    'import.meta.env.VITE_PUBLIC_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.VITE_PUBLIC_FIREBASE_STORAGE_BUCKET),
    'import.meta.env.VITE_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.VITE_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    'import.meta.env.VITE_PUBLIC_FIREBASE_APP_ID': JSON.stringify(process.env.VITE_PUBLIC_FIREBASE_APP_ID),
    'import.meta.env.VITE_PUBLIC_FIREBASE_MEASUREMENT_ID': JSON.stringify(process.env.VITE_PUBLIC_FIREBASE_MEASUREMENT_ID)
  }
});