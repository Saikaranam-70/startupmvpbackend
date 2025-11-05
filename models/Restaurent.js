
const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant", required: true },
  cuisines: [String],
  menuItems: [
    {
      name: String,
      price: Number,
      category: String,
      isAvailable: { type: Boolean, default: true },
    },
  ],
  deliveryTime: Number, // in minutes
  minOrderValue: Number,
});

module.exports = mongoose.model("Restaurant", restaurantSchema);
