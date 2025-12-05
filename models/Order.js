const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
    },
    items: [
      {
        name: String,
        price: Number,
        quantity: Number,
        total: Number,
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ASSIGNED", "CONFIRMED", "DISPATCHED", "DELIVERED", "CANCELLED", "SEARCHING_AGENT"],
      default: "PENDING",
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      default: "COD",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
