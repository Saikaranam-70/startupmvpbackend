
const axios = require("axios");
const User = require("../models/User");
const Restaurant = require("../models/Restaurent");
const Order = require("../models/Order");
const Agent = require("../models/Agent");
const redis = require("../config/redis");
const NodeCache = require("node-cache");
const GroceryStore = require("../models/GroceryStore");
const MedicineOrder = require("../models/MedicineOrder");
const Merchant = require("../models/Merchent"); 
const localCache = new NodeCache({ stdTTL: 60 });
require("dotenv").config();

const VERIFY_TOKEN = process.env.secret_key;

const WABA_URL = `https://graph.facebook.com/v22.0/905586875961713/messages`;
const AUTH = {
  Authorization: `Bearer EAATRMkskE2oBQIALFXb47e6hfBSvqoBISQJZByUPC9SZAaJvyZBOBwNB3wOTC7FAL3bHmzW31V6DzFhxGjGMlH8tNZBrA5ZAliXMZAuH59K00OSCtvONaSgfwkrlzQkGCxzz4m999nqc2v7iZA9ZAFw6DZBIJgng3WvdkLdRpIZChuXZAE2AvRawQPK4UW54tFAKkOInyDwXVjZA2fyXOHGZAmQubHrRlgV0fclCCz7ZBWeZBFKpTNJfeZApeWZAw3wRpZAAC1kLwOeLCvxQZAjDAOL1WYegH0WZBmZAU`,
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
      { type: "reply", reply: { id: "ORDER_FOOD", title: "🍽 Order Food" } },
      {  type: "reply", reply: { id: "ORDER_GROCERY", title: "🍽 Order Grocery" } },
      { type: "reply", reply: { id: "ORDER_MEDICINE", title: "🍽 Order Medicine" } }
    ]);
  }

  if (
  msg.type === "interactive" &&
  msg.interactive.button_reply?.id === "ORDER_GROCERY"
) {
  user.chatState = "ASK_GROCERY_LIST";
  await user.save();
  await updateCache(user);

  if (!user.location?.lat || !user.location?.lng) {
    return sendText(phone, "📍 Please share location first. Type *hi* again.");
  }

  // Fetch grocery stores
  const stores = await GroceryStore.find().populate("merchantId");

  // Filter by nearest stores
  const nearbyStores = stores.filter((store) => {
    const loc = store.merchantId?.address?.location;
    if (!loc) return false;

    const dist = distanceKM(
      user.location.lat,
      user.location.lng,
      loc.lat,
      loc.lng
    );

    return dist <= (store.deliveryRange || 5);
  });

  if (!nearbyStores.length) {
    return sendText(phone, "😔 No grocery stores deliver to your location.");
  }

  // WhatsApp-safe titles (<= 24 chars)
  const rows = nearbyStores.map((store) => {
    let name = store.merchantId.storeName || "Grocery Store";
    if (name.length > 24) name = name.slice(0, 21) + "...";

    return {
      id: `GROCERY_${store._id}`,
      title: name,
      description: store.merchantId.address.city || "Nearby Store",
    };
  });

  return sendList(
    phone,
    "🛒 Select a grocery store near you:",
    rows
  );
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
  title: r.menuItems.name.substring(0, 24),  // <= 24 chars
  description: `₹${r.menuItems.price} · ⭐${r.menuItems.rating?.toFixed(1)}` // safe
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
  // ---------------- FOOD ITEM SELECTION ----------------
// if (
//   msg.type === "interactive" &&
//   msg.interactive.list_reply?.id?.startsWith("ITEM_")
// ) {
//   const [, restId, itemId] = msg.interactive.list_reply.id.split("_");
//   const restaurant = await Restaurant.findById(restId).populate("merchantId");
//   const item = restaurant.menuItems.id(itemId);
//   const total = item.price + 29;

//   user.tempOrder = { restId, itemName: item.name, price: item.price, total };
//   user.markModified("tempOrder");
//   user.chatState = "ASK_PAYMENT";
//   await user.save();
//   await updateCache(user);

//   return sendButtons(
//     phone,
//     `🍽 ${item.name}\n💰 Total: ₹${total}\n\nChoose payment:`,
//     [
//       { type: "reply", reply: { id: "COD", title: "💵 Cash" } },
//       { type: "reply", reply: { id: "UPI", title: "📲 UPI" } },
//     ]
//   );
// }


  if (msg.type === "interactive" && ["COD", "UPI"].includes(msg.interactive.button_reply?.id)) {
  const sel = user.tempOrder;

  // ✅ Find all online & free agents
  const agents = await Agent.find({ isOnline: true, isBusy: false });

  // ✅ Filter only NEAREST agents (within 5 KM)
  const nearbyAgents = agents.filter(a => {
    if (!a.currentLocation) return false;
    const d = distanceKM(
      a.currentLocation.lat,
      a.currentLocation.lng,
      user.location.lat,
      user.location.lng
    );
    return d <= 5; // ✅ 5 KM radius
  });

  if (!nearbyAgents.length) {
    return sendText(phone, "⏳ No nearby delivery agents available right now.");
  }

  const restaurant = await Restaurant.findById(sel.restId).populate("merchantId");

  // ✅ Create order WITHOUT agent
  const order = await Order.create({
    customerId: user._id,
    merchantId: restaurant.merchantId._id,
    items: [{ name: sel.itemName, price: sel.price }],
    totalAmount: sel.total,
    deliveryAddress: user.location,
    paymentMethod: msg.interactive.button_reply.id,
    status: "SEARCHING_AGENT", // ✅ IMPORTANT
  });

  // ✅ Mark all nearby agents as notified
  await Agent.updateMany(
    { _id: { $in: nearbyAgents.map(a => a._id) } },
    { $set: { isNotify: true } }
  );

  // ✅ Push order to all agents via PWA (Socket)
  console.log("Nearby Agents :",nearbyAgents)
  console.log("Order", order)
await notifyNearbyAgentsPWA(order, nearbyAgents, "FOOD");


  // ✅ Clear user state
  user.chatState = null;
  user.tempOrder = null;
  await user.save();
  await updateCache(user);

  return sendText(
    phone,
    "✅ Order placed successfully!\n🚀 Notifying nearby delivery agents now..."
  );
}




// Grocery ----------------------------------------------------------------------------------------------------------
 // ---------------- GROCERY STORE SELECTION ----------------
if (
  msg.type === "interactive" &&
  msg.interactive.list_reply?.id?.startsWith("GROCERY_")
) {
  const storeId = msg.interactive.list_reply.id.replace("GROCERY_", "");

  // IMPORTANT: populate merchantId
  const store = await GroceryStore.findById(storeId).populate("merchantId");
  if (!store) return sendText(phone, "⚠ Store not found.");

  user.chatState = "GROCERY_SEARCH";
  user.tempGroceryStore = storeId;
  user.cart = []; 
  await user.save();
  await updateCache(user);

  return sendText(
    phone,
    `🛒 *${store.merchantId.storeName}*\n\n` +
      `Type the grocery item you want:\n\n` +
      `Examples:\n➡ *milk*\n➡ *sugar 1kg*\n➡ *apple*\n➡ *rice 5kg*\n\n` +
      `I'll suggest items automatically.`
  );
}
// Clean the query: remove qty, units
// ---------------- GROCERY SEARCH (AI‑powered text parsing) ----------------
if (user.chatState === "GROCERY_SEARCH" && msg.type === "text") {

  if (!user.tempGroceryStore) {
    return sendText(phone, "⚠ Please select store again.");
  }

  // Load the store (no need for merchantId here)
  const store = await GroceryStore.findById(user.tempGroceryStore);
  if (!store) {
    user.chatState = "ASK_GROCERY_LIST";
    await user.save();
    updateCache(user);
    return sendText(phone, "⚠ Store not found. Please choose again.");
  }

  const rawQuery = msg.text.body || "";

  // ----------- AI parsing ------------
  const groq = require("../config/groqClient"); // adjust path if needed

  // Build a comma-separated list of available store item names
  const itemNames = store.items.map(i => i.name).join(", ");

  const prompt = `
Extract grocery items, quantities, and units from the user message.
Correct spelling mistakes, and match only items from this store list:
${itemNames}

Return JSON only, in this exact format:
[
  { "item": "ItemName", "qty": number, "unit": "unitName" }
]

User message: "${rawQuery}"
`;

  let parsedItems;
  try {
    const aiRes = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // or your chosen model
      messages: [{ role: "user", content: prompt }],
    });

    const json = aiRes.choices[0].message.content.trim();
    parsedItems = JSON.parse(json);
  } catch (err) {
    console.log("AI parse error:", err);
    return sendText(phone, "❌ I couldn't understand that. Please type again.");
  }

  if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
    return sendText(phone, "❌ I couldn't find any items. Try again.");
  }

  // ----------- Match AI results with store items ------------
  // Clear any previous temp item (not strictly needed, but keeps state clean)
  user.tempGroceryItem = null;

  // We'll add each parsed item to cart
  for (const obj of parsedItems) {
    const itemName = (obj.item || "").trim().toLowerCase();
    if (!itemName) continue;

    // Exact or case-insensitive match on name
    const match = store.items.find(
      i => i.name.toLowerCase() === itemName
    );

    if (!match) {
      // If any item is not found, inform the user about that single item
      return sendText(
        phone,
        `❌ Item *${obj.item}* is not available in this store.`
      );
    }

    const qty = obj.qty && obj.qty > 0 ? obj.qty : 1;
    const unit = obj.unit ? obj.unit : match.unit;

    // Add or update in cart
    if (!user.cart) user.cart = [];

    // Check if already in cart: if yes, sum qty (optional; here we add new entry)
    user.cart.push({
      itemId: match._id,
      name: match.name,
      price: match.price,
      unit: unit,
      qty: qty,
    });
  }

  // Save user and cache
  // user.chatState = "GROCERY_ADD_MORE";

  await user.save();
  await updateCache(user);

  // ----------- Respond with summary & options ------------
  let summary = "🛒 *Added to Cart*\n\n";
  parsedItems.forEach(it => {
    summary += `• ${it.item} x ${it.qty} (${it.unit})\n`;
  });

  return sendButtons(
    phone,
    summary + "\nDo you want to add more items?",
    [
      { type: "reply", reply: { id: "ADD_MORE", title: "➕ Add More" } },
      { type: "reply", reply: { id: "CHECKOUT", title: "🧾 Checkout" } },
    ]
  );
}
// ---------------- ADD MORE ITEMS ----------------
if (
  msg.type === "interactive" &&
  (
    msg.interactive?.button_reply?.id === "ADD_MORE" ||
    msg.interactive?.button_reply?.payload === "ADD_MORE" ||
    msg.interactive?.list_reply?.id === "ADD_MORE"
  )
) {
  user.chatState = "GROCERY_SEARCH";
  await user.save();
  await updateCache(user);

  return sendText(phone, "Type another grocery item name:");
}

// ---------------- CHECKOUT ----------------
if (
  msg.type === "interactive" &&
  (
    msg.interactive?.button_reply?.id === "CHECKOUT" ||
    msg.interactive?.button_reply?.payload === "CHECKOUT" ||
    msg.interactive?.list_reply?.id === "CHECKOUT"
  )
) {
  if (!user.cart || !user.cart.length) {
    return sendText(phone, "🛒 Your cart is empty.");
  }

  let total = 0;
  let summary = "🧾 *Your Cart:*\n\n";

  user.cart.forEach((it, i) => {
    const amt = it.price * it.qty;
    total += amt;
    summary += `${i + 1}. ${it.name} - ${it.qty} x ₹${it.price} = ₹${amt}\n`;
  });

  summary += `\n🚚 Delivery: ₹20\n💰 *Total Payable: ₹${total + 20}*`;

  user.chatState = "GROCERY_PAYMENT";
  await user.save();
  await updateCache(user);

  return sendButtons(
    phone,
    summary + "\n\nChoose a payment method:",
    [
      { type: "reply", reply: { id: "G_COD", title: "💵 Cash on Delivery" } },
      { type: "reply", reply: { id: "G_UPI", title: "📲 Pay via UPI" } },
    ]
  );
}
// ---------------- PAYMENT METHOD SELECTED ----------------
// ---------------- PAYMENT METHOD SELECTED ----------------
if (
  msg.type === "interactive" &&
  (
    msg.interactive?.button_reply?.id === "G_COD" ||
    msg.interactive?.button_reply?.id === "G_UPI"
  )
) {
  const payment = msg.interactive.button_reply.id;

  if (payment === "G_COD") {
    user.tempPaymentMethod = "COD";
    user.tempPaymentMethod = "COD";
user.chatState = "GROCERY_CREATE_ORDER";
await user.save();
await updateCache(user);

// ⚡ Immediately process the order
return await processGroceryOrder(user, phone);

  }

  if (payment === "G_UPI") {
    user.tempPaymentMethod = "UPI";
    user.chatState = "WAITING_UPI_PAYMENT";
    await user.save();
    await updateCache(user);

    const total = user.cart.reduce((a, b) => a + b.qty * b.price, 0) + 20;

    const upiLink = `upi://pay?pa=YOUR-UPI-ID@bank&pn=Startup%20Grocery&am=${total}&cu=INR`;

    return sendText(
      phone,
      "📲 *UPI Payment*\n\nClick to pay:\n" +
      upiLink +
      "\n\nAfter payment, reply: *PAID*"
    );
  }
}
// ---------------- FINAL GROCERY ORDER CREATION ----------------
if (
  msg.type === "text" &&
  user.chatState === "WAITING_UPI_PAYMENT" &&
  msg.text.body.trim().toUpperCase() === "PAID"
) {
  user.chatState = "GROCERY_CREATE_ORDER";
  await user.save();
  await updateCache(user);
}







// ---------- 1) User clicked "Order Medicine" button ----------
if (msg.type === "interactive" && msg.interactive.button_reply?.id === "ORDER_MEDICINE") {
  user.chatState = "ASK_MEDICINE_INPUT_TYPE";
  await user.save();
  await updateCache(user);

  return sendButtons(
    phone,
    "💊 How would you like to order medicine?",
    [
      { type: "reply", reply: { id: "MED_UPLOAD", title: "📸Upload Prescription" } },
      { type: "reply", reply: { id: "MED_TEXT", title: "✍️Type Medicine Names" } },
    ]
  );
}

// ---------- 2) User chooses upload prescription ----------
if (msg.type === "interactive" && msg.interactive.button_reply?.id === "MED_UPLOAD") {
  user.chatState = "MED_WAIT_IMAGE";
  await user.save();
  await updateCache(user);
  return sendText(phone, "📸 Please upload a clear photo of your prescription now.");
}

// ---------- 3) User chooses type medicines ----------
if (msg.type === "interactive" && msg.interactive.button_reply?.id === "MED_TEXT") {
  user.chatState = "MED_WAIT_TEXT";
  await user.save();
  await updateCache(user);
  return sendText(phone, "💊 Please type the medicines, one per line. E.g.\nParacetamol 500mg 10 tablets\nCough syrup 100ml");
}

// ---------- 4) Shop Accept/Reject buttons (from notify) ----------
if (msg.type === "interactive" && msg.interactive.button_reply?.id?.startsWith("SHOP_ACCEPT_")) {
  // format: SHOP_ACCEPT_<orderId>_<shopId>
  const [, orderId, shopId] = msg.interactive.button_reply.id.split("_");
  const order = await MedicineOrder.findById(orderId);
  if (!order) return sendText(msg.from, "Order not found.");
  // mark status to show shops are replying
  order.status = "WAITING_OFFERS";
  await order.save();
  return sendText(msg.from, `✅ Accepted. Please reply with the total price for Order ${orderId} as a number, e.g. 350`);
}

if (msg.type === "interactive" && msg.interactive.button_reply?.id?.startsWith("SHOP_REJECT_")) {
  const [, orderId, shopId] = msg.interactive.button_reply.id.split("_");
  // optional: mark the shop as rejected; for now just acknowledge
  return sendText(msg.from, "You rejected the medicine request.");
}

// ---------- 5) Customer choosing an offer from list (OFFER_...) ----------
if (msg.type === "interactive" && msg.interactive.list_reply?.id?.startsWith("OFFER_")) {
  // id format: OFFER_<offerIndex>_<orderId>_<shopId>
  // We will build offer ids as OFFER_<idx>_<orderId>_<shopId> when sending list
  const parts = msg.interactive.list_reply.id.split("_");
  // parts[0] = "OFFER", parts[1] = idx, parts[2] = orderId, parts[3] = shopId
  const offerIdx = Number(parts[1]);
  const orderId = parts[2];
  const shopId = parts[3];

  const order = await MedicineOrder.findById(orderId).populate("offers.pharmacyId");
  if (!order) return sendText(phone, "Offer not found.");

  const offer = order.offers[offerIdx];
  if (!offer) return sendText(phone, "Offer not found.");

  // set selected pharmacy and final price
  order.selectedPharmacyId = offer.pharmacyId;
  order.finalPrice = offer.price;
  order.status = "AWAITING_USER_CONFIRMATION";
  await order.save();

  // notify pharmacy that user picked their offer
  await sendText(offer.pharmacyPhone, `✅ Customer selected your price ₹${offer.price} for Order ${order._id}. Please prepare medicines.`);

  // ask user to choose payment
  user.chatState = "MED_AWAIT_PAYMENT_METHOD";
  await user.save();
  await updateCache(user);

  return sendButtons(phone, `You selected ${offer.pharmacyName} · ₹${offer.price}\nChoose payment:`, [
    { type: "reply", reply: { id: "MED_COD", title: "💵 Cash on Delivery" } },
    { type: "reply", reply: { id: "MED_UPI", title: "📲 Pay via UPI" } },
  ]);
}

// Image received when user was asked to upload prescription
if (user.chatState === "MED_WAIT_IMAGE" && msg.type === "image") {
  const mediaId = msg.image.id;

  // 1️⃣ Get temporary media download URL from WhatsApp
  const tempUrl = await getWhatsAppMediaUrl(mediaId);
  if (!tempUrl) {
    return sendText(phone, "❌ Could not download prescription. Try again.");
  }

  // 2️⃣ Upload to Cloudinary
  const uploadToCloudinary = require("../config/uploadToCloudinary");
  const cloudUrl = await uploadToCloudinary(tempUrl);

  if (!cloudUrl) {
    return sendText(phone, "❌ Failed to save image. Try again.");
  }

  // 3️⃣ Save Cloudinary URL
  user.tempPrescription = cloudUrl;
  user.tempMedicinesText = "";
  user.tempMedicineOrderId = null;
  user.chatState = "MED_PROCESSING";

  await user.save();
  await updateCache(user);

  // 4️⃣ Proceed to medicine order creation
  await processMedicineRequest(user, phone);
  return;
}



// Text received while user is typing medicine names
if (user.chatState === "MED_WAIT_TEXT" && msg.type === "text") {
  user.tempMedicineOrderId = null;
  user.tempPrescription = null;
  user.tempMedicinesText = msg.text.body;
  user.chatState = "MED_PROCESSING";
  await user.save();
  await updateCache(user);

  await processMedicineRequest(user, phone);
  return;
}



// If this sender is a registered pharmacy and sending numeric price (or "PRICE 350"), we capture it
if (msg.type === "text") {
  const senderPhone = normalize(msg.from);

  // try to find a pharmacy with this phone
  const shop = await Merchant.findOne({ $or: [{ phone: senderPhone }, { "merchantId.phone": senderPhone }] });
  if (shop && shop.businessType === "PHARMACY") {
    const txt = (msg.text.body || "").trim();
    const m = txt.match(/(\d+(\.\d+)?)/);
    if (!m) {
      // not a numeric message — ignore or ask clarification
      return sendText(msg.from, "Please reply with the total price as a number. Example: 350");
    }
    const price = Number(m[1]);

    // find active medicine order where this pharmacy is notified and order is WAITING_OFFERS or similar
    const order = await MedicineOrder.findOne({
      status: { $in: ["WAITING_OFFERS","OFFERS_RECEIVED","PENDING"] },
      notifiedPharmacies: shop._id,
      "offers.pharmacyId": { $ne: shop._id }
    });

    if (!order) {
      return sendText(msg.from, "No pending medicine request found to submit price for.");
    }

    // push offer
    order.offers = order.offers || [];
    order.offers.push({
      pharmacyId: shop._id,
      pharmacyName: shop.storeName || shop.storeName,
      pharmacyPhone: shop.phone,
      price,
    });
    order.status = "OFFERS_RECEIVED";
    await order.save();

    // notify shop
    await sendText(msg.from, `✅ Price received: ₹${price} for Order ${order._id}`);

    // notify customer with current offers (build WhatsApp list)
    const customer = await User.findById(order.customerId);
    if (!customer) return;

    const rows = (order.offers || []).map((o, idx) => ({
      id: `OFFER_${idx}_${order._id}_${o.pharmacyId}`,
      title: `₹${o.price} · ${o.pharmacyName}`,
      description: `Tap to choose this offer`,
    })).slice(0, 10);

    // update customer state so next interactive list selection is expected
    customer.chatState = "ASK_SELECT_MEDICINE_OFFER";
    await customer.save();
    await updateCache(customer);

    await sendList(customer.phone, `💊 Offers received for your medicine request (Order ${order._id}):`, rows);
    return;
  }

  // continue with your other text handlers (food/grocery etc.)
}


if (msg.type === "interactive" && msg.interactive.button_reply?.id === "MED_COD") {
  // user selected COD after picking offer
  if (!user.tempMedicineOrderId) return sendText(phone, "No active medicine order found.");
  const medOrder = await MedicineOrder.findById(user.tempMedicineOrderId);
  if (!medOrder) return sendText(phone, "Order not found.");

  medOrder.paymentMethod = "COD";
  medOrder.status = "CONFIRMED";
  await medOrder.save();

  // finalize: selectedPharmacyId should already be present (when user picked offer)
  user.chatState = null;
  await user.save();
  await updateCache(user);

  const customer = user;
  await assignAgentAndCreateFinalOrder(medOrder, customer);
  return;
}

if (msg.type === "interactive" && msg.interactive.button_reply?.id === "MED_UPI") {
  if (!user.tempMedicineOrderId) return sendText(phone, "No active medicine order found.");
  const medOrder = await MedicineOrder.findById(user.tempMedicineOrderId);
  if (!medOrder) return sendText(phone, "Order not found.");

  // send a simple UPI link (replace YOUR-UPI-ID)
  const total = (medOrder.finalPrice || 0) + 20;
  const upiLink = `upi://pay?pa=YOUR-UPI-ID@bank&pn=YourShop&am=${total}&cu=INR`;

  medOrder.paymentMethod = "UPI";
  medOrder.status = "AWAITING_USER_CONFIRMATION";
  await medOrder.save();

  await sendText(phone, `📲 Please pay ₹${total} using UPI:\n${upiLink}\n\nAfter payment reply with PAID`);
  user.chatState = "MED_WAIT_UPI_PAID";
  await user.save();
  await updateCache(user);
  return;
}


if (msg.type === "text" && user.chatState === "MED_WAIT_UPI_PAID" && msg.text.body.trim().toUpperCase() === "PAID") {
  const medOrder = await MedicineOrder.findById(user.tempMedicineOrderId);
  if (!medOrder) return sendText(phone, "Order not found.");
  medOrder.status = "CONFIRMED";
  await medOrder.save();

  user.chatState = null;
  await user.save();
  await updateCache(user);

  const customer = user;
  await assignAgentAndCreateFinalOrder(medOrder, customer);
  return sendText(phone, "✅ Payment noted. We are processing your order.");
}
};



async function processGroceryOrder(user, phone) {

  const store = await GroceryStore.findById(user.tempGroceryStore).populate("merchantId");
  if (!store) return sendText(phone, "⚠ Store not found.");

  // ✅ Find all online & free agents
  const agents = await Agent.find({ isOnline: true, isBusy: false });

  // ✅ Filter only nearby agents (within 5 KM)
  const nearbyAgents = agents.filter(a => {
    if (!a.currentLocation) return false;

    const d = distanceKM(
      a.currentLocation.lat,
      a.currentLocation.lng,
      user.location.lat,
      user.location.lng
    );

    return d <= 5; // ✅ 5 KM radius
  });

  if (!nearbyAgents.length) {
    return sendText(phone, "⏳ No nearby delivery agents available right now.");
  }

  // ✅ Calculate total & build items
  let total = 20;
  const orderItems = [];

  user.cart.forEach((it) => {
    const amt = it.qty * it.price;
    total += amt;
    orderItems.push({
      name: it.name,
      price: it.price,
      qty: it.qty
    });
  });

  // ✅ Create order WITHOUT agent assignment
  const order = await Order.create({
    customerId: user._id,
    merchantId: store.merchantId._id,
    items: orderItems,
    totalAmount: total,
    deliveryAddress: user.location,
    paymentMethod: user.tempPaymentMethod || "COD",
    status: "SEARCHING_AGENT",   // ✅ IMPORTANT
    type: "GROCERY",
  });

  // ✅ Mark all nearby agents as notified
  await Agent.updateMany(
    { _id: { $in: nearbyAgents.map(a => a._id) } },
    { $set: { isNotify: true } }
  );

  // ✅ Broadcast to ALL agents via PWA (Socket)
  await notifyNearbyAgentsPWA(order, nearbyAgents, "GROCERY");


  // ✅ Clear user state
  user.cart = [];
  user.tempGroceryStore = null;
  user.tempPaymentMethod = null;
  user.chatState = "IDLE";
  await user.save();
  await updateCache(user);

  // ✅ Send confirmation to user
  return sendText(
    phone,
    `🛒 *Grocery Order Placed!*\n\n` +
    `🛍 Store: ${store.merchantId.storeName}\n` +
    `🚀 Searching for a nearby delivery agent...\n\n` +
    `You will be notified once an agent accepts your order.`
  );
}



// Clean user typed medicine text
function normalizeMedicineText(text) {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .join("\n");
}

// limit number of shops to notify
const MAX_PHARMACIES_TO_NOTIFY = 5;

// small helper to find nearby pharmacies (returns array of Merchant docs)
async function findNearbyPharmacies(userLocation, maxDistanceKm = 5) {
  const merchants = await Merchant.find({ businessType: "PHARMACY", isActive: true }).lean();
  const nearby = merchants
    .map(m => {
      const loc = m.address?.location || m.location;
      if (!loc || !loc.lat || !loc.lng) return null;
      const d = distanceKM(userLocation.lat, userLocation.lng, Number(loc.lat), Number(loc.lng));
      return { m, d };
    })
    .filter(Boolean)
    .filter(x => x.d <= maxDistanceKm)
    .sort((a,b) => a.d - b.d)
    .map(x => x.m);
  return nearby;
}

async function processMedicineRequest(user, phone) {

  // ------------------ 1) Check location ------------------
  if (!user.location?.lat || !user.location?.lng) {
    user.chatState = null;
    await user.save();
    await updateCache(user);
    return sendText(phone, "📍 Please share your location first. Type hi to restart.");
  }

  // ------------------ 2) Find nearby pharmacies ------------------
  const nearby = await findNearbyPharmacies(user.location, 5);
  if (!nearby.length) {
    user.chatState = null;
    await user.save();
    await updateCache(user);
    return sendText(phone, "😔 No medical shops nearby.");
  }

  const notifyShops = nearby.slice(0, MAX_PHARMACIES_TO_NOTIFY);

  // ------------------ 3) Build display text ------------------
  let details = "";

  if (user.tempMedicinesText) {
    details = `Prescription Image:\n${user.tempPrescription}`;;
  } else if (user.tempPrescription) {
    // This should already be media URL fetched using getMediaUrl()
    details = `Prescription Image:\n${user.tempPrescription}`;
  } else {
    details = "Request details unavailable.";
  }

  // ------------------ 4) Create medicine order ------------------
  const order = await MedicineOrder.create({
    customerId: user._id,
    medicinesText: user.tempMedicinesText || "",
    prescriptionMediaId: user.tempPrescription || null, // URL stored here
    notifiedPharmacies: notifyShops.map(s => s._id),
    status: "WAITING_OFFERS",
    offerExpiresAt: new Date(Date.now() + (5 * 60 * 1000)), // 5 min expiry
    deliveryAddress: {
      lat: user.location.lat,
      lng: user.location.lng,
      text: user.address || ""
    }
  });

  // Save active order reference
  user.tempMedicineOrderId = order._id;
  user.chatState = "WAITING_OFFERS";
  await user.save();
  await updateCache(user);

  // ------------------ 5) Notify pharmacies ------------------
  for (const shop of notifyShops) {
    const shopPhone = shop.phone;
    const shopName = shop.storeName || "Medical Shop";

    const body =
      `🛑 New Medicine Request\n` +
      `Order ID: ${order._id}\n` +
      `Customer: ${user.phone}\n\n` +
      `${details}\n\n` +                    // <—— now includes prescription URL
      `Press Accept to send price or Reject.`;

    await sendButtons(
      shopPhone,
      body,
      [
        { type: "reply", reply: { id: `SHOP_ACCEPT_${order._id}_${shop._id}`, title: "Accept & Enter Price" } },
        { type: "reply", reply: { id: `SHOP_REJECT_${order._id}_${shop._id}`, title: "Reject" } }
      ]
    );
  }

  // ------------------ 6) Confirmation to customer ------------------
  await sendText(phone, "⏳ Request sent to nearby pharmacies. We'll notify you when offers arrive.");
  return;
}


async function assignAgentAndCreateFinalOrder(medOrder, customer) {

  // ✅ Mark order as searching for agent
  medOrder.status = "SEARCHING_AGENT";
  await medOrder.save();

  // ✅ Notify ALL free online agents
  const agents = await Agent.find({ isOnline: true, isBusy: false });

  if (!agents.length) {
    await sendText(
      customer.phone,
      "✅ Medicine order confirmed.\n⏳ Currently no agents available. We will assign one soon."
    );
    return;
  }

  await Agent.updateMany(
    { _id: { $in: agents.map(a => a._id) } },
    { $set: { isNotify: true } }
  );

  // ✅ Broadcast to PWA
  await notifyNearbyAgentsPWA(medOrder, agents, "MEDICINE");


  // ✅ Notify customer
  await sendText(
    customer.phone,
    "✅ Medicine order confirmed!\n🚀 Searching for a delivery agent now..."
  );
}


async function getWhatsAppMediaUrl(mediaId) {
  try {
    const res = await axios.get(
      `https://graph.facebook.com/v22.0/${mediaId}`,
      { headers: AUTH }
    );
    return res.data.url; // temporary download URL
  } catch (err) {
    console.error("WhatsApp Media URL Error:", err.response?.data || err);
    return null;
  }
}

// async function notifyAllAgentsPWA(orderId, orderType) {
//   const agents = await Agent.find({ isOnline: true, isBusy: false });

//   await Agent.updateMany(
//     { _id: { $in: agents.map(a => a._id) } },
//     { $set: { isNotify: true } }
//   );

//   global.io.emit("new-order", {
//     orderId,
//     type: orderType
//   });

//   console.log("✅ Order broadcasted to all agents");
// }

async function notifyNearbyAgentsPWA(order, nearbyAgents, type) {
  console.log("🚀 Notifying agents:", nearbyAgents.length);
console.log("🧠 Stored sockets:", global.agentSockets);

  for (const agent of nearbyAgents) {
    const socketId = global.agentSockets?.[agent._id.toString()];
    if (socketId) {
      console.log("📤 Sending to:", agent._id.toString(), socketId);

      global.io.to(socketId).emit("new-order", {
        orderId: order._id,
        type,
      });
    }
  }

  console.log("✅ Notified nearby logged-in agents via PWA");
}
