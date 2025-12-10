const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Merchant",
    required: true,
  },

  name: { type: String, required: true },      // "Men Black T-Shirt"
  description: String,

  category: { type: String },                  // Shirt, Jeans, Kurti
  subCategory: { type: String },               // Casual, Party, Formal
  gender: { type: String, enum: ["MEN", "WOMEN", "KIDS"] },

  brand: String,

  price: { type: Number, required: true },
  offerPrice: Number,

  images: [String],

  sizes: [String],     // ["S","M","L","XL","XXL"]
  colors: [String],    // ["Black","White","Red"]

  stock: { type: Number, default: 0 },

  fabric: String,     // Cotton, Denim, Silk
  fitType: String,    // Slim, Regular, Oversized

  isAvailable: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Product", productSchema);
