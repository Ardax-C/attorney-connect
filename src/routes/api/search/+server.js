import { json } from '@sveltejs/kit';
import { searchAttorneys } from '$lib/services/searchService';
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

        const query = buildSearchQuery(searchParams);
        
        console.log('Search query:', JSON.stringify(query, null, 2));

        const results = await searchAttorneys({
            query,
            page: parseInt(searchParams.page || 1),
            limit: parseInt(searchParams.limit || SEARCH_CONFIG.resultsPerPage)
        });

        if (!results) {
            return json({ 
                error: 'No results returned from search service' 
            }, { status: 503 });
        }

        return json(results);
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