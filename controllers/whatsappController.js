const axios = require("axios");
const { findOrCreateUser } = require("./userController");
require("dotenv").config()

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phone_number_id = process.env.WHATSAPP_PHONE_ID;
const verify_token = process.env.secret_key;

exports.verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const tokenFromMeta = req.query["hub.verify_token"];

  if (mode && tokenFromMeta === verify_token) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
};

exports.receiveMessage = async (req, res) => {
  try {
    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.sendStatus(200);

    const from = message.from;
    const phone = from.replace("91", "");
    let text = message.text?.body?.toLowerCase();

    const user = await findOrCreateUser(phone);
    console.log("User Identified :", user.phone);

    if (text === "hi" || text === "hello" || text === "menu") {
      await sendMainMenu(from);
    }
    res.sendStatus(200);
  } catch (error) {
    console.log("Webhook Error", error);
    res.sendStatus(500);
  }
};

async function sendMainMenu(to) {
  await axios({
    method: "POST",
    url: `https://graph.facebook.com/v20.0/${phone_number_id}/messages`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: "Welcome 😊 What would you like to do?",
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: { id: "ORDER_FOOD", title: "🍽 Order Food" },
            },
            {
              type: "reply",
              reply: { id: "ORDER_GROCERY", title: "🛒 Order Groceries" },
            },
            {
              type: "reply",
              reply: { id: "ORDER_MEDICINE", title: "💊 Order Medicine" },
            },
            {
              type: "reply",
              reply: { id: "BOOK_RIDE", title: "🚗 Book a Ride" },
            },
          ],
        },
      },
    },
  });
}
