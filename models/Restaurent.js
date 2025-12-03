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

      // ⭐ Veg / Non-Veg Classification
      type: {
        type: String,
        enum: ["VEG", "NON-VEG"],
        required: true
      }
    }
  ],

  deliveryTime: Number,
  minOrderValue: Number,

  ratingSum: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
});

restaurantSchema.virtual("rating").get(function () {
  if (this.ratingCount === 0) return 0;
  return (this.ratingSum / this.ratingCount).toFixed(1);
});

restaurantSchema.set("toJSON", { virtuals: true });
restaurantSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Restaurant", restaurantSchema);
