import { json } from '@sveltejs/kit';
import { initializeElasticSearch } from '$lib/services/elasticSearch';
import { buildSearchQuery } from '$lib/utils/searchUtils';
import { SEARCH_CONFIG } from '$lib/config/searchConfig';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    console.log('[Search API] Received search request');
    
    try {
        const searchParams = await request.json();
        console.log('[Search API] Search parameters:', searchParams);
        
        // Initialize Elasticsearch client
        console.log('[Search API] Initializing Elasticsearch');
        const client = await initializeElasticSearch();
        console.log('[Search API] Elasticsearch initialized successfully');
        
        const query = buildSearchQuery(searchParams);
        console.log('[Search API] Built search query:', JSON.stringify(query, null, 2));

        const searchResponse = await client.search({
            index: SEARCH_CONFIG.indices.attorneys,
            body: {
                ...query,
                from: ((searchParams.page || 1) - 1) * (searchParams.limit || SEARCH_CONFIG.resultsPerPage),
                size: searchParams.limit || SEARCH_CONFIG.resultsPerPage,
                track_total_hits: true
            }
        });

        console.log('[Search API] Search response received:', {
            totalHits: searchResponse.hits.total.value,
            resultCount: searchResponse.hits.hits.length
        });

        const response = {
            results: searchResponse.hits.hits.map(hit => ({
                ...hit._source,
                score: hit._score,
                id: hit._id
            })),
            total: searchResponse.hits.total.value,
            page: parseInt(searchParams.page || 1),
            totalPages: Math.ceil(searchResponse.hits.total.value / (searchParams.limit || SEARCH_CONFIG.resultsPerPage))
        };

        console.log('[Search API] Sending response:', {
            resultCount: response.results.length,
            totalPages: response.totalPages,
            currentPage: response.page
        });

        return json(response);
    } catch (error) {
        console.error('[Search API] Error:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            status: error.status
        });

        return json({ 
            error: error.message || 'Search failed',
            code: error.code || 'UNKNOWN_ERROR'
        }, { 
            status: error.status || 500 
        });
    }
} 