// small change to trigger vercel build
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const elasticSync = require('./elasticSync');
const initElastic = require('./initElastic');
admin.initializeApp();

exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Check if the caller is an admin
  if (!context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Must be an admin to delete users.');
  }
  const uid = data.userId;
  
  try {
    // Get user's profile data
    const userDoc = await admin.firestore().collection('attorneyProfiles').doc(uid).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User profile not found.');
    }
    const userData = userDoc.data();

    // Remove user from stateMapping
    const stateRef = admin.firestore().collection('stateMapping').doc(userData.state);
    await stateRef.update({
      attorneys: admin.firestore.FieldValue.arrayRemove(uid)
    });

    // Remove user from city in stateMapping
    const cityRef = stateRef.collection('cities').doc(userData.city);
    await cityRef.update({
      attorneys: admin.firestore.FieldValue.arrayRemove(uid)
    });

    // Remove user from practiceAreaMappings
    const practiceAreaUpdates = userData.practiceAreas.map(async (area) => {
      const normalizedArea = area.toLowerCase().trim();
      const safeDocId = normalizedArea.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const docRef = admin.firestore().collection('practiceAreaMappings').doc(safeDocId);
      return docRef.update({
        uids: admin.firestore.FieldValue.arrayRemove(uid)
      });
    });
    await Promise.all(practiceAreaUpdates);

    // Delete the user's auth account
    await admin.auth().deleteUser(uid);
   
    // Delete the user's Firestore document
    await admin.firestore().collection('attorneyProfiles').doc(uid).delete();
    
    return { result: 'User deleted successfully' };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new functions.https.HttpsError('internal', 'Error deleting user');
  }
});

exports.setAdminClaim = functions.https.onCall(async (data, context) => {
    // Check if the request is made by an admin
    if (!(context.auth && context.auth.token && context.auth.token.admin)) {
      throw new functions.https.HttpsError('permission-denied', 'Must be an admin to set admin claims.');
    }
  
    const { uid } = data;
    
    try {
      await admin.auth().setCustomUserClaims(uid, { admin: true });
      return { result: `Successfully set admin claim for user ${uid}` };
    } catch (error) {
      throw new functions.https.HttpsError('internal', 'Error setting admin claim');
    }
  });

// Export Elasticsearch sync function
exports.syncAttorneyToElastic = elasticSync.syncAttorneyToElastic;
exports.initializeElasticsearchIndex = initElastic.initializeElasticsearchIndex;