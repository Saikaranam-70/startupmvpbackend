const mongoose = require("mongoose")

const merchentSchema = new mongoose.Schema({
  ownerName: { type: String, required: true },
  businessType: { type: String, enum: ["RESTAURANT", "GROCERY", "PHARMACY", "CLOTHING"], required: true },
  storeName: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String }, 
  address: {
    line1: String,
    city: String,
    state: String,
    pincode: String,
    location: {
      lat: Number,
      lng: Number,
    },
  },

  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },

  walletBalance: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model("Merchant", merchentSchema);