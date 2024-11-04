import { ElasticSearchService } from './elasticSearch';
import { extractInfoWithGemini } from '../vertexAI';

const es = new ElasticSearchService();

// Test connection on service initialization
(async () => {
    if (es.client) {
        const connected = await es.testConnection();
        console.log('Elasticsearch connection status:', connected);
    }
})();

export async function searchAttorneys({ 
  searchTerm = '', 
  page = 1, 
  limit = 10,
}) {
  if (!es.client) {
    console.warn('Elasticsearch client not initialized');
    return {
      results: [],
      total: 0,
      totalPages: 0,
      error: 'Search service unavailable'
    };
  }

  console.log('Starting attorney search with params:', { searchTerm, page, limit });

  try {
    // Extract search information using Vertex AI
    const extractedInfo = searchTerm ? 
      await extractInfoWithGemini(searchTerm) : 
      { locations: [], practiceAreas: [], keywords: [] };

    // Construct Elasticsearch query
    const query = {
      bool: {
        must: [],
        should: [],
        filter: []
      }
    };

    // Add practice area filters
    if (extractedInfo.practiceAreas.length > 0) {
      query.bool.should.push({
        terms: {
          practiceAreas: extractedInfo.practiceAreas,
          boost: 2.0
        }
      });
    }

    // Add location filters
    if (extractedInfo.locations.length > 0) {
      query.bool.should.push({
        terms: {
          state: extractedInfo.locations,
          boost: 1.5
        }
      });
    }

    // Add keyword search
    if (searchTerm) {
      query.bool.must.push({
        multi_match: {
          query: searchTerm,
          fields: [
            'firstName^2',
            'lastName^2',
            'practiceAreas^1.5',
            'keywords^1.2',
            'city',
            'state'
          ],
          type: 'best_fields',
          operator: 'or',
          fuzziness: 'AUTO'
        }
      });
    }

    // Add status filter
    query.bool.filter.push({
      term: { status: 'approved' }
    });

    // Execute search
    const results = await es.searchAttorneys({
      query,
      page,
      limit
    });

    return {
      results: results.hits.map(hit => ({
        ...hit._source,
        score: hit._score,
        highlights: hit.highlight
      })),
      total: results.total.value,
      page,
      totalPages: Math.ceil(results.total.value / limit)
    };
  } catch (error) {
    console.error('[SearchService] Search error:', error);
    throw error;
  }
} 