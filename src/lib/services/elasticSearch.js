import { Client } from '@elastic/elasticsearch';

let client = null;

export async function initializeElasticSearch() {
	console.log('[Elasticsearch Service] Starting initialization');
	
	try {
		const cloudId = process.env.VITE_ELASTICSEARCH_CLOUD_ID;
		const apiKey = process.env.VITE_ELASTICSEARCH_API_KEY;

		console.log('[Elasticsearch Service] Environment variables check:', {
			hasCloudId: !!cloudId,
			cloudIdLength: cloudId?.length,
			hasApiKey: !!apiKey,
			apiKeyLength: apiKey?.length
		});

		if (!cloudId || !apiKey) {
			throw new Error('Missing required Elasticsearch configuration');
		}

		if (!client) {
			console.log('[Elasticsearch Service] Creating new client instance');
			client = new Client({
				cloud: { id: cloudId },
				auth: { apiKey },
				tl: { rejectUnauthorized: false }
			});

			console.log('[Elasticsearch Service] Testing connection');
			await client.ping();
			console.log('[Elasticsearch Service] Connection successful');
		}

		return client;
	} catch (error) {
		console.error('[Elasticsearch Service] Initialization failed:', {
			errorName: error.name,
			errorMessage: error.message,
			errorCode: error.code,
			errorStack: error.stack,
			meta: error.meta
		});

		if (error.name === 'ConnectionError') {
			console.error('[Elasticsearch Service] Connection error details:', {
				host: error.meta?.body?.host,
				port: error.meta?.body?.port,
				protocol: error.meta?.body?.protocol
			});
		}

		throw new Error('Unable to connect to search service', { cause: error });
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