const Agent = require("../models/Agent");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const redis = require("../config/redis"); // ✅ your redis client
const NodeCache = require("node-cache");

// 🧠 In-memory data structure for quick lookups
const onlineAgentsMap = new Map(); // {agentId -> {lat, lng}}
const localCache = new NodeCache({ stdTTL: 60 }); // 1-min memory cache

// Utility function
const cacheKey = (id) => `agent:${id}`;

// ✅ Register Agent
exports.registerAgent = async (req, res) => {
  try {
    const { name, phone, password, type, vehicleType, vehicleNumber } = req.body;
    console.log("called")

    if (!name || !phone || !type || !vehicleType) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    const existingAgent = await Agent.findOne({ phone }).lean();
    if (existingAgent) {
      return res.status(400).json({ message: "Phone already registered" });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const agent = new Agent({
      name,
      phone,
      password: hashedPassword,
      type,
      vehicleType,
      vehicleNumber,
    });
    console.log("called")
    await agent.save();

    // Cache this agent for quick future reads
    await redis.set(cacheKey(agent._id), JSON.stringify(agent), "EX", 300);

    res.status(201).json({ message: "Agent registered successfully", agent });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Login Agent (with caching)
exports.loginAgent = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res.status(400).json({ message: "Phone and password required" });

    // Check cache first
    const cachedAgent = await redis.get(`agent:phone:${phone}`);
    let agent = cachedAgent ? JSON.parse(cachedAgent) : await Agent.findOne({ phone }).lean();

    if (!agent) return res.status(404).json({ message: "Agent not found" });

    if (!cachedAgent) await redis.set(`agent:phone:${phone}`, JSON.stringify(agent), "EX", 300);

    const isMatch = await bcrypt.compare(password, agent.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: agent._id }, process.env.secret_key, { expiresIn: "7d" });

    res.status(200).json({ message: "Login successful", token, agent });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Get Agent by ID (Redis Cache + In-Memory Backup)
exports.getAgentById = async (req, res) => {
  try {
    const { agentId } = req.params;

    // Check Redis cache
    let cached = await redis.get(cacheKey(agentId));
    if (cached) return res.status(200).json({ source: "redis", agent: JSON.parse(cached) });

    // Check in-memory cache
    let memoryCached = localCache.get(agentId);
    if (memoryCached) return res.status(200).json({ source: "memory", agent: memoryCached });

    // Fetch from MongoDB
    const agent = await Agent.findById(agentId).lean();
    if (!agent) return res.status(404).json({ message: "Agent not found" });

    // Store in Redis + Memory
    await redis.set(cacheKey(agentId), JSON.stringify(agent), "EX", 300);
    localCache.set(agentId, agent);

    res.status(200).json({ source: "database", agent });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Update Online/Offline Status + Update Cache + Map
exports.updateOnlineStatus = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { isOnline } = req.body;

    const agent = await Agent.findByIdAndUpdate(agentId, { isOnline }, { new: true }).lean();
    if (!agent) return res.status(404).json({ message: "Agent not found" });

    if (isOnline) onlineAgentsMap.set(agentId, agent.currentLocation || {});
    else onlineAgentsMap.delete(agentId);

    // Update cache
    await redis.set(cacheKey(agentId), JSON.stringify(agent), "EX", 300);
    localCache.set(agentId, agent);

    res.status(200).json({ message: `Agent is now ${isOnline ? "Online" : "Offline"}`, agent });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Update Location (with real-time structure update)
exports.updateLocation = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { lat, lng } = req.body;

    const agent = await Agent.findByIdAndUpdate(
      agentId,
      { currentLocation: { lat, lng } },
      { new: true }
    ).lean();

    if (!agent) return res.status(404).json({ message: "Agent not found" });

    // Update Redis + Memory + Map
    await redis.set(cacheKey(agentId), JSON.stringify(agent), "EX", 300);
    localCache.set(agentId, agent);
    if (agent.isOnline) onlineAgentsMap.set(agentId, { lat, lng });

    res.status(200).json({ message: "Location updated successfully", agent });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Fast Nearby Agents Lookup using Map (O(n))
exports.getNearbyAgents = async (req, res) => {
  try {
    const { lat, lng, radius = 3 } = req.query; // km
    const R = 6371;

    const nearby = [];
    for (const [id, loc] of onlineAgentsMap.entries()) {
      if (!loc.lat || !loc.lng) continue;
      const dLat = ((loc.lat - lat) * Math.PI) / 180;
      const dLng = ((loc.lng - lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat * Math.PI / 180) * Math.cos(loc.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance <= radius) nearby.push({ id, distance });
    }

    res.status(200).json({ count: nearby.length, nearby });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


const Order = require("../models/Order");

// ✅ Get all assigned orders for an agent
exports.getAssignedOrders = async (req, res) => {
  try {
    const { agentId } = req.params;

    // Fetch orders assigned to this agent
    const orders = await Order.find({ agentId })
      .populate("customerId", "name phone")
      .populate("merchantId", "name address")
      .sort({ createdAt: -1 });

    res.status(200).json({ count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


const allowedNextStatuses = {
  ASSIGNED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["DISPATCHED"],
  DISPATCHED: ["DELIVERED"]
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { agentId, orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Check if this agent is assigned to the order
    if (order.agentId?.toString() !== agentId) {
      return res.status(403).json({ message: "Not allowed to update this order" });
    }

    // Validate status transition
    const validNext = allowedNextStatuses[order.status] || [];
    if (!validNext.includes(status)) {
      return res.status(400).json({
        message: `Invalid status change. Allowed next: ${validNext.join(", ")}`,
      });
    }

    order.status = status;
    await order.save();

    res.status(200).json({ message: "Order status updated successfully", order });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
