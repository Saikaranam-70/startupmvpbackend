const admin = require("firebase-admin");

const serviceAccount = require("../firebase-service-key.json"); // from Firebase

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
