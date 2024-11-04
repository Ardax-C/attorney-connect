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
        console.log('[Search API] Initializing Elasticsearch client');
        const client = await initializeElasticSearch();
        
        if (!client) {
            console.error('[Search API] Failed to initialize Elasticsearch client');
            throw new Error('Search service unavailable');
        }

        console.log('[Search API] Building search query');
        const query = buildSearchQuery(searchParams);
        console.log('[Search API] Search query:', JSON.stringify(query, null, 2));

        // Execute search
        console.log('[Search API] Executing search');
        const result = await client.search({
            index: SEARCH_CONFIG.index,
            ...query
        });
        
        console.log('[Search API] Search completed successfully');
        console.log('[Search API] Total hits:', result.hits.total);

        return json({
            results: result.hits.hits.map(hit => hit._source),
            total: result.hits.total.value
        });

    } catch (error) {
        console.error('[Search API] Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            name: error.name,
            meta: error.meta
        });

        // Check for specific Elasticsearch errors
        if (error.meta?.body?.error) {
            console.error('[Search API] Elasticsearch error:', error.meta.body.error);
        }

        // Check environment variables
        console.log('[Search API] Environment check:', {
            hasCloudId: !!process.env.VITE_ELASTICSEARCH_CLOUD_ID,
            hasApiKey: !!process.env.VITE_ELASTICSEARCH_API_KEY
        });

        return json({ 
            error: error.message || 'Search failed',
            code: error.code || 'UNKNOWN_ERROR'
        }, { 
            status: error.status || 500 
        });
    }
} 