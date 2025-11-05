
const mongoose = require("mongoose");

const groceryStoreSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant", required: true },
  categories: [String], // e.g., "Fruits", "Snacks", "Dairy"
  items: [
    {
      name: String,
      price: Number,
      unit: String, // e.g., "1kg", "500ml"
      stock: Number,
      isAvailable: { type: Boolean, default: true },
    },
  ],
  deliveryRange: Number, // in km
});

module.exports = mongoose.model("GroceryStore", groceryStoreSchema);
