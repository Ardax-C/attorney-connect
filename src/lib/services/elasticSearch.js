import { Client } from '@elastic/elasticsearch';
import { browser } from '$app/environment';
import { analyzeSearchTerm } from './searchUtils';

export class ElasticSearchService {
    constructor() {
        // Debug environment variables
        console.log('Environment check:', {
            hasCloudId: !!import.meta.env.VITE_ELASTIC_CLOUD_ID,
            hasApiKey: !!import.meta.env.VITE_ELASTIC_API_KEY,
            isBrowser: browser
        });

        // Skip initialization during SSR
        if (!browser) {
            console.log('Skipping Elasticsearch initialization (SSR)');
            this.client = null;
            return;
        }

        if (!import.meta.env.VITE_ELASTIC_CLOUD_ID || !import.meta.env.VITE_ELASTIC_API_KEY) {
            console.error('Missing Elasticsearch configuration:', {
                cloudId: import.meta.env.VITE_ELASTIC_CLOUD_ID ? 'present' : 'missing',
                apiKey: import.meta.env.VITE_ELASTIC_API_KEY ? 'present' : 'missing'
            });
            this.client = null;
            return;
        }

        try {
            this.client = new Client({
                cloud: {
                    id: import.meta.env.VITE_ELASTIC_CLOUD_ID
                },
                auth: {
                    apiKey: import.meta.env.VITE_ELASTIC_API_KEY
                }
            });
            this.index = 'attorneys';
            console.log('Elasticsearch client initialized successfully');
        } catch (error) {
            console.error('Error initializing Elasticsearch client:', error);
            this.client = null;
        }
    }

    async testConnection() {
        if (!this.client) {
            console.error('No Elasticsearch client available');
            return false;
        }

        try {
            const response = await this.client.ping();
            console.log('Elasticsearch connection test:', response);
            return true;
        } catch (error) {
            console.error('Elasticsearch connection test failed:', error);
            return false;
        }
    }

    async searchAttorneys({ searchTerm = '', page = 1, limit = 10 }) {
        if (!this.client) {
            console.warn('Elasticsearch client not available for search');
            return {
                results: [],
                total: 0,
                totalPages: 0,
                error: 'Search service unavailable'
            };
        }

        console.log('[ElasticSearch] Search parameters:', { searchTerm, page, limit });
        try {
            let query = { match_all: {} };

            if (searchTerm?.trim()) {
                const extractedInfo = await analyzeSearchTerm(searchTerm);
                console.log('[ElasticSearch] Query construction:', {
                    extractedInfo,
                    searchTerm,
                    query: JSON.stringify(query, null, 2)
                });

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

            console.log('[ElasticSearch] Final query:', JSON.stringify(query, null, 2));

            const searchBody = {
                query,
                from: (page - 1) * limit,
                size: limit,
                sort: [
                    { _score: 'desc' },
                    { 'lastName.keyword': 'asc' }
                ]
            };
            console.log('[ElasticSearch] Search body:', JSON.stringify(searchBody, null, 2));

            const response = await this.client.search({
                index: this.index,
                body: searchBody
            });

            console.log('[ElasticSearch] Raw response:', {
                total: response.hits.total.value,
                maxScore: response.hits.max_score,
                hits: response.hits.hits.length
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
            console.error('[ElasticSearch] Error:', error);
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