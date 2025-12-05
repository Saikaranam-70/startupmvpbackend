const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String },
  type: { type: String, enum: ["DELIVERY", "RIDE"], required: true },
  vehicleType: { type: String, enum: ["BIKE", "CAR", "AUTO"], required: true },
  vehicleNumber: { type: String },
  isNotify:{type: Boolean, default:false},
  isVerified: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  isBusy: { type: Boolean, default: false }, // NEW
  activeOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null,
  }, //
  currentLocation: {
    lat: Number,
    lng: Number,
  },

  walletBalance: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  totalTrips: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Agent", agentSchema);
