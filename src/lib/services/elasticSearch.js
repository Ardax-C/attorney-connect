import { Client } from '@elastic/elasticsearch';

let client = null;
let initializationAttempts = 0;
const MAX_ATTEMPTS = 3;

export async function initializeElasticSearch() {
	console.log('[Elasticsearch Service] Starting initialization attempt', { attempt: initializationAttempts + 1, max: MAX_ATTEMPTS });
	
	try {
		// If we already have a client, test it first
		if (client) {
			try {
				await client.ping();
				console.log('[Elasticsearch Service] Existing client is healthy');
				return client;
			} catch (e) {
				console.log('[Elasticsearch Service] Existing client failed health check, creating new instance, ' + e);
				client = null;
			}
		}

		const cloudId = process.env.VITE_ELASTICSEARCH_CLOUD_ID;
		const apiKey = process.env.VITE_ELASTICSEARCH_API_KEY;

		// Log environment variable status (safely)
		console.log('[Elasticsearch Service] Configuration check:', {
			hasCloudId: typeof cloudId === 'string' && cloudId.length > 0,
			hasApiKey: typeof apiKey === 'string' && apiKey.length > 0,
			cloudIdPrefix: cloudId?.substring(0, 10) + '...',
			apiKeyPrefix: apiKey?.substring(0, 5) + '...'
		});

		if (!cloudId || !apiKey) {
			throw new Error('Missing required Elasticsearch configuration');
		}

		// Create new client with timeout and retry options
		client = new Client({
			cloud: { id: cloudId },
			auth: { apiKey },
			tl: { rejectUnauthorized: false },
			requestTimeout: 10000, // 10 second timeout
			maxRetries: 3,
			sniffOnStart: true,
			node: process.env.NODE_ENV === 'development' 
				? 'http://localhost:9200' 
				: undefined
		});

		// Test connection with retries
		let connected = false;
		let lastError = null;

		while (!connected && initializationAttempts < MAX_ATTEMPTS) {
			try {
				console.log('[Elasticsearch Service] Testing connection attempt', { attempt: initializationAttempts + 1 });
				
				await client.ping();
				connected = true;
				
				console.log('[Elasticsearch Service] Connection successful');
				
				// Get cluster info for verification
				const info = await client.info();
				console.log('[Elasticsearch Service] Cluster info:', {
					name: info.name,
					version: info.version.number,
					distribution: info.version.distribution
				});

			} catch (error) {
				lastError = error;
				initializationAttempts++;
				
				console.error('[Elasticsearch Service] Connection attempt failed:', {
					attempt: initializationAttempts,
					error: error.message,
					name: error.name,
					meta: error.meta?.statusCode
				});

				if (initializationAttempts < MAX_ATTEMPTS) {
					// Wait before retry (exponential backoff)
					const delay = Math.min(1000 * Math.pow(2, initializationAttempts), 5000);
					await new Promise(resolve => setTimeout(resolve, delay));
				}
			}
		}

		if (!connected) {
			throw new Error('Failed to connect after multiple attempts', { cause: lastError });
		}

		return client;

	} catch (error) {
		console.error('[Elasticsearch Service] Fatal initialization error:', {
			message: error.message,
			name: error.name,
			code: error.code,
			meta: error.meta?.statusCode,
			cause: error.cause?.message
		});

		// Reset client and attempts on fatal error
		client = null;
		initializationAttempts = 0;
		
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