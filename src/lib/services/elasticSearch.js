import { Client } from '@elastic/elasticsearch';
import { SEARCH_CONFIG } from '../config/searchConfig';

class ElasticSearchService {
	constructor() {
		this.client = null;
		this.index = SEARCH_CONFIG.indices.attorneys;
		this.initialized = false;
	}

	async initialize() {
		if (this.initialized && this.client) {
			return this.client;
		}

		try {
			// Debug logging
			console.log('[ElasticSearch] Config:', {
				cloudId: !!SEARCH_CONFIG.elasticSearch.cloud.id,
				apiKey: !!SEARCH_CONFIG.elasticSearch.auth.apiKey,
				node: !!SEARCH_CONFIG.elasticSearch.node
			});

			// Verify environment variables
			if (!SEARCH_CONFIG.elasticSearch.cloud.id || 
				!SEARCH_CONFIG.elasticSearch.auth.apiKey || 
				!SEARCH_CONFIG.elasticSearch.node) {
				throw new Error('Missing required Elasticsearch configuration');
			}

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
			
			// Test connection immediately
			const isHealthy = await this.testConnection();
			if (!isHealthy) {
				throw new Error('Failed initial health check');
			}

			this.initialized = true;
			console.log('[ElasticSearch] Successfully connected to cloud instance');
			return this.client;
		} catch (error) {
			this.client = null;
			this.initialized = false;
			console.error('[ElasticSearch] Initialization failed:', error);
			throw error;
		}
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
			if (!this.client) return false;
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