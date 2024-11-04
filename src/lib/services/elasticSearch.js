import { Client } from '@elastic/elasticsearch';

let client = null;

function decodeCloudId(cloudId) {
	console.log('[Elasticsearch Service] Decoding Cloud ID');
	
	try {
		const [name, data] = cloudId.split(':');
		if (!data) {
			throw new Error('Invalid Cloud ID format');
		}

		const decoded = Buffer.from(data, 'base64').toString('utf8');
		const [cloud, region, host] = decoded.split('$');

		if (!cloud || !region || !host) {
			throw new Error('Invalid Cloud ID data');
		}

		console.log('[Elasticsearch Service] Decoded Cloud ID:', {
			name,
			cloud,
			region,
			hostPrefix: host.substring(0, 10) + '...'
		});

		return {
			name,
			cloud,
			region,
			host
		};
	} catch (error) {
		console.error('[Elasticsearch Service] Cloud ID decode error:', error);
		throw new Error('Failed to decode Cloud ID');
	}
}

export async function initializeElasticSearch() {
	console.log('[Elasticsearch Service] Starting initialization');
	
	try {
		if (client) {
			try {
				await client.ping();
				return client;
			// eslint-disable-next-line no-unused-vars
			} catch (e) {
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

		// Decode and validate Cloud ID
		const decodedCloud = decodeCloudId(cloudId);
		
		// Construct the node URL
		const node = `https://${decodedCloud.host}:443`;
		
		console.log('[Elasticsearch Service] Creating client with node:', {
			node,
			cloudName: decodedCloud.name
		});

		// Create client with explicit node configuration
		client = new Client({
			node,
			auth: {
				apiKey
			},
			tls: {
				rejectUnauthorized: false
			},
			compression: true
		});

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
		console.error('[Elasticsearch Service] Connection error:', {
			message: error.message,
			name: error.name,
			code: error.code,
			stack: error.stack?.split('\n'),
			meta: error.meta ? {
				statusCode: error.meta.statusCode,
				headers: error.meta.headers,
				body: error.meta.body
			} : 'No meta data'
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