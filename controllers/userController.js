const User = require("../models/User");
const redis = require("../config/redis");       // your redis client
const NodeCache = require("node-cache");        // in-memory cache
const localCache = new NodeCache({ stdTTL: 60 }); // 1-min TTL

const normalizePhone = (phone) => {
  phone = phone.replace(/^\+?91/, "");
  return `+91${phone}`;
};
const cacheKey = (phone) => `user:${normalizePhone(phone)}`;

exports.createOrUpdateUser = async (req, res) => {
  try {
    let { phone, address } = req.body;
    if (!phone || !address)
      return res.status(400).json({ message: "Phone and address are required" });

    phone = normalizePhone(phone);

    const user = await User.findOneAndUpdate(
      { phone },
      { address },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await redis.set(cacheKey(phone), JSON.stringify(user), "EX", 300);
    localCache.set(cacheKey(phone), user); // IMPORTANT

    res.status(200).json({ message: "User record saved", user });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


exports.findOrCreateUser = async (phone) => {
  phone = normalizePhone(phone);

  const key = cacheKey(phone);

  const redisUser = await redis.get(key);
  if (redisUser) return JSON.parse(redisUser);

  const memoryUser = localCache.get(key);
  if (memoryUser) return memoryUser;

  let user = await User.findOne({ phone }).lean();
  if (!user) user = await User.create({ phone, address: "not-provided" });

  await redis.set(key, JSON.stringify(user), "EX", 300);
  localCache.set(key, user);

  return user;
};



// ✅ Get User by Phone (uses cache → memory → DB)
exports.getUserByPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    // 1️⃣ check Redis first
    const cached = await redis.get(cacheKey(phone));
    if (cached)
      return res.status(200).json({ source: "redis", user: JSON.parse(cached) });

    // 2️⃣ fallback to local memory cache
    const local = localCache.get(phone);
    if (local)
      return res.status(200).json({ source: "memory", user: local });

    // 3️⃣ finally hit DB
    const user = await User.findOne({ phone }).lean();
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // ✅ store in caches for next time
    await redis.set(cacheKey(phone), JSON.stringify(user), "EX", 300);
    localCache.set(phone, user);

    res.status(200).json({ source: "database", user });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// ✅ Delete from cache (optional)
exports.clearUserCache = async (req, res) => {
  try {
    const { phone } = req.params;
    await redis.del(cacheKey(phone));
    localCache.del(phone);
    res.status(200).json({ message: "Cache cleared" });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

exports.updateUserAddress = async (phone, address) => {
  const cleaned = phone.startsWith("+") ? phone : `+${phone}`;
  return User.findOneAndUpdate({ phone: cleaned }, { address }, { new: true });
};