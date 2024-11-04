module.exports = {
  build: {
    env: {
      VITE_ELASTICSEARCH_CLOUD_ID: process.env.VITE_ELASTICSEARCH_CLOUD_ID,
      VITE_ELASTICSEARCH_API_KEY: process.env.VITE_ELASTICSEARCH_API_KEY
    }
  }
}; 