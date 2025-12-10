const mongoose = require("mongoose");

const clothUser = new mongoose.Schema(
  {
    // ✅ Basic Auth
    phone: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    // ✅ Optional Profile (for future)
    name: {
      type: String,
      default: "",
    },

    // ✅ Location (for delivery)
    location: {
      address: { type: String, default: "" },
      city: { type: String, default: "" },
      pincode: { type: String, default: "" },
      latitude: Number,
      longitude: Number,
    },

    // ✅ Shopping Cart (IMPORTANT)
    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: {
          type: Number,
          default: 1,
        },
        size: String,
        color: String,
      },
    ],

    // ✅ Simple user status
    isActive: {
      type: Boolean,
      default: true,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClothUser", clothUser);
