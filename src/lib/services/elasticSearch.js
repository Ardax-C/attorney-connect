import { Client } from '@elastic/elasticsearch';

let client = null;

const ES_NODE = process.env.VITE_ELASTICSEARCH_NODE;

export async function initializeElasticSearch() {
	console.log('[Elasticsearch Service] Starting initialization');
	
	try {
		// Check existing client
		if (client) {
			try {
				await client.ping();
				console.log('[Elasticsearch Service] Reusing existing client');
				return client;
			// eslint-disable-next-line no-unused-vars
			} catch (e) {
				console.log('[Elasticsearch Service] Existing client failed health check');
				client = null;
			}
		}

		const apiKey = process.env.VITE_ELASTICSEARCH_API_KEY;

		console.log('[Elasticsearch Service] Configuration check:', {
			node: ES_NODE,
			hasApiKey: !!apiKey,
			apiKeyLength: apiKey?.length || 0
		});

		if (!apiKey) {
			throw new Error('Missing required API key');
		}

		// Create client with direct node configuration
		const config = {
			node: ES_NODE,
			auth: {
				apiKey: apiKey
			},
			tls: {
				rejectUnauthorized: false
			}
		};

		console.log('[Elasticsearch Service] Creating client');
		client = new Client(config);

		// Test connection
		console.log('[Elasticsearch Service] Testing connection');
		const info = await client.info();
		
		console.log('[Elasticsearch Service] Connected successfully:', {
			name: info.name,
			clusterName: info.cluster_name,
			version: info.version.number
		});

		return client;

	} catch (error) {
		console.error('[Elasticsearch Service] Initialization error:', {
			message: error.message,
			name: error.name,
			code: error.code,
			cause: error.cause?.message
		});

		client = null;
		throw new Error('Unable to connect to search service', { cause: error });
	}
}

export function getClient() {
	if (!client) {
		console.warn('[Elasticsearch Service] Client requested before initialization');
	}
	return client;
}