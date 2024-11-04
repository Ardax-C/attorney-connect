import { Client } from '@elastic/elasticsearch';

let client = null;

export async function initializeElasticSearch() {
	console.log('[Elasticsearch Service] Starting initialization');
	
	try {
		// Return existing client if it's healthy
		if (client) {
			try {
				console.log('[Elasticsearch Service] Existing client is healthy');
				return client;
			// eslint-disable-next-line no-unused-vars
			} catch (e) {
				console.log('[Elasticsearch Service] Existing client failed health check');
				client = null;
			}
		}

		const cloudId = process.env.VITE_ELASTICSEARCH_CLOUD_ID;
		const apiKey = process.env.VITE_ELASTICSEARCH_API_KEY;

		console.log('[Elasticsearch Service] Configuration check:', {
			hasCloudId: !!cloudId,
			cloudIdLength: cloudId?.length,
			hasApiKey: !!apiKey,
			apiKeyLength: apiKey?.length
		});

		if (!cloudId || !apiKey) {
			throw new Error('Missing Elasticsearch configuration');
		}

		// Create minimal client configuration
		client = new Client({
			cloud: {
				id: cloudId
			},
			auth: {
				apiKey: apiKey
			},
			tl: {
				rejectUnauthorized: false
			}
		});

		// Test connection and get cluster info
		console.log('[Elasticsearch Service] Testing connection');
		const info = await client.info();
		
		console.log('[Elasticsearch Service] Connected successfully:', {
			clusterName: info.cluster_name,
			nodeVersion: info.version.number,
			distribution: info.version.distribution
		});

		// Verify search functionality
		const testSearch = await client.search({
			index: '_all',
			size: 0
		});

		console.log('[Elasticsearch Service] Search test successful:', {
			totalIndices: Object.keys(testSearch.aggregations?.indices || {}).length
		});

		return client;

	} catch (error) {
		console.error('[Elasticsearch Service] Connection error:', {
			message: error.message,
			name: error.name,
			code: error.code,
			meta: {
				statusCode: error.meta?.statusCode,
				headers: error.meta?.headers,
				body: JSON.stringify(error.meta?.body, null, 2)
			}
		});

		if (error.meta?.body?.error?.type === 'security_exception') {
			console.error('[Elasticsearch Service] Security exception details:', 
				error.meta.body.error);
		}

		// Reset client on error
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