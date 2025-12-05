const admin = require("../config/firebaseAdmin");

async function sendPushToAgent(fcmToken, order) {
  try {
    const message = {
      token: fcmToken,
      notification: {
        title: "🚨 NEW SOS ORDER",
        body: `Order Type: ${order.type}`,
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "sos",
        },
      },
    };

    await admin.messaging().send(message);
    console.log("✅ FCM Push Sent to Agent");
  } catch (err) {
    console.error("❌ FCM Push Error:", err.message);
  }
}

module.exports = sendPushToAgent;
