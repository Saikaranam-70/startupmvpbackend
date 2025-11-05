// models/RideCaptain.js
const mongoose = require("mongoose");

const rideCaptainSchema = new mongoose.Schema({
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", required: true },
  totalRides: { type: Number, default: 0 },
  activeRide: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
});

module.exports = mongoose.model("RideCaptain", rideCaptainSchema);
