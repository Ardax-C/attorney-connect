import { Client } from '@elastic/elasticsearch';

let client = null;

export async function initializeElasticSearch() {
	try {
		if (!client) {
			const cloudId = process.env.VITE_ELASTICSEARCH_CLOUD_ID;
			const apiKey = process.env.VITE_ELASTICSEARCH_API_KEY;

			if (!cloudId || !apiKey) {
				throw new Error('Missing Elasticsearch configuration');
			}

			client = new Client({
				cloud: {
					id: cloudId
				},
				auth: {
					apiKey: apiKey
				}
			});

			// Test connection
			await client.ping();
			console.log('Successfully connected to Elasticsearch');
		}
		return client;
	} catch (error) {
		console.error('Failed to initialize Elasticsearch:', error);
		throw new Error('Unable to connect to search service');
	}
}

export function getClient() {
	return client;
}