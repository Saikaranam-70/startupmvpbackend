const Order = require("../models/Order");
const Merchant = require("../models/Merchent");
const Agent = require("../models/Agent");

// ✅ Helper: Calculate Distance (Haversine Formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ✅ Create Order + Auto Assign Agent
exports.createOrder = async (req, res) => {
  try {
    const { customerId, merchantId, items, deliveryAddress, paymentMethod } = req.body;

    if (!items?.length) {
      return res.status(400).json({ message: "No items selected" });
    }

    // Get merchant info
    const merchant = await Merchant.findById(merchantId);
    if (!merchant || !merchant.address?.location) {
      return res.status(404).json({ message: "Merchant location not found" });
    }

    // Find nearby online delivery agents
    const agents = await Agent.find({
      type: "DELIVERY",
      isOnline: true,
    });

    // Calculate distances & sort
    const nearbyAgents = agents
      .map((agent) => {
        if (!agent.currentLocation?.lat || !agent.currentLocation?.lng) return null;
        const distance = calculateDistance(
          merchant.address.location.lat,
          merchant.address.location.lng,
          agent.currentLocation.lat,
          agent.currentLocation.lng
        );
        return { agent, distance };
      })
      .filter(Boolean)
      .filter((a) => a.distance <= 10) // ✅ within 10km radius
      .sort((a, b) => {
        if (b.agent.rating === a.agent.rating) return a.distance - b.distance;
        return b.agent.rating - a.agent.rating;
      });

    const assignedAgent = nearbyAgents.length > 0 ? nearbyAgents[0].agent : null;

    // Calculate total
    const totalAmount = items.reduce((acc, item) => acc + item.total, 0);

    // Create order
    const order = new Order({
      customerId,
      merchantId,
      agentId: assignedAgent?._id || null,
      items,
      totalAmount,
      deliveryAddress,
      paymentMethod,
      status: assignedAgent ? "ASSIGNED" : "PENDING",
    });

    await order.save();

    res.status(201).json({
      message: assignedAgent
        ? `Order placed and assigned to ${assignedAgent.name}`
        : "Order placed but no nearby agent found",
      order,
    });
  } catch (error) {
    console.error("Order Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Get Orders for Merchant
exports.getOrdersByMerchant = async (req, res) => {
  try {
    const { merchantId } = req.params;
    const orders = await Order.find({ merchantId })
      .populate("customerId", "phone address")
      .populate("agentId", "name phone rating vehicleType");
    res.json(orders);
  } catch (error) {
    console.error("Get Orders Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
