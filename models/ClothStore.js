const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  // ✅ Merchant Reference
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Merchant",
    required: true,
  },

  // ✅ Basic Product Info
  name: {
    type: String,
    required: true, // "Men Black T-Shirt"
  },
  description: {
    type: String,
  },

  category: {
    type: String, // Shirt, Jeans, Kurti
  },
  subCategory: {
    type: String, // Casual, Party, Formal
  },

  gender: {
    type: String,
    enum: ["MEN", "WOMEN", "KIDS"],
  },

  brand: {
    type: String,
  },

  // ✅ Pricing
  price: {
    type: Number,
    required: true,
  },
  offerPrice: {
    type: Number,
  },

  // ✅ Media
  images: {
    type: [String],
  },

  // ✅ Variants
  sizes: {
    type: [String], // ["S", "M", "L", "XL", "XXL"]
  },
  colors: {
    type: [String], // ["Black", "White", "Red"]
  },

  // ✅ Inventory
  stock: {
    type: Number,
    default: 0,
  },

  // ✅ Additional Details
  fabric: {
    type: String, // Cotton, Denim, Silk
  },
  fitType: {
    type: String, // Slim, Regular, Oversized
  },

  // ✅ Status
  isAvailable: {
    type: Boolean,
    default: true,
  },

  // ✅ Timestamp
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Product", productSchema);
