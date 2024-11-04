import { json } from '@sveltejs/kit';
import { elasticSearchService } from '$lib/services/elasticSearch';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    try {
        const { searchTerm = '', currentPage = 1 } = await request.json();
        
        // Add connection verification
        const elasticClient = await elasticSearchService.initialize();
        if (!elasticClient) {
            console.error('[Search API] Failed to initialize Elasticsearch client');
            return new Response(JSON.stringify({ 
                error: 'Search service unavailable',
                details: 'Failed to connect to Elasticsearch'
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Test connection explicitly
        const isHealthy = await elasticSearchService.testConnection();
        if (!isHealthy) {
            console.error('[Search API] Elasticsearch health check failed');
            return new Response(JSON.stringify({ 
                error: 'Search service unhealthy',
                details: 'Elasticsearch cluster is not healthy'
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let searchQuery;

        if (!searchTerm.trim()) {
            searchQuery = {
                query: {
                    bool: {
                        must: [{ match_all: {} }],
                        filter: [{ term: { status: "approved" } }]
                    }
                }
            };
        } else {
            const hasAndOperator = searchTerm.toLowerCase().includes(' and ');
            const hasOrOperator = searchTerm.toLowerCase().includes(' or ');

            const baseQuery = {
                bool: {
                    should: [
                        // Text fields
                        {
                            multi_match: {
                                query: searchTerm,
                                fields: [
                                    "firstName^3",
                                    "lastName^3",
                                    "bio"
                                ],
                                type: "phrase_prefix",
                                boost: 2
                            }
                        },
                        // Keyword fields
                        {
                            multi_match: {
                                query: searchTerm,
                                fields: [
                                    "city^2",
                                    "state^2",
                                    "practiceAreas^2"
                                ],
                                type: "best_fields",
                                operator: "or",
                                boost: 1.5
                            }
                        },
                        // Fuzzy matching
                        {
                            multi_match: {
                                query: searchTerm,
                                fields: [
                                    "firstName^3",
                                    "lastName^3",
                                    "practiceAreas^2",
                                    "city^2",
                                    "state^2",
                                    "bio"
                                ],
                                fuzziness: "AUTO",
                                operator: "or",
                                boost: 1
                            }
                        }
                    ],
                    minimum_should_match: 1
                }
            };

            if (hasAndOperator || hasOrOperator) {
                const operator = hasAndOperator ? ' and ' : ' or ';
                const terms = searchTerm.toLowerCase().split(operator).map(term => term.trim());
                
                searchQuery = {
                    query: {
                        bool: {
                            [hasAndOperator ? 'must' : 'should']: terms.map(term => ({
                                bool: {
                                    should: [
                                        // Text fields
                                        {
                                            multi_match: {
                                                query: term,
                                                fields: [
                                                    "firstName^3",
                                                    "lastName^3",
                                                    "bio"
                                                ],
                                                type: "phrase_prefix",
                                                boost: 2
                                            }
                                        },
                                        // Keyword fields
                                        {
                                            multi_match: {
                                                query: term,
                                                fields: [
                                                    "city^2",
                                                    "state^2",
                                                    "practiceAreas^2"
                                                ],
                                                type: "best_fields",
                                                operator: "or",
                                                boost: 1.5
                                            }
                                        },
                                        // Fuzzy matching
                                        {
                                            multi_match: {
                                                query: term,
                                                fields: [
                                                    "firstName^3",
                                                    "lastName^3",
                                                    "practiceAreas^2",
                                                    "city^2",
                                                    "state^2",
                                                    "bio"
                                                ],
                                                fuzziness: "AUTO",
                                                operator: "or",
                                                boost: 1
                                            }
                                        }
                                    ],
                                    minimum_should_match: 1
                                }
                            })),
                            filter: [{ term: { status: "approved" } }],
                            minimum_should_match: hasOrOperator ? 1 : undefined
                        }
                    }
                };
            } else {
                searchQuery = {
                    query: {
                        bool: {
                            must: [baseQuery],
                            filter: [{ term: { status: "approved" } }]
                        }
                    }
                };
            }
        }

        searchQuery.sort = ["_score", { "lastName.keyword": "asc" }, { "firstName.keyword": "asc" }];
        searchQuery.from = (currentPage - 1) * 10;
        searchQuery.size = 10;

        const searchResponse = await elasticSearchService.search(searchQuery);

        const attorneys = searchResponse.hits.hits.map(hit => ({
            id: hit._id,
            name: `${hit._source.firstName} ${hit._source.lastName}`.trim(),
            location: `${hit._source.city}, ${hit._source.state}`.trim(),
            practiceAreas: hit._source.practiceAreas || [],
            profilePicture: hit._source.profilePictureUrl || '',
            website: hit._source.website || '',
            score: hit._score
        }));

        return json({
            attorneys,
            total: searchResponse.hits.total.value,
            totalPages: Math.ceil(searchResponse.hits.total.value / 10)
        });
    } catch (error) {
        console.error('[Search API] Error:', error);
        
        // More detailed error response
        return new Response(JSON.stringify({ 
            error: 'Search failed',
            details: error.message,
            code: error.code || 'UNKNOWN'
        }), {
            status: error.status || 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 