import { Client } from '@elastic/elasticsearch';
import { SEARCH_CONFIG } from '../config/searchConfig';

class ElasticSearchService {
	constructor() {
		this.client = null;
		this.index = SEARCH_CONFIG.indices.attorneys;
	}

	async initialize() {
		if (!this.client) {
			try {
				this.client = new Client({
					cloud: {
						id: SEARCH_CONFIG.elasticSearch.cloud.id
					},
					auth: {
						apiKey: SEARCH_CONFIG.elasticSearch.auth.apiKey
					},
					node: SEARCH_CONFIG.elasticSearch.node,
					tls: {
						rejectUnauthorized: true
					}
				});
				
				await this.testConnection();
				console.log('[ElasticSearch] Successfully connected to cloud instance');
			} catch (error) {
				console.error('[ElasticSearch] Cloud connection failed:', error);
				throw error;
			}
		}
		return this.client;
	}

	async search(query, options = {}) {
		if (!this.client) {
			await this.initialize();
		}

		try {
			const response = await this.client.search({
				index: this.index,
				...options,
				body: query
			});

			return response;
		} catch (error) {
			console.error('[ElasticSearch] Search failed:', error);
			throw error;
		}
	}

	async testConnection() {
		try {
			const health = await this.client.cluster.health();
			return health.status !== 'red';
		} catch (error) {
			console.error('[ElasticSearch] Health check failed:', error);
			return false;
		}
	}
}

// Create a singleton instance
export const elasticSearchService = new ElasticSearchService();

// Export the initialization function
export const initializeElasticSearch = async () => {
	return elasticSearchService.initialize();
};