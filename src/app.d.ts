/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Platform {}
  }
  
  interface ImportMetaEnv {
    VITE_ELASTICSEARCH_CLOUD_ID: string;
    VITE_ELASTICSEARCH_API_KEY: string;
  }
}

export {}; 