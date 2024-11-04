import { ElasticSearchService } from './elasticSearch';
import { Client } from '@elastic/elasticsearch';
import { SEARCH_CONFIG } from '$lib/config/searchConfig';

const es = new ElasticSearchService();

// Test connection on service initialization
(async () => {
    if (es.client) {
        const connected = await es.testConnection();
        console.log('Elasticsearch connection status:', connected);
    }
})();

export async function searchAttorneys({ query, page = 1, limit = 10 }) {
  // Add connection check
  if (!es.client) {
    await initializeElasticSearch();
    if (!es.client) {
      throw new Error('Unable to connect to search service');
    }
  }

  try {
    const searchResponse = await es.client.search({
      index: SEARCH_CONFIG.indices.attorneys,
      body: {
        ...query,
        from: (page - 1) * limit,
        size: limit,
        track_total_hits: true
      }
    });

    return {
      results: searchResponse.hits.hits.map(hit => ({
        ...hit._source,
        score: hit._score,
        id: hit._id
      })),
      total: searchResponse.hits.total.value,
      page,
      totalPages: Math.ceil(searchResponse.hits.total.value / limit)
    };
  } catch (error) {
    console.error('[SearchService] Error executing search:', error);
    
    // Throw specific errors
    if (error.name === 'ConnectionError') {
      throw new Error('Search service is temporarily unavailable');
    }
    
    throw error;
  }
}

// Add initialization function
async function initializeElasticSearch() {
  try {
    if (!es.client) {
      es.client = new Client({
        node: import.meta.env.VITE_ELASTICSEARCH_URL,
        auth: {
          apiKey: import.meta.env.VITE_ELASTICSEARCH_API_KEY
        }
      });
      
      // Test connection
      await es.client.ping();
      console.log('Successfully connected to Elasticsearch');
    }
  } catch (error) {
    console.error('Failed to initialize Elasticsearch:', error);
    es.client = null;
  }
} 