import { Client } from '@elastic/elasticsearch';
import { analyzeSearchTerm } from './searchUtils';

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

    async searchAttorneys({ searchTerm = '', page = 1, limit = 10 }) {
        console.log('[ElasticSearch] Constructing query:', { searchTerm, page, limit });
        try {
            let query = { match_all: {} };

            if (searchTerm?.trim()) {
                const extractedInfo = await analyzeSearchTerm(searchTerm);
                console.log('[ElasticSearch] Extracted search info:', extractedInfo);

                query = {
                    bool: {
                        should: [
                            ...extractedInfo.practiceAreas.map(area => ({
                                match: {
                                    practiceAreas: {
                                        query: area,
                                        boost: 4
                                    }
                                }
                            })),

                            ...extractedInfo.locations.map(location => ([
                                {
                                    term: {
                                        state: {
                                            value: location,
                                            boost: 3
                                        }
                                    }
                                },
                                {
                                    term: {
                                        city: {
                                            value: location,
                                            boost: 3
                                        }
                                    }
                                }
                            ])).flat(),

                            ...extractedInfo.keywords.map(keyword => ({
                                match: {
                                    'keywords.keywords': {
                                        query: keyword,
                                        boost: 2
                                    }
                                }
                            })),

                            {
                                multi_match: {
                                    query: searchTerm,
                                    fields: ['firstName^2', 'lastName^2', 'practiceAreas', 'city', 'state'],
                                    type: 'best_fields',
                                    boost: 1
                                }
                            }
                        ],
                        minimum_should_match: 1
                    }
                };

                if (extractedInfo.isGeneralSearch) {
                    query.bool.minimum_should_match = 1;
                } else {
                    query.bool.minimum_should_match = Math.ceil(
                        (extractedInfo.practiceAreas.length + 
                         extractedInfo.locations.length + 
                         extractedInfo.keywords.length) * 0.3
                    );
                }
            }

            console.log('[ElasticSearch] Query object:', JSON.stringify(query, null, 2));

            const response = await this.client.search({
                index: this.index,
                body: {
                    query,
                    from: (page - 1) * limit,
                    size: limit,
                    sort: [
                        { _score: 'desc' },
                        { 'lastName.keyword': 'asc' }
                    ]
                }
            });

            console.log('[ElasticSearch] Raw response:', {
                total: response.hits.total.value,
                hits: response.hits.hits.length,
                maxScore: response.hits.max_score
            });

            return {
                results: response.hits.hits.map(hit => ({
                    ...hit._source,
                    id: hit._id,
                    score: hit._score,
                    matchedOn: this.analyzeMatch(hit, query)
                })),
                total: response.hits.total.value,
                totalPages: Math.ceil(response.hits.total.value / limit)
            };
        } catch (error) {
            console.error('[ElasticSearch] Query error:', error);
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