
const mongoose = require("mongoose");

const groceryStoreSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant", required: true },
  categories: [String], // e.g., "Fruits", "Snacks", "Dairy"
  items: [
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    unit: { type: String, required: true },
    stock: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
  }
]
,
  deliveryRange: Number, // in km
});

module.exports = mongoose.model("GroceryStore", groceryStoreSchema);
