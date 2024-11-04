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
				return client;
			// eslint-disable-next-line no-unused-vars
			} catch (e) {
				client = null;
			}
		}

		const apiKey = process.env.VITE_ELASTICSEARCH_API_KEY;

		if (!apiKey) {
			throw new Error('Missing API key');
		}

		// Create client with minimal configuration matching curl
		const config = {
			node: ES_NODE,
			auth: {
				apiKey
			},
			headers: {
				'Content-Type': 'application/json'
			},
			requestTimeout: 30000,
			ssl: {
				rejectUnauthorized: false
			}
		};

		client = new Client(config);

		// Test connection using same endpoint as curl
		const info = await client.info();
		console.log('[Elasticsearch Service] Connected successfully:', {
			name: info.name,
			clusterName: info.cluster_name,
			version: info.version.number
		});

		// Verify attorneys index
		const indices = await client.cat.indices({ format: 'json' });
		const attorneysIndex = indices.find(idx => idx.index === 'attorneys');
		
		if (!attorneysIndex) {
			throw new Error('Attorneys index not found');
		}

		console.log('[Elasticsearch Service] Found attorneys index:', {
			docCount: attorneysIndex.docs?.count,
			size: attorneysIndex.store?.size
		});

		return client;

	} catch (error) {
		console.error('[Elasticsearch Service] Connection error:', {
			message: error.message,
			name: error.name,
			code: error.code,
			meta: error.meta
		});

		client = null;
		throw new Error('Unable to connect to search service', { cause: error });
	}
}

export function getClient() {
	return client;
}