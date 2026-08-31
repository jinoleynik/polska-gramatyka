const admin = require("firebase-admin");

let app;

function getAdminApp() {
  if (app) return app;

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    throw new Error(
      "Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT for Admin SDK."
    );
  }

  return app;
}

function getFirestore() {
  return admin.firestore(getAdminApp());
}

module.exports = { getAdminApp, getFirestore };
