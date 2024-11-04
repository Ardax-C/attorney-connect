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
    }

    // Get all documents from Firestore
    const attorneyProfiles = await admin.firestore()
      .collection('attorneyProfiles')
      .get();

    // Get existing documents from Elasticsearch
    const existingDocs = await client.search({
      index: 'attorneys',
      size: 10000, // Adjust based on your data size
      body: {
        query: { match_all: {} }
      }
    });

    // Create a Set of existing document IDs
    const existingIds = new Set(
      existingDocs.hits.hits.map(hit => hit._id)
    );

    // Prepare operations for documents that need to be added or updated
    const operations = [];
    
    for (const doc of attorneyProfiles.docs) {
      const data = doc.data();
      const formattedDoc = {
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        keywords: data.keywords || [],
        practiceAreas: data.practiceAreas || [],
        searchTerms: data.searchTerms || []
      };

      // If document doesn't exist in Elasticsearch, add it
      if (!existingIds.has(doc.id)) {
        operations.push(
          { index: { _index: 'attorneys', _id: doc.id } },
          formattedDoc
        );
      } else {
        // If document exists, update it
        operations.push(
          { update: { _index: 'attorneys', _id: doc.id } },
          { doc: formattedDoc }
        );
      }
    }

    let processedCount = 0;
    if (operations.length > 0) {
      const result = await client.bulk({ operations, refresh: true });
      if (result.errors) {
        console.error('Bulk indexing errors:', result.items);
      }
      processedCount = operations.length / 2; // Divide by 2 because each operation is two items
    }

    return { 
      success: true, 
      message: 'Elasticsearch sync completed',
      documentsProcessed: processedCount,
      totalDocuments: attorneyProfiles.size
    };
  } catch (error) {
    console.error('Error syncing Elasticsearch:', error);
    throw new functions.https.HttpsError('internal', 'Error syncing Elasticsearch index', error);
  }
}); 