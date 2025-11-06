const axios = require("axios");
const { findOrCreateUser } = require("./userController");
require("dotenv").config();

const token = process.env.WHATSAPP_ACCESS_TOKEN;        // keep in .env
const phone_number_id = process.env.WHATSAPP_PHONE_ID;  // keep in .env
const verify_token = process.env.secret_key;            // MUST match Meta config exactly

// --- GET: Webhook verification
exports.verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const tokenFromMeta = req.query["hub.verify_token"];

  if (mode === "subscribe" && tokenFromMeta === verify_token) {
    console.log("WEBHOOK VERIFIED");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// --- POST: Receive events
exports.receiveMessage = async (req, res) => {
  try {
    const change = req.body?.entry?.[0]?.changes?.[0]?.value;

    // Some webhooks are delivery/status updates only (no messages[])
    const message = change?.messages?.[0];
    if (!message) return res.sendStatus(200);

    const from = message.from;            // e.g. "9198xxxxxxxx"
    const phone = from.replace(/^\+91/, ""); // your logic
    const user = await findOrCreateUser(phone);
    console.log("User Identified:", user.phone);

    // 1) Plain text
    if (message.type === "text") {
      const text = message.text.body.trim().toLowerCase();
      if (["hi", "hello", "menu"].includes(text)) {
        await sendMainMenu(from);
      } else {
        await sendText(from, "Type *menu* to see options.");
      }
    }

    // 2) Button reply
    if (message.type === "interactive" && message.interactive?.button_reply) {
      const id = message.interactive.button_reply.id;
      await handleAction(from, id);
    }

    // 3) List reply (in case you switch to list later)
    if (message.type === "interactive" && message.interactive?.list_reply) {
      const id = message.interactive.list_reply.id;
      await handleAction(from, id);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook Error:", error?.response?.data || error);
    return res.sendStatus(500);
  }
};

// --- Send 3-button menu (uses ENV, not hardcoded)
async function sendMainMenu(to) {
  await axios.post(
    `https://graph.facebook.com/v22.0/905586875961713/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: "Welcome 😊 What would you like to do?" },
        action: {
          buttons: [
            { type: "reply", reply: { id: "ORDER_FOOD",     title: "🍽 Order Food" } },
            { type: "reply", reply: { id: "ORDER_GROCERY",  title: "🛒 Order Groceries" } },
            { type: "reply", reply: { id: "ORDER_MEDICINE", title: "💊 Order Medicine" } }
          ],
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer EAATRMkskE2oBPww0xMoCWEqMtKUORrP1LEjq1THZBkxeEjQZBFQmBzVPyf7Am2NxUVD9sycfJwWek4Eh7Xm0PYiuSGw9P178vs8AttspbKiDx6L7PZCK3ADTzZBDWmnmAcdlwZCzqzcNOktQ5QAyEYfyfjQEzDEMmzfmHQlYn99559KgnXiq5SXQWg8ty22ElfHQUq74SdI8BUmSr4yySdOgg28elOYQPZAZCZB2taHV5In9mJTF3rTO5oBVRm9ZCVY00M2BLwR1cLE5y9IYdb0SEzt6ZCQgZDZD`,
        "Content-Type": "application/json",
      },
    }
  );
}

// --- Handle selected action ids from button/list replies
async function handleAction(to, id) {
  switch (id) {
    case "ORDER_FOOD":
      return sendText(to, "🍽 You chose *Order Food*. Please share your location.");
    case "ORDER_GROCERY":
      return sendText(to, "🛒 You chose *Order Groceries*. What items do you need?");
    case "ORDER_MEDICINE":
      return sendText(to, "💊 You chose *Order Medicine*. Upload a prescription if required.");
    default:
      return sendText(to, "❓ I didn’t understand that. Type *menu*.");
  }
}

// --- Helper: send plain text
async function sendText(to, body) {
  await axios.post(
    `https://graph.facebook.com/v22.0/905586875961713/messages`,
    {
      messaging_product: "whatsapp",
      to,
      text: { body },
    },
    {
      headers: {
        Authorization: `Bearer EAATRMkskE2oBPww0xMoCWEqMtKUORrP1LEjq1THZBkxeEjQZBFQmBzVPyf7Am2NxUVD9sycfJwWek4Eh7Xm0PYiuSGw9P178vs8AttspbKiDx6L7PZCK3ADTzZBDWmnmAcdlwZCzqzcNOktQ5QAyEYfyfjQEzDEMmzfmHQlYn99559KgnXiq5SXQWg8ty22ElfHQUq74SdI8BUmSr4yySdOgg28elOYQPZAZCZB2taHV5In9mJTF3rTO5oBVRm9ZCVY00M2BLwR1cLE5y9IYdb0SEzt6ZCQgZDZD`,
        "Content-Type": "application/json",
      },
    }
  );
}
