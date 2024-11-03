import { ElasticSearchService } from './elasticSearch';
import { extractInfoWithGemini } from '../vertexAI';

const es = new ElasticSearchService();

export async function searchAttorneys({ searchTerm = '', page = 1, limit = 10 }) {
    console.log('[SearchService] Starting search:', { searchTerm, page, limit });
    try {
        const extractedInfo = searchTerm ? 
            await extractInfoWithGemini(searchTerm) : 
            { locations: [], practiceAreas: [], keywords: [] };
            
        console.log('[SearchService] Extracted info:', JSON.stringify(extractedInfo, null, 2));

        const searchParams = {
            query: searchTerm,
            state: extractedInfo.locations?.[0],
            practiceAreas: extractedInfo.practiceAreas,
            page: page,
            limit: limit
        };
        console.log('[SearchService] Search parameters:', JSON.stringify(searchParams, null, 2));

        const searchResults = await es.searchAttorneys(searchParams);

        console.log('[SearchService] Search results:', {
            totalResults: searchResults.total,
            resultCount: searchResults.results.length,
            extractedInfoUsed: {
                hasLocations: extractedInfo.locations?.length > 0,
                hasPracticeAreas: extractedInfo.practiceAreas?.length > 0,
                hasKeywords: extractedInfo.keywords?.length > 0
            }
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