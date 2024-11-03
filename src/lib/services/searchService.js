import { ElasticSearchService } from './elasticSearch';
import { extractInfoWithGemini } from '../vertexAI';

const es = new ElasticSearchService();

export async function searchAttorneys({ searchTerm = '', page = 1, limit = 10 }) {
    try {
        // Extract search parameters using Vertex AI
        const extractedInfo = searchTerm ? 
            await extractInfoWithGemini(searchTerm) : 
            { locations: [], practiceAreas: [], keywords: [] };

        // Search using Elasticsearch
        const searchResults = await es.searchAttorneys({
            query: searchTerm,
            state: extractedInfo.locations?.[0],
            practiceAreas: extractedInfo.practiceAreas,
            page: page,
            limit: limit
        });

        return {
            extractedInfo,
            ...searchResults
        };
    } catch (error) {
        console.error('Search error:', error);
        return { 
            extractedInfo: null, 
            results: [], 
            total: 0, 
            page: 1, 
            totalPages: 0 
        };
    }
} 