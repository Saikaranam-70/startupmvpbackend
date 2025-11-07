// controllers/orderController.js
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Merchant = require("../models/Merchent"); // fixed typo
const Agent = require("../models/Agent");

// ---------- Helpers

// Haversine distance (km)
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// formal list for safety
const ORDER_STATUS = {
  PENDING: "PENDING",
  ASSIGNED: "ASSIGNED",
  AGENT_ACCEPTED: "AGENT_ACCEPTED",
  PICKED_UP: "PICKED_UP",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

// Try to atomically lock an agent (avoid double-assign across requests)
async function tryLockAgent(agentId, orderId) {
  const updated = await Agent.findOneAndUpdate(
    { _id: agentId, isOnline: true, isBusy: { $ne: true } },
    { $set: { isBusy: true, activeOrderId: orderId } },
    { new: true }
  );
  return updated; // null if lock failed
}

// Get best nearby agents (sorted by rating desc, then distance asc)
async function getCandidateAgents(merchantLat, merchantLng, radiusKm = 10) {
  const agents = await Agent.find({ type: "DELIVERY", isOnline: true })
    .select("name rating currentLocation isBusy");

  const ranked = agents
    .map(a => {
      if (!a?.currentLocation?.lat || !a?.currentLocation?.lng) return null;
      const d = distanceKm(
        merchantLat, merchantLng,
        a.currentLocation.lat, a.currentLocation.lng
      );
      return { agent: a, distance: d };
    })
    .filter(Boolean)
    .filter(x => x.distance <= radiusKm)
    .sort((x, y) => {
      if (y.agent.rating === x.agent.rating) return x.distance - y.distance;
      return y.agent.rating - x.agent.rating;
    });

  return ranked;
}

// Assign first lockable agent from ranked list
async function assignBestAgent(order, rankedAgents) {
  for (const { agent } of rankedAgents) {
    const locked = await tryLockAgent(agent._id, order._id);
    if (locked) {
      order.agentId = locked._id;
      order.status = ORDER_STATUS.ASSIGNED;
      order.statusHistory.push({ status: ORDER_STATUS.ASSIGNED, at: new Date(), note: `Assigned to ${locked.name}` });
      await order.save();
      // TODO: sendNotificationToAgent(locked, order)
      return locked;
    }
  }
  return null;
}

// Reassign helper (used on reject/offline)
async function reassignAgent(orderId) {
  const order = await Order.findById(orderId).populate("merchantId");
  if (!order) return null;
  if (!order.merchantId?.address?.location) return null;

  const { lat, lng } = order.merchantId.address.location;
  const ranked = await getCandidateAgents(lat, lng, 10);

  // Avoid re-assigning to same agent
  const filtered = ranked.filter(x => String(x.agent._id) !== String(order.agentId || ""));

  const newAgent = await assignBestAgent(order, filtered);
  if (!newAgent) {
    order.status = ORDER_STATUS.PENDING;
    order.statusHistory.push({ status: ORDER_STATUS.PENDING, at: new Date(), note: "No agent available (reassign queued)" });
    await order.save();
  }
  return newAgent;
}

// ---------- Controllers

// Create Order (auto-assign best agent; agent must Accept/Reject)
exports.createOrder = async (req, res) => {
  try {
    const {
      customerId,
      merchantId,
      items,
      deliveryAddress,      // human-readable address
      deliveryLocation,     // {lat, lng} — send this from client if you have it
      paymentMethod,
    } = req.body;

    if (!items?.length) return res.status(400).json({ message: "No items selected" });

    const merchant = await Merchant.findById(merchantId);
    if (!merchant || !merchant.address?.location) {
      return res.status(404).json({ message: "Merchant location not found" });
    }

    // Safer total calculation
    const totalAmount = items.reduce((sum, it) => {
      const price = Number(it.price || it.unitPrice || 0);
      const qty = Number(it.qty || it.quantity || 1);
      return sum + price * qty;
    }, 0);

    // Create order in PENDING first
    const order = await Order.create({
      customerId,
      merchantId,
      items,
      totalAmount,
      deliveryAddress,
      deliveryLocation: deliveryLocation || null, // { lat, lng } recommended
      paymentMethod,
      paymentStatus: PAYMENT_STATUS.PENDING,
      status: ORDER_STATUS.PENDING,
      statusHistory: [{ status: ORDER_STATUS.PENDING, at: new Date(), note: "Order created" }],
    });

    // Rank and lock agent
    const { lat, lng } = merchant.address.location;
    const ranked = await getCandidateAgents(lat, lng, 10);
    const assigned = await assignBestAgent(order, ranked);

    if (assigned) {
      return res.status(201).json({
        message: `Order placed and assigned to ${assigned.name}. Awaiting agent acceptance.`,
        order,
      });
    }

    return res.status(201).json({
      message: "Order placed. No nearby agent available right now. Will retry assignment.",
      order,
    });
  } catch (err) {
    console.error("CreateOrder Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Agent accepts order
exports.acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { agentId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.agentId) !== String(agentId))
      return res.status(403).json({ message: "You are not assigned to this order" });

    if (order.status !== ORDER_STATUS.ASSIGNED)
      return res.status(400).json({ message: `Order not in ASSIGNED state (current: ${order.status})` });

    order.status = ORDER_STATUS.AGENT_ACCEPTED;
    order.statusHistory.push({ status: ORDER_STATUS.AGENT_ACCEPTED, at: new Date(), note: "Agent accepted" });
    await order.save();

    return res.json({ message: "Order accepted", order });
  } catch (err) {
    console.error("AcceptOrder Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Agent rejects order (unlock and reassign)
exports.rejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { agentId, reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.agentId) !== String(agentId))
      return res.status(403).json({ message: "You are not assigned to this order" });

    // Unlock old agent
    await Agent.findByIdAndUpdate(agentId, { $set: { isBusy: false, activeOrderId: null } });

    // Reset order and reassign
    order.status = ORDER_STATUS.PENDING;
    order.statusHistory.push({ status: ORDER_STATUS.PENDING, at: new Date(), note: `Agent rejected: ${reason || "no reason"}` });
    await order.save();

    const newAgent = await reassignAgent(orderId);

    return res.json({
      message: newAgent
        ? `Reassigned to ${newAgent.name}`
        : "No agent available for reassignment (will retry)",
      order: await Order.findById(orderId),
    });
  } catch (err) {
    console.error("RejectOrder Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Agent live location updates
exports.updateAgentLocation = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { lat, lng } = req.body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ message: "lat/lng required as numbers" });
    }

    const agent = await Agent.findByIdAndUpdate(
      agentId,
      { $set: { currentLocation: { lat, lng } } },
      { new: true }
    );

    if (!agent) return res.status(404).json({ message: "Agent not found" });
    res.json({ message: "Location updated", agent });
  } catch (err) {
    console.error("UpdateAgentLocation Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Progress order status (merchant/agent actions)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, by } = req.body; // by: 'AGENT' | 'MERCHANT' | 'SYSTEM'

    const allowed = new Set(Object.values(ORDER_STATUS));
    if (!allowed.has(status)) return res.status(400).json({ message: "Invalid status" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Simple guard for sane transitions
    const validFlow = [
      ORDER_STATUS.PENDING,
      ORDER_STATUS.ASSIGNED,
      ORDER_STATUS.AGENT_ACCEPTED,
      ORDER_STATUS.PICKED_UP,
      ORDER_STATUS.OUT_FOR_DELIVERY,
      ORDER_STATUS.DELIVERED,
      ORDER_STATUS.COMPLETED,
    ];

    const currentIdx = validFlow.indexOf(order.status);
    const nextIdx = validFlow.indexOf(status);
    if (nextIdx === -1 || nextIdx < currentIdx) {
      return res.status(400).json({ message: `Invalid transition ${order.status} -> ${status}` });
    }

    order.status = status;
    order.statusHistory.push({ status, at: new Date(), note: `By ${by || "SYSTEM"}` });

    // Unlock agent after delivery completion
    if (status === ORDER_STATUS.DELIVERED || status === ORDER_STATUS.COMPLETED) {
      if (order.agentId) {
        await Agent.findByIdAndUpdate(order.agentId, { $set: { isBusy: false, activeOrderId: null } });
      }
    }

    await order.save();
    res.json({ message: "Status updated", order });
  } catch (err) {
    console.error("UpdateOrderStatus Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Payment status update
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus } = req.body;
    const allowed = new Set(Object.values(PAYMENT_STATUS));
    if (!allowed.has(paymentStatus)) return res.status(400).json({ message: "Invalid payment status" });

    const order = await Order.findByIdAndUpdate(
      orderId,
      { $set: { paymentStatus } },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Payment status updated", order });
  } catch (err) {
    console.error("UpdatePaymentStatus Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Merchant view
exports.getOrdersByMerchant = async (req, res) => {
  try {
    const { merchantId } = req.params;
    const orders = await Order.find({ merchantId })
      .populate("customerId", "phone address")
      .populate("agentId", "name phone rating vehicleType");
    res.json(orders);
  } catch (err) {
    console.error("GetOrdersByMerchant Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
