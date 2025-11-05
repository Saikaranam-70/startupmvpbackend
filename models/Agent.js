
const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String }, 
  type: { type: String, enum: ["DELIVERY", "RIDE"], required: true },
  vehicleType: { type: String, enum: ["BIKE", "CAR", "AUTO"], required: true },
  vehicleNumber: { type: String },

  isVerified: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
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
