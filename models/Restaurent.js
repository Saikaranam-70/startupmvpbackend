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

  // ⭐ Rating Fields
  ratingSum: { type: Number, default: 0 },       // total sum of all ratings
  ratingCount: { type: Number, default: 0 },     // number of ratings
});

// Virtual auto calculation (NOT stored in DB)
restaurantSchema.virtual("rating").get(function () {
  if (this.ratingCount === 0) return 0;
  return (this.ratingSum / this.ratingCount).toFixed(1); // returns 1 decimal rating
});

// Enable virtuals in JSON output
restaurantSchema.set("toJSON", { virtuals: true });
restaurantSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Restaurant", restaurantSchema);
