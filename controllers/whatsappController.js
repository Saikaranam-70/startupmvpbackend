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
const redis = require("../config/redis");
const NodeCache = require("node-cache");
const localCache = new NodeCache({ stdTTL: 60 });
require("dotenv").config();

const VERIFY_TOKEN = process.env.secret_key;

const WABA_URL = `https://graph.facebook.com/v22.0/905586875961713/messages`;
const AUTH = {
  Authorization: `Bearer EAATRMkskE2oBQLhBwtBi5NXI75rFeNxiJMrLZBBqoDaANcy6g9bhnntLSLlkYH9xm5tmnriyF37CbMNVrTH3EwZA1GfZA774Hw1ZAfMmZCz9sj0ZBu8JZAXZBJcL3jV793pgN7e5NKdyTUPXuH6w2pXkWAPg6qtz1NSf3amfiZBIiQDaE7lVlFfZCbKBankDoNiPicdzk7kZBQVU3M27kCdIjeCGKh8yHfpJUQnuxKZBvSTq1hjo7htx2ZAAAutbMzkJPmJzVTzHvIc98sFmqcEN61p6LUJpPDwZDZD`,
  "Content-Type": "application/json",
};

const normalize = (p) => `+91${p.slice(-10)}`;
const formatPhone = (p) => p.replace(/^\+?/, "");
const cacheKey = (phone) => `user:${normalize(phone)}`;

async function safeSend(payload) {
  try {
    await axios.post(WABA_URL, payload, { headers: AUTH });
  } catch (err) {
    console.error("SEND ERROR:", err.response?.data || err.message);
  }
}

async function sendText(to, body) {
  safeSend({ messaging_product: "whatsapp", to: formatPhone(to), text: { body } });
}

async function sendButtons(to, body, buttons) {
  safeSend({
    messaging_product: "whatsapp",
    to: formatPhone(to),
    type: "interactive",
    interactive: { type: "button", body: { text: body }, action: { buttons } },
  });
}

async function sendList(to, body, rows) {
  safeSend({
    messaging_product: "whatsapp",
    to: formatPhone(to),
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body },
      action: { button: "Select", sections: [{ title: "Menu", rows }] },
    },
  });
}

async function requestLocation(to) {
  safeSend({
    messaging_product: "whatsapp",
    to: formatPhone(to),
    type: "interactive",
    interactive: {
      type: "location_request_message",
      body: { text: "📍 Please share your live location to continue." },
      action: { name: "send_location" }
    }
  });
}

async function updateCache(user) {
  const data = user.toObject();
  await redis.set(cacheKey(user.phone), JSON.stringify(data), "EX", 300);
  localCache.set(cacheKey(user.phone), data);
}

async function getUser(phone) {
  phone = normalize(phone);
  const key = cacheKey(phone);

  let cached = await redis.get(key);
  if (cached) return User.hydrate(JSON.parse(cached));

  cached = localCache.get(key);
  if (cached) return User.hydrate(cached);

  let user = await User.findOne({ phone });
  if (!user) user = await User.create({ phone });

  await updateCache(user);
  return user;
}

function distanceKM(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI/180;
  const dLon = (lon2 - lon1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function parseFood(text) {
  text = text.toLowerCase();
  const budget = Number((text.match(/\d+/) || [])[0]);
  const item = text.replace(/\d+|under|below|rs|₹/g, "").trim();
  return { item, budget };
}

async function searchMenu({ item, budget }) {
  const results = await Restaurant.aggregate([
    { $unwind: "$menuItems" },
    { $match: { "menuItems.isAvailable": true, "menuItems.name": { $regex: item, $options: "i" }, "menuItems.price": { $lte: budget } } },
    { $sort: { "menuItems.price": 1 } }
  ]);

  return results.slice(0, 10).map((r) => ({
    id: `ITEM_${r._id}_${r.menuItems._id}`,
    title: `${r.menuItems.name} · ₹${r.menuItems.price}`
  }));
}

// =============== SEND RATING REQUEST ===============
exports.sendRatingRequest = async (userId, orderId) => {
  const user = await User.findById(userId);
  if (!user) return;

  user.chatState = `RATING_${orderId}`;
  await user.save();
  await updateCache(user);

  await sendButtons(user.phone, "⭐ How was your food?\nPlease rate from 1 to 5", [
    { type: "reply", reply: { id: "R1", title: "⭐ 1" } },
    { type: "reply", reply: { id: "R2", title: "⭐⭐ 2" } },
    { type: "reply", reply: { id: "R3", title: "⭐⭐⭐ 3" } },
    { type: "reply", reply: { id: "R4", title: "⭐⭐⭐⭐ 4" } },
    { type: "reply", reply: { id: "R5", title: "⭐⭐⭐⭐⭐ 5" } },
  ]);
};

// =============== WEBHOOK VERIFY ===============
exports.verifyWebhook = (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN)
    return res.send(req.query["hub.challenge"]);
  res.sendStatus(403);
};

// =============== MAIN FLOW ===============
exports.receiveMessage = async (req, res) => {
  res.sendStatus(200);

  const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return;

  const msgId = msg.id;
  if (await redis.get(msgId)) return;
  await redis.set(msgId, 1, "EX", 300);

  const phone = normalize(msg.from);
  const user = await getUser(phone);

  // ===== RATING INPUT HANDLER =====
  if (msg.type === "interactive" && msg.interactive.button_reply?.id?.startsWith("R")) {
    const rating = Number(msg.interactive.button_reply.id.slice(1));
    const state = user.chatState;

    if (state?.startsWith("RATING_")) {
      const orderId = state.split("_")[1];
      const order = await Order.findById(orderId);
      const restaurant = await Restaurant.findById(order.merchantId);

      restaurant.ratingSum += rating;
      restaurant.ratingCount += 1;
      await restaurant.save();

      user.chatState = null;
      await user.save();
      await updateCache(user);

      return sendText(phone, "🙏 Thanks for your rating! It really helps.");
    }
  }

  // ========== REST OF YOUR FLOW REMAINS SAME ==========

  if (msg.type === "text" && msg.text.body.toLowerCase() === "hi") {
    user.chatState = "WAITING_LOCATION";
    await user.save();
    await updateCache(user);
    await sendText(phone, "👋 Hello! Please share your location to continue.");
    return requestLocation(phone);
  }

  if (msg.type === "location") {
    user.location = { lat: Number(msg.location.latitude), lng: Number(msg.location.longitude) };
    await user.save();
    await updateCache(user);

    const restaurants = await Restaurant.find().populate("merchantId");

    const nearby = restaurants.filter(r => {
      const mLoc = r.merchantId?.address?.location;
      if (!mLoc) return false;
      return distanceKM(user.location.lat, user.location.lng, Number(mLoc.lat), Number(mLoc.lng)) <= 5;
    });

    if (!nearby.length) return sendText(phone, "😕 Sorry, we are not delivering to your location yet.");

    return sendButtons(phone, "✅ We deliver in your area!", [
      { type: "reply", reply: { id: "ORDER_FOOD", title: "🍽 Order Food" } }
    ]);
  }

  if (msg.type === "interactive" && msg.interactive.button_reply?.id === "ORDER_FOOD") {
    user.chatState = "ASK_TYPE";
    await user.save();
    await updateCache(user);

    return sendButtons(phone, "What would you like to eat ?", [
      {type: "reply", reply: {id: "TYPE_VEG", title: "🥦 VEG"}},
      { type: "reply", reply: { id: "TYPE_NONVEG", title: "🍗 NON-VEG" } }
    ])
  }

  if (msg.type === "interactive" && msg.interactive.button_reply?.id?.startsWith("TYPE_")) {

    const foodType = msg.interactive.button_reply.id === "TYPE_VEG" ? "VEG" : "NON-VEG";
    user.tempType = foodType;
    user.chatState = "ASK_CATEGORY";
    await user.save();
    await updateCache(user);

    // Extract unique categories for selected type
    const categories = await Restaurant.aggregate([
      { $unwind: "$menuItems" },
      { $match: { "menuItems.type": foodType } },
      { $group: { _id: "$menuItems.category" } }
    ]);

    const rows = categories.map(c => ({
      id: `CAT_${c._id}`,
      title: c._id
    }));

    return sendList(phone, `Choose a category (${foodType})`, rows);
}

if(msg.type === "interactive" && msg.interactive.list_reply?.id?.startsWith("CAT_")){
  const category = msg.interactive.list_reply.id.replace("CAT_", "");
  user.tempCategory = category;
  user.chatState = "ASK_BUDGET";
  await user.save();
  await updateCache(user);

   const rows = [
      { id: "BUDGET_0_100", title: "Below ₹100" },
      { id: "BUDGET_100_150", title: "₹100 - ₹150" },
      { id: "BUDGET_150_200", title: "₹150 - ₹200" },
      { id: "BUDGET_200_250", title: "₹200 - ₹250" },
      { id: "BUDGET_250_300", title: "₹250 - ₹300" },
      { id: "BUDGET_300_400", title: "₹300 - ₹400" }
    ];

    return sendList(phone, `Choose your budget range (${category})`, rows);
}

if (msg.type === "interactive" && msg.interactive.list_reply?.id?.startsWith("BUDGET_")) {
  const [_, min, max] = msg.interactive.list_reply.id.split("_");
  const minPrice = Number(min);
  const maxPrice = Number(max);

  const items = await Restaurant.aggregate([
    { $unwind: "$menuItems" },
    {
      $match: {
        "menuItems.type": user.tempType,
        "menuItems.category": user.tempCategory,
        "menuItems.isAvailable": true,
        "menuItems.price": { $gte: minPrice, $lte: maxPrice }
      }
    },
    {
      $addFields: {
        "menuItems.rating": {
          $cond: [
            { $eq: ["$ratingCount", 0] },
            0,
            { $divide: ["$ratingSum", "$ratingCount"] }
          ]
        }
      }
    },
    { $sort: { "menuItems.price": 1 } }
  ]);

  if (!items.length) {
    return sendText(phone, "❌ No items found in this budget.");
  }

  const rows = items.slice(0, 10).map(r => ({
    id: `ITEM_${r._id}_${r.menuItems._id}`,
    title: `${r.menuItems.name} · ₹${r.menuItems.price} · ⭐${r.menuItems.rating?.toFixed(1)}`
  }));

  user.chatState = "SELECT_ITEM";
  await user.save();
  await updateCache(user);

  return sendList(phone, `Best items in ₹${minPrice} - ₹${maxPrice}`, rows);
}


  if (user.chatState === "ASK_ITEM" && msg.type === "text") {
    const parsed = parseFood(msg.text.body);
    if (!parsed.item || !parsed.budget) return sendText(phone, "⚠️ Example: *biryani under 200*");

    const rows = await searchMenu(parsed);
    if (!rows.length) return sendText(phone, "❌ No matching foods found.");

    user.tempSearch = parsed;
    user.chatState = "SELECT_ITEM";
    await user.save();
    await updateCache(user);

    return sendList(phone, `Items under ₹${parsed.budget}:`, rows);
  }

  if (msg.type === "interactive" && msg.interactive.list_reply) {
    const [, restId, itemId] = msg.interactive.list_reply.id.split("_");
    const restaurant = await Restaurant.findById(restId).populate("merchantId");
    const item = restaurant.menuItems.id(itemId);
    const total = item.price + 29;

    user.tempOrder = { restId, itemName: item.name, price: item.price, total };
    user.markModified("tempOrder");
    user.chatState = "ASK_PAYMENT";
    await user.save();
    await updateCache(user);

    return sendButtons(phone, `🍽 ${item.name}\n💰 Total: ₹${total}\n\nChoose payment:`, [
      { type: "reply", reply: { id: "COD", title: "💵 Cash" } },
      { type: "reply", reply: { id: "UPI", title: "📲 UPI" } },
    ]);
  }

  if (msg.type === "interactive" && ["COD", "UPI"].includes(msg.interactive.button_reply?.id)) {
    const sel = user.tempOrder;
    const agents = await Agent.find({ isOnline: true });

    let best = null, bd = Infinity;
    for (const a of agents) {
      if (!a.currentLocation) continue;
      const d = distanceKM(a.currentLocation.lat, a.currentLocation.lng, user.location.lat, user.location.lng);
      if (d < bd) { bd = d; best = a; }
    }

    if (!best) return sendText(phone, "⏳ No available delivery agents right now.");

    const restaurant = await Restaurant.findById(sel.restId).populate("merchantId");

    const order = await Order.create({
      customerId: user._id,
      merchantId: restaurant.merchantId._id,
      items: [{ name: sel.itemName, price: sel.price }],
      totalAmount: sel.total,
      deliveryAddress: user.location,
      paymentMethod: msg.interactive.button_reply.id,
      agentId: best._id,
      status: "ASSIGNED",
    });

    best.isOnline = false;
    best.currentOrderId = order._id;
    await best.save();

    user.chatState = null;
    user.tempOrder = null;
    await user.save();
    await updateCache(user);

    return sendText(phone, `🎉 Order confirmed!\n👤 Agent: ${best.name}\n📞 ${best.phone}`);
  }
};
