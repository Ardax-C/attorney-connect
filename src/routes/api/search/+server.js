import { json } from '@sveltejs/kit';
import { initializeElasticSearch } from '$lib/services/elasticSearch';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    console.log('[Search API] Starting search request');
    
    try {
        // Parse request body
        const searchParams = await request.json().catch(e => {
            console.error('[Search API] Failed to parse request body:', e);
            throw new Error('Invalid request body');
        });

        console.log('[Search API] Search parameters:', searchParams);

        // Initialize Elasticsearch with retries
        let client = null;
        let initError = null;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`[Search API] Elasticsearch initialization attempt ${attempt}`);
                client = await initializeElasticSearch();
                break;
            } catch (error) {
                initError = error;
                console.error('[Search API] Initialization attempt failed:', {
                    attempt,
                    error: error.message,
                    cause: error.cause?.message,
                    meta: error.meta
                });
                
                if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }

        if (!client) {
            console.error('[Search API] All initialization attempts failed:', initError);
            return json({
                error: 'Search service unavailable',
                details: initError?.message || 'Failed to initialize search client'
            }, { status: 503 });
        }

        // Build search query
        const query = {
            index: 'attorneys',
            body: {
                query: {
                    bool: {
                        must: []
                    }
                },
                size: 10,
                from: ((searchParams.currentPage || 1) - 1) * 10
            }
        };

        // Add search term if provided
        if (searchParams.searchTerm) {
            query.body.query.bool.must.push({
                multi_match: {
                    query: searchParams.searchTerm,
                    fields: ['name^2', 'specialties', 'description', 'location'],
                    fuzziness: 'AUTO'
                }
            });
        }

        console.log('[Search API] Executing search with query:', JSON.stringify(query, null, 2));

        // Execute search with timeout
        const searchPromise = client.search(query);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Search timeout')), 5000)
        );

        const result = await Promise.race([searchPromise, timeoutPromise]);

        console.log('[Search API] Search completed successfully:', {
            total: result.hits.total.value,
            took: result.took,
            timedOut: result.timed_out
        });

        return json({
            results: result.hits.hits.map(hit => ({
                ...hit._source,
                score: hit._score
            })),
            total: result.hits.total.value,
            took: result.took
        });

    } catch (error) {
        console.error('[Search API] Error details:', {
            message: error.message,
            name: error.name,
            code: error.code,
            stack: error.stack,
            meta: error.meta ? {
                statusCode: error.meta.statusCode,
                headers: error.meta.headers,
                body: JSON.stringify(error.meta.body, null, 2)
            } : 'No meta data'
        });

        // Return appropriate error response
        const status = error.meta?.statusCode || 500;
        const message = status === 404 ? 'No results found' :
                       status === 503 ? 'Search service unavailable' :
                       'Search failed';

        return json({
            error: message,
            details: error.message,
            code: error.code || 'UNKNOWN_ERROR'
        }, { 
            status: status
        });
    }
} 