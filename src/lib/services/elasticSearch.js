import { Client } from '@elastic/elasticsearch';

export class ElasticSearchService {
    constructor() {
        if (!process.env.VITE_ELASTIC_CLOUD_ID || !process.env.VITE_ELASTIC_API_KEY) {
            throw new Error('Elastic Cloud configuration missing');
        }

        this.client = new Client({
            cloud: {
                id: process.env.VITE_ELASTIC_CLOUD_ID
            },
            auth: {
                apiKey: process.env.VITE_ELASTIC_API_KEY
            }
        });
        this.index = 'attorneys';
    }

    async searchAttorneys({ query, state, practiceAreas, page = 1, limit = 10 }) {
        console.log('[ElasticSearch] Building query with:', {
            query,
            state,
            practiceAreas,
            page,
            limit
        });

        try {
            let esQuery = { match_all: {} };

            if (query?.trim() || state || (practiceAreas && practiceAreas.length > 0)) {
                esQuery = {
                    bool: {
                        must: [],
                        should: []
                    }
                };

                // Log each query component as it's built
                if (query?.trim()) {
                    const textQuery = {
                        multi_match: {
                            query: query.trim(),
                            fields: ['firstName^2', 'lastName^2', 'practiceAreas', 'city', 'state'],
                            type: 'best_fields'
                        }
                    };
                    console.log('[ElasticSearch] Adding text query:', JSON.stringify(textQuery, null, 2));
                    esQuery.bool.must.push(textQuery);
                }

                if (state) {
                    const stateQuery = {
                        match: { state: state }
                    };
                    console.log('[ElasticSearch] Adding state filter:', JSON.stringify(stateQuery, null, 2));
                    esQuery.bool.must.push(stateQuery);
                }

                if (practiceAreas && practiceAreas.length > 0) {
                    const practiceAreaQuery = {
                        terms: { practiceAreas: practiceAreas }
                    };
                    console.log('[ElasticSearch] Adding practice areas filter:', JSON.stringify(practiceAreaQuery, null, 2));
                    esQuery.bool.must.push(practiceAreaQuery);
                }
            }

            console.log('[ElasticSearch] Final query:', JSON.stringify(esQuery, null, 2));

            const response = await this.client.search({
                index: this.index,
                body: {
                    query: esQuery,
                    from: (page - 1) * limit,
                    size: limit
                }
            });

            console.log('[ElasticSearch] Response summary:', {
                total: response.hits.total.value,
                hits: response.hits.hits.length,
                maxScore: response.hits.max_score
            });

            return {
                results: response.hits.hits.map(hit => ({
                    ...hit._source,
                    id: hit._id,
                    score: hit._score
                })),
                total: response.hits.total.value,
                totalPages: Math.ceil(response.hits.total.value / limit)
            };
        } catch (error) {
            console.error('[ElasticSearch] Search error:', error);
            throw error;
        }
    }

    analyzeMatch(hit, query) {
        const matches = [];
        const source = hit._source;

        if (query.bool) {
            if (source.practiceAreas) {
                const matchedPracticeAreas = query.bool.should
                    .filter(clause => clause.match?.practiceAreas)
                    .map(clause => clause.match.practiceAreas.query)
                    .filter(area => source.practiceAreas.includes(area));
                if (matchedPracticeAreas.length > 0) {
                    matches.push(`Practice Areas: ${matchedPracticeAreas.join(', ')}`);
                }
            }

            if (source.state || source.city) {
                const locationClauses = query.bool.should
                    .filter(clause => clause.term?.state || clause.term?.city);
                for (const clause of locationClauses) {
                    if (clause.term?.state?.value === source.state) {
                        matches.push(`State: ${source.state}`);
                    }
                    if (clause.term?.city?.value === source.city) {
                        matches.push(`City: ${source.city}`);
                    }
                }
            }
        }

        return matches;
    }
};