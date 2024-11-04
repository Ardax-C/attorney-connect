/** @type {import('@sveltejs/kit').Config} */
export default {
  build: {
    rollupOptions: {
      external: ['@elastic/elasticsearch']
    }
  },
  ssr: {
    noExternal: ['@elastic/elasticsearch']
  }
}; 