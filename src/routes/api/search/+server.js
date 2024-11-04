import { json } from '@sveltejs/kit';
import { initializeElasticSearch } from '$lib/services/elasticSearch';
import { buildSearchQuery } from '$lib/utils/searchUtils';
import { SEARCH_CONFIG } from '$lib/config/searchConfig';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    try {
        const searchParams = await request.json();
        
        if (!searchParams) {
            return json({ 
                error: 'Invalid search parameters' 
            }, { status: 400 });
        }

        const client = await initializeElasticSearch();
        if (!client) {
            throw new Error('Search service unavailable');
        }

        const query = buildSearchQuery(searchParams);
        
        console.log('Search query:', JSON.stringify(query, null, 2));

        const searchResponse = await client.search({
            index: SEARCH_CONFIG.indices.attorneys,
            body: {
                ...query,
                from: ((searchParams.page || 1) - 1) * (searchParams.limit || SEARCH_CONFIG.resultsPerPage),
                size: searchParams.limit || SEARCH_CONFIG.resultsPerPage,
                track_total_hits: true
            }
        });

        return json({
            results: searchResponse.hits.hits.map(hit => ({
                ...hit._source,
                score: hit._score,
                id: hit._id
            })),
            total: searchResponse.hits.total.value,
            page: parseInt(searchParams.page || 1),
            totalPages: Math.ceil(searchResponse.hits.total.value / (searchParams.limit || SEARCH_CONFIG.resultsPerPage))
        });
    } catch (error) {
        console.error('[Search API] Error:', error);
        
        return json({ 
            error: error.message || 'Search failed',
            code: error.code || 'UNKNOWN_ERROR'
        }, { 
            status: error.status || 500 
        });
    }
} 