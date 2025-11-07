// const axios = require("axios");
// const { findOrCreateUser } = require("./userController");
// const User = require("../models/User");

// const Restaurent = require("../models/Restaurent");
// const Order = require("../models/Order");
// require("dotenv").config();

// function parseFoodQuery(text) {
//   text = text.toLowerCase();


//   const budgetMatch = text.match(/\d+/);
//   const budget = budgetMatch ? Number(budgetMatch[0]) : null;


//   const item = text
//     .replace(/\d+/g, "")
//     .replace(/under|below|max|within|budget|rupees|rs|₹/g, "")
//     .trim()
//     .split(" ")
//     .slice(0, 2) 
//     .join(" ");

//   return { item, budget };
// }


// const token = process.env.WHATSAPP_ACCESS_TOKEN;
// const phone_number_id = process.env.WHATSAPP_PHONE_ID;
// const verify_token = process.env.secret_key;


// exports.verifyWebhook = (req, res) => {
//   const mode = req.query["hub.mode"];
//   const challenge = req.query["hub.challenge"];
//   const tokenFromMeta = req.query["hub.verify_token"];

//   if (mode === "subscribe" && tokenFromMeta === verify_token) {
//     console.log("WEBHOOK VERIFIED ✅");
//     return res.status(200).send(challenge);
//   }
//   return res.sendStatus(403);
// };


// exports.receiveMessage = async (req, res) => {
//   try {
//     const change = req.body?.entry?.[0]?.changes?.[0]?.value;
//     const message = change?.messages?.[0];
//     if (!message) return res.sendStatus(200); 


//     let from = message.from; 
//     const phone = `+91${from.slice(-10)}`;

//     const user = await findOrCreateUser(phone);
//     console.log("✅ User Identified:", user.phone);


//     if (
//       user.chatState === "WAITING_FOR_FOOD_DETAILS" &&
//       message.type === "text"
//     ) {
//       const query = message.text.body.trim().toLowerCase();
//       const parsed = parseFoodQuery(query);

//       const userfind = await User.findOne({phone});
//       if ( !parsed.item || !parsed.budget) {
//         return sendText(
//           from,
//           "⚠️ I couldn't understand that. Please send like:\n\n`biryani under 300`"
//         );
//       }

//       const itemName = parsed.item.toLowerCase();
//       const budget = parsed.budget;

//       const restaurant = await Restaurent.findOne({
//         "menuItems.name": { $regex: itemName, $options: "i" },
//       }).populate("merchantId");
//       if (!restaurant) {
//         return sendText(
//           from,
//           "❌ No restaurant found serving that item. Try another order."
//         );
//       }
//       const item = restaurant.menuItems.find((x) =>
//         x.name.toLowerCase().includes(itemName)
//       );
//       if (!item) return sendText(from, "Item unavailable currently.");
//       if (item.price > budget) {
//         return sendText(
//           from,
//           `⚠️ The item costs ₹${item.price}. Please increase your budget.`
//         );
//       }
//       const order = await Order.create({
//         customerId: userfind._id,
//         merchantId: restaurant.merchantId._id,
//         items: [
//           {
//             name: item.name,
//             price: item.price,
//             quantity: 1,
//             total: item.price,
//           },
//         ],
//         totalAmount: item.price,
//         deliveryAddress: userfind.address,
//       });
//       userfind.chatState = null;
//       await userfind.save()
//       await order.save()

//       return sendText(
//         from,
//         `✅ *Order Confirmed!*\n\n🍽 ${item.name}\n💰 ₹${item.price}\n🏪 ${restaurant.merchantId.storeName}\n\nYour food is on the way 🚀`
//       );
//     }

//     if (message.type === "text" ) {
//       const text = message.text.body.trim().toLowerCase();
//       if (["hi", "hello", "menu"].includes(text)) {
//         await sendMainMenu(from);
//       } else {
//         await sendText(from, "Type *menu* to see options.");
//       }
//     }


//     if (message.type === "interactive" && message.interactive?.button_reply) {
//       await handleAction(from, message.interactive.button_reply.id);
//     }


//     if (message.type === "interactive" && message.interactive?.list_reply) {
//       await handleAction(from, message.interactive.list_reply.id);
//     }

//     return res.sendStatus(200);
//   } catch (error) {
//     console.error("Webhook Error:", error?.response?.data || error);
//     return res.sendStatus(500);
//   }
// };


// async function sendMainMenu(to) {
//   to = formatForWhatsapp(to);
//   return axios.post(
//     `https://graph.facebook.com/v22.0/905586875961713/messages`,
//     {
//       messaging_product: "whatsapp",
//       to,
//       type: "interactive",
//       interactive: {
//         type: "button",
//         body: { text: "Welcome 😊 What would you like to do?" },
//         action: {
//           buttons: [
//             {
//               type: "reply",
//               reply: { id: "ORDER_FOOD", title: "🍽 Order Food" },
//             },
//             {
//               type: "reply",
//               reply: { id: "ORDER_GROCERY", title: "🛒 Order Groceries" },
//             },
//             {
//               type: "reply",
//               reply: { id: "ORDER_MEDICINE", title: "💊 Order Medicine" },
//             },
//           ],
//         },
//       },
//     },
//     {
//       headers: {
//         Authorization: `Bearer EAATRMkskE2oBP8m2WvvLV7HvQfVlUZCNdZA3cFkNvu6Bos8NxpoVxuNkF1bZAjZAimCVdCRbZAn06VP456f4ke1ZChSjJIXUr6L6m5235eAjQJpxZBznBGoZBAzfniyYzVNlcfHVotRQSvxhYWTCgcZCYZAiRQWH1TVZCwuS7Mm0go8p2LmojHfWwCc9VkKBUVN6hFkZCRzIx3zP0NQkHD6d59VZAZCm78Wfz6BKmZAuj6temESQFG8Y6u2Y7snhP4ZBAxp2eUBE0qeUOyY881ft9Ikq4MMhADTo`,
//         "Content-Type": "application/json",
//       },
//     }
//   );
// }


// async function handleAction(to, id) {
//   let phone = `+91${to.slice(-10)}`;
//   console.log(phone);
//   const user = await User.findOne({ phone });

//   switch (id) {
//     case "ORDER_FOOD":
//       user.chatState = "WAITING_FOR_FOOD_DETAILS";
//       await user.save();
//       return sendText(
//         to,
//         "🍽 Great! Please send *food name and budget*.\n\nExample:\n`biryani under 300`"
//       );
//     case "ORDER_GROCERY":
//       return sendText(
//         to,
//         "🛒 You chose *Order Groceries*. What items do you need?"
//       );
//     case "ORDER_MEDICINE":
//       return sendText(
//         to,
//         "💊 You chose *Order Medicine*. Upload prescription if required."
//       );
//     default:
//       return sendText(to, "❓ I didn’t understand that. Type *menu*.");
//   }
// }

// async function sendText(to, body) {
//   to = formatForWhatsapp(to);
//   return axios.post(
//     `https://graph.facebook.com/v22.0/905586875961713/messages`,
//     {
//       messaging_product: "whatsapp",
//       to,
//       text: { body },
//     },
//     {
//       headers: {
//         Authorization: `Bearer EAATRMkskE2oBP8m2WvvLV7HvQfVlUZCNdZA3cFkNvu6Bos8NxpoVxuNkF1bZAjZAimCVdCRbZAn06VP456f4ke1ZChSjJIXUr6L6m5235eAjQJpxZBznBGoZBAzfniyYzVNlcfHVotRQSvxhYWTCgcZCYZAiRQWH1TVZCwuS7Mm0go8p2LmojHfWwCc9VkKBUVN6hFkZCRzIx3zP0NQkHD6d59VZAZCm78Wfz6BKmZAuj6temESQFG8Y6u2Y7snhP4ZBAxp2eUBE0qeUOyY881ft9Ikq4MMhADTo`,
//         "Content-Type": "application/json",
//       },
//     }
//   );
// }

// function formatForWhatsapp(phone) {
//   return phone.replace(/^\+/, ""); 
// }
// controllers/whatsappController.js









const axios = require("axios");
const User = require("../models/User");
const Restaurant = require("../models/Restaurent");
const Order = require("../models/Order");
const Agent = require("../models/Agent");
const { findOrCreateUser } = require("./userController");
const redis = require("../config/redis");   
const localCache = new NodeCache({ stdTTL: 60 });
require("dotenv").config();


const VERIFY_TOKEN = process.env.secret_key;

// ---------- Utilities ----------
function formatForWhatsapp(phone) { return phone.replace(/^\+/, ""); }
function normalizeE164(incoming) { return `+91${incoming.slice(-10)}`; }

function distanceKM(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1)*(Math.PI/180);
  const dLon = (lon2 - lon1)*(Math.PI/180);
  const a = Math.sin(dLat/2)**2 +
           Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function parseFoodQuery(text) {
  text = text.toLowerCase();
  const budgetMatch = text.match(/\d+/);
  const budget = budgetMatch ? Number(budgetMatch[0]) : null;
  const item = text.replace(/\d+/g, "")
    .replace(/under|below|max|within|budget|rupees|rs|₹/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ");
  return { item, budget };
}

// ---------- WhatsApp Senders ----------
async function sendText(to, body) {
  to = formatForWhatsapp(to);
  return axios.post(
    `https://graph.facebook.com/v22.0/905586875961713/messages`,
    { messaging_product: "whatsapp", to, text: { body } },
    { headers: { Authorization: `Bearer EAATRMkskE2oBP4SwZCakggryQx8GDOolBJGgFSjgYTW2OvKxc0PfoxdVp8D9Ki3zRsDPP2xKUWiRl7k9KdziyuPBQAmn45NxHZCB4tnkBysGuQlxEGZAs9cbbZB3ezGqhu0QHMtM7Egp6ircktsouNTVTAM2YJvuOTzmsd3FaM7MfZA51YV0ci4yq9sdhyZCIYSVeSIcl7A0Y1fAOxyrAowSbtVZBZBL9VeiloJAKE97qLBdbXf0JHPkPaZB8nCfC3WIOIQWXUNxANgzrVyYDNUSm61e1dAZDZD`, "Content-Type": "application/json" } }
  );
}

async function sendButtons(to, body, buttons) {
  to = formatForWhatsapp(to);
  return axios.post(
    `https://graph.facebook.com/v22.0/905586875961713/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: { buttons: buttons.map(b => ({ type:"reply", reply:{ id:b.id, title:b.title }})) }
      }
    },
    { headers: { Authorization: `Bearer EAATRMkskE2oBP4SwZCakggryQx8GDOolBJGgFSjgYTW2OvKxc0PfoxdVp8D9Ki3zRsDPP2xKUWiRl7k9KdziyuPBQAmn45NxHZCB4tnkBysGuQlxEGZAs9cbbZB3ezGqhu0QHMtM7Egp6ircktsouNTVTAM2YJvuOTzmsd3FaM7MfZA51YV0ci4yq9sdhyZCIYSVeSIcl7A0Y1fAOxyrAowSbtVZBZBL9VeiloJAKE97qLBdbXf0JHPkPaZB8nCfC3WIOIQWXUNxANgzrVyYDNUSm61e1dAZDZD`, "Content-Type": "application/json" } }
  );
}

async function sendList(to, body, rows) {
  to = formatForWhatsapp(to);
  return axios.post(
    `https://graph.facebook.com/v22.0/905586875961713/messages`,
    {
      messaging_product:"whatsapp",
      to,
      type:"interactive",
      interactive:{
        type:"list",
        body:{ text: body },
        action:{ button:"Select Item", sections:[{ title:"Available Options", rows }] }
      }
    },
    { headers: { Authorization: `Bearer EAATRMkskE2oBP4SwZCakggryQx8GDOolBJGgFSjgYTW2OvKxc0PfoxdVp8D9Ki3zRsDPP2xKUWiRl7k9KdziyuPBQAmn45NxHZCB4tnkBysGuQlxEGZAs9cbbZB3ezGqhu0QHMtM7Egp6ircktsouNTVTAM2YJvuOTzmsd3FaM7MfZA51YV0ci4yq9sdhyZCIYSVeSIcl7A0Y1fAOxyrAowSbtVZBZBL9VeiloJAKE97qLBdbXf0JHPkPaZB8nCfC3WIOIQWXUNxANgzrVyYDNUSm61e1dAZDZD`, "Content-Type": "application/json" } }
  );
}

async function requestLocation(to) {
  to = formatForWhatsapp(to);
  return axios.post(
    `https://graph.facebook.com/v22.0/905586875961713/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "location_request",
        body: { text: "📍 Please share your live location for nearest delivery agent." }
      }
    },
    { headers: { Authorization: `Bearer EAATRMkskE2oBP4SwZCakggryQx8GDOolBJGgFSjgYTW2OvKxc0PfoxdVp8D9Ki3zRsDPP2xKUWiRl7k9KdziyuPBQAmn45NxHZCB4tnkBysGuQlxEGZAs9cbbZB3ezGqhu0QHMtM7Egp6ircktsouNTVTAM2YJvuOTzmsd3FaM7MfZA51YV0ci4yq9sdhyZCIYSVeSIcl7A0Y1fAOxyrAowSbtVZBZBL9VeiloJAKE97qLBdbXf0JHPkPaZB8nCfC3WIOIQWXUNxANgzrVyYDNUSm61e1dAZDZD`, "Content-Type": "application/json" } }
  );
}

async function sendMainMenu(to) {
  return sendButtons(to, "Welcome 😊 What would you like to do?", [
    { id: "ORDER_FOOD", title: "🍽 Order Food" }
  ]);
}

// ---------- WEBHOOK VERIFY ----------
exports.verifyWebhook = (req, res) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === VERIFY_TOKEN) {
    return res.status(200).send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
};

// ---------- SEARCH MENU ----------
async function searchMenuRows({ item, budget }) {
  const results = await Restaurant.aggregate([
    { $unwind: "$menuItems" },
    {
      $match: {
        "menuItems.isAvailable": true,
        "menuItems.name": { $regex: item, $options: "i" },
        "menuItems.price": { $lte: budget }
      }
    },
    { $sort: { "menuItems.price": 1 } },
    { $limit: 20 }
  ]);

  const final = [];
  for (let r of results) {
    const rest = await Restaurant.findById(r._id).populate("merchantId");
    final.push({
      id: `ITEM_${r._id}_${r.menuItems._id}`,
      title: `${r.menuItems.name} · ₹${r.menuItems.price}`,
      description: rest.merchantId.storeName
    });
  }
  return final;
}

// ---------- MAIN WEBHOOK ----------
exports.receiveMessage = async (req, res) => {
  try {
    const change = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    if (!message) return res.sendStatus(200);

    const fromWa = message.from;
    const phone = normalizeE164(fromWa);
    const user = await findOrCreateUser(phone);

    // LOCATION MESSAGE
    if (message.type === "location") {
      user.location = { lat: message.location.latitude, lng: message.location.longitude };
      user.address = null;
      await user.save();
      await updateUserCache(user)
      await sendText(fromWa, "✅ Location received!");
      return askPaymentMethod(fromWa);
    }

    // BUTTON HANDLERS
    if (message.type === "interactive" && message.interactive?.button_reply) {
      const id = message.interactive.button_reply.id;

      if (id === "ORDER_FOOD") {
        user.chatState = "WAITING_FOR_FOOD_DETAILS";
        await user.save();
        await updateUserCache(user)
        await sendText(fromWa, "🍽 Send food & budget:\nExample: `biryani under 300`");
        return res.sendStatus(200);
      }

      if (id === "PAY_COD") return finalizeOrder(user, fromWa, "COD", res);
      if (id.startsWith("PAY_UPI_")) return finalizeOrder(user, fromWa, "ONLINE", res);
    }

    // LIST ITEM SELECTED
    if (message.type === "interactive" && message.interactive?.list_reply) {
      const [ , restId, itemId ] = message.interactive.list_reply.id.split("_");
      const restaurant = await Restaurant.findById(restId).populate("merchantId");
      const item = restaurant.menuItems.id(itemId);
      const deliveryFee = 29;
      const total = item.price + deliveryFee;

      user.tempSelection = {
        restaurantId: restId,
        restaurantName: restaurant.merchantId.storeName,
        item: { name: item.name, price: item.price },
        deliveryTime: restaurant.deliveryTime || 25,
        deliveryFee, total
      };
      user.chatState = "WAITING_FOR_LOCATION";
      await user.save();
      await updateUserCache(user)

      await sendText(fromWa, `✅ Order Summary:
🍽 ${item.name}
🏪 ${restaurant.merchantId.storeName}
💰 Total: ₹${total}

📍 Share location (recommended)
or type your delivery address:`);

      await requestLocation(fromWa);
      return res.sendStatus(200);
    }

    // TEXT MESSAGES
    if (message.type === "text") {
      const text = message.text.body.trim();

      if (["hi", "hello", "menu"].includes(text.toLowerCase())) {
        await sendMainMenu(fromWa);
        return res.sendStatus(200);
      }

      if (user.chatState === "WAITING_FOR_FOOD_DETAILS") {
        const parsed = parseFoodQuery(text);
        if (!parsed.item || !parsed.budget)
          return sendText(fromWa, "⚠️ Try again: `biryani under 200`");

        user.tempSearch = parsed;
        user.chatState = "WAITING_FOR_ITEM_SELECTION";
        await user.save();
        await updateUserCache(user)

        const rows = await searchMenuRows(parsed);
        if (!rows.length) {
          user.chatState = null;
          await user.save();
          await updateUserCache(user)
          return sendText(fromWa, "❌ No matching items found.");
        }

        await sendList(fromWa, `Items under ₹${parsed.budget}:`, rows.slice(0, 10));
        return res.sendStatus(200);
      }

      if (user.chatState === "WAITING_FOR_LOCATION") {
        user.address = text;
        user.location = undefined;
        user.chatState = "WAITING_FOR_PAYMENT_METHOD";
        await user.save();
        await updateUserCache(user)
        await sendText(fromWa, "✅ Address Saved.");
        return askPaymentMethod(fromWa);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook Error:", err);
    res.sendStatus(500);
  }
};

// ---------- PAYMENT ----------
async function askPaymentMethod(to) {
  return sendButtons(to, "Select Payment Method:", [
    { id: "PAY_COD", title: "💵 Cash on Delivery" },
    { id: `PAY_UPI_${Date.now()}`, title: "📲 UPI Payment" }
  ]);
}

// ---------- FINALIZE ORDER ----------
async function finalizeOrder(user, fromWa, method, res) {
  const sel = user.tempSelection;
  if (!sel) return sendText(fromWa, "No active order.");

  const agents = await Agent.find({ isOnline: true });

  let agent = null, bestDist = Infinity;

  for (const ag of agents) {
    if (!ag.currentLocation?.lat) continue;
    let dist = user.location?.lat
      ? distanceKM(ag.currentLocation.lat, ag.currentLocation.lng, user.location.lat, user.location.lng)
      : 3;

    if (dist < bestDist) { bestDist = dist; agent = ag; }
  }

  if (!agent) return sendText(fromWa, "⚠️ No delivery agent available.");

  const order = await Order.create({
    customerId: user._id,
    merchantId: sel.restaurantId,
    items: [{ name: sel.item.name, price: sel.item.price, quantity: 1, total: sel.item.price }],
    totalAmount: sel.total,
    deliveryAddress: user.address,
    paymentMethod: method,
    agentId: agent._id,
    status: "ASSIGNED"
  });

  agent.isOnline = false;
  agent.currentOrderId = order._id;
  await agent.save();

  const eta = sel.deliveryTime + Math.round(bestDist * 4);

  await sendText(fromWa, `🎉 *Order Confirmed!*
🍽 ${sel.item.name}
💰 ₹${sel.total} (${method})
🏪 ${sel.restaurantName}

👤 Delivery Agent: ${agent.name}
📞 ${agent.phone}
⏱ ETA: ~${eta} min`);

  user.chatState = null;
  user.tempSelection = undefined;
  await user.save();
  await updateUserCache(user)
  res.sendStatus(200);
}


async function updateUserCache(user) {
  const key = `user:${user.phone}`;
  const plain = user.toObject();
  await redis.set(key, JSON.stringify(plain), "EX", 300);
  localCache.set(key, plain);
}