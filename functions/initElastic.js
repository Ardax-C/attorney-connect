const functions = require('firebase-functions');
const { Client } = require('@elastic/elasticsearch');
const admin = require('firebase-admin');

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

    // Only create index if it doesn't exist
    if (!exists) {
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
              city: { 
                type: 'keyword',
                fields: {
                  suggest: { type: 'completion' }
                }
              },
              createdAt: { type: 'date' },
              email: { type: 'keyword' },
              firstName: { 
                type: 'text',
                analyzer: 'attorney_analyzer',
                fields: { 
                  keyword: { type: 'keyword' },
                  suggest: { type: 'completion' }
                }
              },
              lastName: { 
                type: 'text',
                analyzer: 'attorney_analyzer',
                fields: { 
                  keyword: { type: 'keyword' },
                  suggest: { type: 'completion' }
                }
              },
              keywords: {
                properties: {
                  keywords: { type: 'keyword' },
                  practiceAreas: { type: 'keyword' }
                }
              },
              phone: { type: 'keyword' },
              practiceAreas: { 
                type: 'keyword',
                fields: {
                  suggest: { type: 'completion' }
                }
              },
              profilePictureUrl: { type: 'keyword' },
              role: { type: 'keyword' },
              searchTerms: {
                properties: {
                  keywords: { type: 'keyword' },
                  practiceAreas: { type: 'keyword' }
                }
              },
              state: { 
                type: 'keyword',
                fields: {
                  suggest: { type: 'completion' }
                }
              },
              status: { type: 'keyword' },
              username: { type: 'keyword' },
              website: { type: 'keyword' }
            }
          }
        }
      });
    }

    // Sync existing data
    const attorneyProfiles = await admin.firestore()
      .collection('attorneyProfiles')
      .get();

    const operations = attorneyProfiles.docs.flatMap(doc => {
      const data = doc.data();
      return [
        { index: { _index: 'attorneys', _id: doc.id } },
        {
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          keywords: data.keywords || [],
          practiceAreas: data.practiceAreas || [],
          searchTerms: data.searchTerms || []
        }
      ];
    });

    if (operations.length > 0) {
      const result = await client.bulk({ operations, refresh: true });
      if (result.errors) {
        console.error('Bulk indexing errors:', result.items);
      }
    }

    return { 
      success: true, 
      message: 'Elasticsearch index initialized and data synced',
      documentsProcessed: attorneyProfiles.size
    };
  } catch (error) {
    console.error('Error initializing Elasticsearch:', error);
    throw new functions.https.HttpsError('internal', 'Error initializing Elasticsearch index', error);
  }
}); 