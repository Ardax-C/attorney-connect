import { ElasticSearchService } from './elasticSearch';
import { extractInfoWithGemini } from '../vertexAI';

const es = new ElasticSearchService();

export async function searchAttorneys({ searchTerm = '', page = 1, limit = 10 }) {
    console.log('[SearchService] Starting search with term:', searchTerm);
    try {
        const extractedInfo = searchTerm ? 
            await extractInfoWithGemini(searchTerm) : 
            { locations: [], practiceAreas: [], keywords: [] };
            
        console.log('[SearchService] Extracted search info:', extractedInfo);

        const searchResults = await es.searchAttorneys({
            query: searchTerm,
            state: extractedInfo.locations?.[0],
            practiceAreas: extractedInfo.practiceAreas,
            page: page,
            limit: limit
        });

        console.log('[SearchService] ElasticSearch results:', {
            total: searchResults.total,
            resultCount: searchResults.results.length,
            page: page,
            totalPages: searchResults.totalPages
        });

        return {
            extractedInfo,
            ...searchResults
        };
    } catch (error) {
        console.error('[SearchService] Search error:', error);
        throw error;
    }
} 