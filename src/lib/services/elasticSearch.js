import { Client } from '@elastic/elasticsearch';

let client = null;

export async function initializeElasticSearch() {
	console.log('[Elasticsearch Service] Initializing client');
	
	try {
		if (!client) {
			const cloudId = process.env.VITE_ELASTICSEARCH_CLOUD_ID;
			const apiKey = process.env.VITE_ELASTICSEARCH_API_KEY;

			if (!cloudId || !apiKey) {
				console.error('[Elasticsearch Service] Missing configuration:', {
					hasCloudId: !!cloudId,
					hasApiKey: !!apiKey
				});
				throw new Error('Missing Elasticsearch configuration');
			}

			console.log('[Elasticsearch Service] Creating new client instance');
			client = new Client({
				cloud: { id: cloudId },
				auth: { apiKey }
			});

			console.log('[Elasticsearch Service] Testing connection');
			await client.ping();
			console.log('[Elasticsearch Service] Connection successful');
		}
		return client;
	} catch (error) {
		console.error('[Elasticsearch Service] Initialization error:', {
			message: error.message,
			stack: error.stack,
			code: error.code
		});
		throw new Error('Unable to connect to search service');
	}
}

export function getClient() {
	if (!client) {
		console.warn('[Elasticsearch Service] Client requested before initialization');
	}
	return client;
}

// For backwards compatibility
export const elasticSearchService = {
	initialize: initializeElasticSearch,
	getClient: getClient
};