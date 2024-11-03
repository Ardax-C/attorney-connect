import { Client } from '@elastic/elasticsearch';
import { getStorage } from 'firebase/storage';
import { extractInfoWithGemini } from '../vertexAI';

export const ElasticSearchService = {
    client: new Client({
        cloud: {
            id: import.meta.env.VITE_ELASTIC_CLOUD_ID
        },
        auth: {
            apiKey: import.meta.env.VITE_ELASTIC_API_KEY
        },
        maxRetries: 3,
        requestTimeout: 30000
    }),

    storage: getStorage(),

    async searchAttorneys({ searchTerm = '', page = 1, limit = 10 }) {
        try {
            let query = { match_all: {} };

            if (searchTerm?.trim()) {
                // First, analyze the search term with VertexAI
                const extractedInfo = await extractInfoWithGemini(searchTerm);
                console.log('Extracted search info:', extractedInfo);

                // Build compound query based on extracted information
                query = {
                    bool: {
                        should: [
                            // Practice area matches (highest priority)
                            ...extractedInfo.practiceAreas.map(area => ({
                                match: {
                                    practiceAreas: {
                                        query: area,
                                        boost: 4
                                    }
                                }
                            })),

                            // Location matches
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

                            // Keyword matches
                            ...extractedInfo.keywords.map(keyword => ({
                                match: {
                                    'keywords.keywords': {
                                        query: keyword,
                                        boost: 2
                                    }
                                }
                            })),

                            // Original query as fallback
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

                // If it's a general search, adjust minimum_should_match
                if (extractedInfo.isGeneralSearch) {
                    query.bool.minimum_should_match = 1;
                } else {
                    // Require more matches for specific searches
                    query.bool.minimum_should_match = Math.ceil(
                        (extractedInfo.practiceAreas.length + 
                         extractedInfo.locations.length + 
                         extractedInfo.keywords.length) * 0.3
                    );
                }
            }

            const response = await this.client.search({
                index: 'attorneys',
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
            console.error('Elasticsearch error:', error);
            throw error;
        }
    },

    // Helper method to analyze why a document matched
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