const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      validate: {
        validator: function (v) {
          return /^\+?[1-9]\d{9,14}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
      required: true,
      unique: true
    },

    address: { type: String },

    location: {
      lat: Number,
      lng: Number,
    },

    chatState: { type: String, default: null },

    // ⭐ Store temporarily selected VEG / NON-VEG
    tempType: {
      type: String,
      enum: ["VEG", "NON-VEG", null],
      default: null,
    },

    // ⭐ Store temporarily selected category
    tempCategory: {
      type: String,
      default: null,
    },

    // ⭐ Store budget range (min, max)
    tempBudget: {
      min: Number,
      max: Number,
    },

    // ⭐ Store item + budget search text
    tempSearch: {
      item: String,
      budget: Number,
    },

    // ⭐ Store selected item for final order
    tempOrder: {
      restId: String,
      itemName: String,
      price: Number,
      total: Number,
    }
  },
  { timestamps: true }
);

userSchema.index({ phone: 1 });

module.exports = mongoose.model("User", userSchema);
