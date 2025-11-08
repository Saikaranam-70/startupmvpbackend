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

    // ✅ Store when user searches "biryani under 150"
    tempSearch: {
      item: String,
      budget: Number,
    },

    // ✅ Store selected item until payment is chosen
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
