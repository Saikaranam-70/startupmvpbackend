const axios = require("axios");
const { findOrCreateUser } = require("./userController");
require("dotenv").config();

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phone_number_id = process.env.WHATSAPP_PHONE_ID;
const verify_token = process.env.secret_key;

// ✅ Verify Webhook (GET)
exports.verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const tokenFromMeta = req.query["hub.verify_token"];

  if (mode === "subscribe" && tokenFromMeta === verify_token) {
    console.log("WEBHOOK VERIFIED ✅");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// ✅ Receive Messages (POST)
exports.receiveMessage = async (req, res) => {
  try {
    const change = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    if (!message) return res.sendStatus(200); // Ignore delivery updates

    // ✅ Clean phone (always convert to +91XXXXXXXXXX)
    let from = message.from; // ex: "919876543210"
    const phone = `+91${from.slice(-10)}`;

    const user = await findOrCreateUser(phone);
    console.log("✅ User Identified:", user.phone);

    if (message.type === "text") {
      const text = message.text.body.trim().toLowerCase();
      if (["hi", "hello", "menu"].includes(text)) {
        await sendMainMenu(from);
      } else {
        await sendText(from, "Type *menu* to see options.");
      }
    }

    // ✅ Button Reply
    if (message.type === "interactive" && message.interactive?.button_reply) {
      await handleAction(from, message.interactive.button_reply.id);
    }

    // ✅ List Reply
    if (message.type === "interactive" && message.interactive?.list_reply) {
      await handleAction(from, message.interactive.list_reply.id);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook Error:", error?.response?.data || error);
    return res.sendStatus(500);
  }
};

// ✅ Send Main Menu Buttons
async function sendMainMenu(to) {
  to = formatForWhatsapp(to)
  return axios.post(
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
            { type: "reply", reply: { id: "ORDER_FOOD", title: "🍽 Order Food" } },
            { type: "reply", reply: { id: "ORDER_GROCERY", title: "🛒 Order Groceries" } },
            { type: "reply", reply: { id: "ORDER_MEDICINE", title: "💊 Order Medicine" } },
          ],
        },
      },
    },
    { headers: {
        Authorization: `Bearer EAATRMkskE2oBP8m2WvvLV7HvQfVlUZCNdZA3cFkNvu6Bos8NxpoVxuNkF1bZAjZAimCVdCRbZAn06VP456f4ke1ZChSjJIXUr6L6m5235eAjQJpxZBznBGoZBAzfniyYzVNlcfHVotRQSvxhYWTCgcZCYZAiRQWH1TVZCwuS7Mm0go8p2LmojHfWwCc9VkKBUVN6hFkZCRzIx3zP0NQkHD6d59VZAZCm78Wfz6BKmZAuj6temESQFG8Y6u2Y7snhP4ZBAxp2eUBE0qeUOyY881ft9Ikq4MMhADTo`,
        "Content-Type": "application/json",
      },}
  );
}

// ✅ Handle Button/List Selection
async function handleAction(to, id) {
  switch (id) {
    case "ORDER_FOOD":
      return sendText(to, "🍽 You chose *Order Food*. Please share your location.");
    case "ORDER_GROCERY":
      return sendText(to, "🛒 You chose *Order Groceries*. What items do you need?");
    case "ORDER_MEDICINE":
      return sendText(to, "💊 You chose *Order Medicine*. Upload prescription if required.");
    default:
      return sendText(to, "❓ I didn’t understand that. Type *menu*.");
  }
}

// ✅ Send Plain Text
async function sendText(to, body) {
  to = formatForWhatsapp(to)
  return axios.post(
    `https://graph.facebook.com/v22.0/905586875961713/messages`,
    {
      messaging_product: "whatsapp",
      to,
      text: { body },
    },
    { headers: {
        Authorization: `Bearer EAATRMkskE2oBP8m2WvvLV7HvQfVlUZCNdZA3cFkNvu6Bos8NxpoVxuNkF1bZAjZAimCVdCRbZAn06VP456f4ke1ZChSjJIXUr6L6m5235eAjQJpxZBznBGoZBAzfniyYzVNlcfHVotRQSvxhYWTCgcZCYZAiRQWH1TVZCwuS7Mm0go8p2LmojHfWwCc9VkKBUVN6hFkZCRzIx3zP0NQkHD6d59VZAZCm78Wfz6BKmZAuj6temESQFG8Y6u2Y7snhP4ZBAxp2eUBE0qeUOyY881ft9Ikq4MMhADTo`,
        "Content-Type": "application/json",
      },}
  );
}


function formatForWhatsapp(phone) {
  return phone.replace(/^\+/, ""); // remove only leading +
}