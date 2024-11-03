const functions = require('firebase-functions');
const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  cloud: {
    id: functions.config().elasticsearch.cloud_id
  },
  auth: {
    apiKey: functions.config().elasticsearch.api_key
  }
});

exports.initializeElasticsearchIndex = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Must be an admin to initialize index');
  }

  try {
    const exists = await client.indices.exists({
      index: 'attorneys'
    });

    if (exists) {
      await client.indices.delete({
        index: 'attorneys'
      });
    }

    await client.indices.create({
      index: 'attorneys',
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          analysis: {
            analyzer: {
              attorney_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'trim', 'word_delimiter_graph']
              }
            }
          }
        },
        mappings: {
          properties: {
            barNumber: { type: 'keyword' },
            city: { type: 'keyword' },
            createdAt: { type: 'date' },
            email: { type: 'keyword' },
            firstName: { 
              type: 'text',
              analyzer: 'attorney_analyzer',
              fields: { keyword: { type: 'keyword' } }
            },
            lastName: { 
              type: 'text',
              analyzer: 'attorney_analyzer',
              fields: { keyword: { type: 'keyword' } }
            },
            keywords: {
              properties: {
                keywords: { type: 'keyword' },
                practiceAreas: { type: 'keyword' }
              }
            },
            phone: { type: 'keyword' },
            practiceAreas: { type: 'keyword' },
            profilePictureUrl: { type: 'keyword' },
            role: { type: 'keyword' },
            searchTerms: {
              properties: {
                keywords: { type: 'keyword' },
                practiceAreas: { type: 'keyword' }
              }
            },
            state: { type: 'keyword' },
            status: { type: 'keyword' },
            username: { type: 'keyword' },
            website: { type: 'keyword' }
          }
        }
      }
    });

    return { success: true, message: 'Elasticsearch index initialized' };
  } catch (error) {
    console.error('Error initializing Elasticsearch:', error);
    throw new functions.https.HttpsError('internal', 'Error initializing Elasticsearch index', error);
  }
}); 