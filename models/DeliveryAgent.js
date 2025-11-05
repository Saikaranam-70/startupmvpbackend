// models/DeliveryAgent.js
const mongoose = require("mongoose");

const deliveryAgentSchema = new mongoose.Schema({
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", required: true },
  assignedOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
  completedDeliveries: { type: Number, default: 0 },
});

module.exports = mongoose.model("DeliveryAgent", deliveryAgentSchema);
