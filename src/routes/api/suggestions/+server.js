import { json } from '@sveltejs/kit';
import { elasticSearchService } from '$lib/services/elasticSearch';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    try {
        const { searchTerm = '' } = await request.json();
        
        const elasticClient = await elasticSearchService.initialize();
        if (!elasticClient) {
            return json({ suggestions: [] }, { status: 503 });
        }

        const searchResponse = await elasticClient.search({
            index: 'attorneys',
            body: {
                query: {
                    bool: {
                        must: [
                            {
                                multi_match: {
                                    query: searchTerm,
                                    fields: ['firstName', 'lastName', 'practiceAreas', 'city', 'state'],
                                    fuzziness: 'AUTO'
                                }
                            },
                            { term: { status: "approved" } }
                        ]
                    }
                },
                size: 5
            }
        });

        const suggestions = searchResponse.hits.hits.map(hit => ({
            text: `${hit._source.firstName} ${hit._source.lastName}`,
            type: 'attorney'
        }));

        return json({ suggestions });

    } catch (error) {
        console.error('[Search Suggestions API] Error:', error);
        return json({ suggestions: [] }, { status: 500 });
    }
} 