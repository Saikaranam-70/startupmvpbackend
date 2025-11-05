const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
    },
    pickup: {
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    drop: {
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    distanceKm: { type: Number },
    fare: { type: Number },
    vehicleType: {
      type: String,
      enum: ["BIKE", "CAR", "AUTO"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "ASSIGNED",
        "CONFIRMED",
        "ONGOING",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "PENDING",
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "ONLINE"],
      default: "CASH",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ride", rideSchema);
