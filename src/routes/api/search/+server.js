import { json } from '@sveltejs/kit';
import { ElasticSearchService } from '$lib/services/elasticSearch';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    try {
        const { searchTerm = '', page = 1, limit = 10 } = await request.json();
        
        const results = await ElasticSearchService.searchAttorneys({
            searchTerm,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        return json(results);
    } catch (error) {
        console.error('Search error:', error);
        if (error.message === 'Elasticsearch client not initialized') {
            return json({ error: 'Search service unavailable' }, { status: 503 });
        }
        return json({ error: 'Search failed' }, { status: 500 });
    }
} 