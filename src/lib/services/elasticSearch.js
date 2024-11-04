import { Client } from '@elastic/elasticsearch';

class ElasticSearchService {
	constructor() {
		this.client = null;
	}

	async initialize() {
		try {
			const cloudId = process.env.VITE_ELASTICSEARCH_CLOUD_ID;
			const apiKey = process.env.VITE_ELASTICSEARCH_API_KEY;

			if (!cloudId || !apiKey) {
				throw new Error('Missing Elasticsearch configuration');
			}

			this.client = new Client({
				cloud: { id: cloudId },
				auth: { apiKey }
			});

			await this.client.ping();
			console.log('Successfully connected to Elasticsearch');
			return true;
		} catch (error) {
			console.error('Failed to initialize Elasticsearch:', error);
			return false;
		}
	}

	getClient() {
		return this.client;
	}
}

export const elasticSearchService = new ElasticSearchService();
export { ElasticSearchService };