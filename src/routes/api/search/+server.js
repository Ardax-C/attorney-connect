import { json } from '@sveltejs/kit';
import { elasticSearchService } from '$lib/services/elasticSearch';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    try {
        const { query = '', filters = {}, page = 1 } = await request.json();
        const pageSize = 10; // Number of results per page
        
        const elasticClient = await elasticSearchService.initialize();
        if (!elasticClient) {
            return json({ attorneys: [], total: 0, totalPages: 0, facets: {} }, { status: 503 });
        }

        const must = [];

        // Add search query if present
        if (query) {
            must.push({
                multi_match: {
                    query,
                    fields: ['firstName', 'lastName', 'practiceAreas', 'city', 'state'],
                    fuzziness: 'AUTO'
                }
            });
        }

        // Add filters
        if (filters.practiceAreas?.length > 0) {
            must.push({
                terms: {
                    practiceAreas: filters.practiceAreas
                }
            });
        }

        if (filters.states?.length > 0) {
            must.push({
                terms: {
                    state: filters.states
                }
            });
        }

        if (filters.cities?.length > 0) {
            must.push({
                terms: {
                    city: filters.cities
                }
            });
        }

        // Always include approved status
        must.push({ term: { status: "approved" } });

        const searchResponse = await elasticClient.search({
            index: 'attorneys',
            body: {
                query: {
                    bool: { must }
                },
                from: (page - 1) * pageSize,
                size: pageSize,
                aggs: {
                    practice_areas: {
                        terms: { 
                            field: 'practiceAreas',
                            size: 100 
                        }
                    },
                    states: {
                        terms: { 
                            field: 'state',
                            size: 100 
                        }
                    },
                    cities: {
                        terms: { 
                            field: 'city',
                            size: 100 
                        }
                    }
                }
            }
        });

        const attorneys = searchResponse.hits.hits.map(hit => ({
            id: hit._id,
            name: `${hit._source.firstName} ${hit._source.lastName}`,
            location: `${hit._source.city}, ${hit._source.state}`,
            practiceAreas: hit._source.practiceAreas || [],
            profilePicture: hit._source.profilePictureUrl || null,
            website: hit._source.website || '',
            highlights: hit._source.highlights || {}
        }));

        const facets = {
            practiceAreas: searchResponse.aggregations?.practice_areas?.buckets?.map(b => b.key) || [],
            states: searchResponse.aggregations?.states?.buckets?.map(b => b.key) || [],
            cities: searchResponse.aggregations?.cities?.buckets?.map(b => b.key) || []
        };

        return json({
            attorneys,
            total: searchResponse.hits.total.value,
            totalPages: Math.ceil(searchResponse.hits.total.value / pageSize),
            facets,
            currentPage: page
        });

    } catch (error) {
        console.error('[Search API] Error:', error);
        return json({ 
            attorneys: [], 
            total: 0, 
            totalPages: 0, 
            facets: {},
            currentPage: 1
        }, { status: 500 });
    }
} 