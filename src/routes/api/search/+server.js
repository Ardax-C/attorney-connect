import { json } from '@sveltejs/kit';
import { searchAttorneys } from '$lib/services/searchService';
import { buildSearchQuery } from '$lib/utils/searchUtils';
import { SEARCH_CONFIG } from '$lib/config/searchConfig';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    console.log('[Search API] Received search request');
    try {
        const searchParams = await request.json();
        const query = buildSearchQuery(searchParams);
        
        const results = await searchAttorneys({
            query,
            page: parseInt(searchParams.page || 1),
            limit: parseInt(searchParams.limit || SEARCH_CONFIG.resultsPerPage)
        });
        
        if (results.error) {
            return json({ error: results.error }, { status: 503 });
        }

        return json(results);
    } catch (error) {
        console.error('[Search API] Error:', error);
        return json({ error: 'Search failed' }, { status: 500 });
    }
} 