const mongoose = require("mongoose");

const pharmacyOfferSchema = new mongoose.Schema({
  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Merchant",
  },
  pharmacyName: String,
  price: Number,
  message: String, // optional notes from pharmacy
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const medicineOrderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // No pharmacy assigned initially
    selectedPharmacyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      default: null,
    },

    // Optional agent after confirmation
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      default: null,
    },

    // If user typed medicines manually
    medicinesText: {
      type: String,
      default: "",
    },

    // If user uploaded prescription
    prescriptionImageUrl: {
      type: String,
      default: null,
    },

    // Pharmacies notified
    notifiedPharmacies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Merchant",
      }
    ],

    // Offers from pharmacies
    offers: [pharmacyOfferSchema],

    // Selected final price
    finalPrice: {
      type: Number,
      default: 0,
    },

    deliveryAddress: {
      type: Object, // { lat, lng, text }
      required: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",          // user requested, waiting for offers
        "WAITING_OFFERS",   // pharmacies responding
        "OFFER_RECEIVED",   // at least one pharmacy responded
        "AWAITING_USER_CONFIRMATION", 
        "CONFIRMED", 
        "ASSIGNED",         // agent assigned
        "DISPATCHED", 
        "DELIVERED", 
        "CANCELLED"
      ],
      default: "PENDING",
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "UPI", null],
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MedicineOrder", medicineOrderSchema);
