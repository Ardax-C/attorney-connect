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

// Create/Update
exports.syncAttorneyToElastic = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB'
  })
  .firestore
  .document('attorneyProfiles/{attorneyId}')
  .onWrite(async (change, context) => {
    const attorneyId = context.params.attorneyId;

    // Handle deletion
    if (!change.after.exists) {
      try {
        await client.delete({
          index: 'attorneys',
          id: attorneyId
        });
        return null;
      } catch (error) {
        console.error('Error deleting from Elasticsearch:', error);
        return null;
      }
    }

    // Handle create/update
    const attorney = change.after.data();
    const timestamp = attorney.createdAt?.toDate?.() || new Date();

    try {
      await client.index({
        index: 'attorneys',
        id: attorneyId,
        document: {
          ...attorney,
          createdAt: timestamp.toISOString(),
          keywords: attorney.keywords || [],
          practiceAreas: attorney.practiceAreas || [],
          searchTerms: attorney.searchTerms || []
        }
      });
    } catch (error) {
      console.error('Error syncing to Elasticsearch:', error);
    }
  });
