const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Check if the caller is an admin
  if (!context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Must be an admin to delete users.');
  }

  const uid = data.userId;

  try {
    // Delete the user's auth account
    await admin.auth().deleteUser(uid);
    
    // Delete the user's Firestore document
    await admin.firestore().collection('attorneyProfiles').doc(uid).delete();

    return { result: 'User deleted successfully' };
  } catch (error) {
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