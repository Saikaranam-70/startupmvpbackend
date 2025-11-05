const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      match: /^[0-9]{10,15}$/, // basic validation for WhatsApp numbers
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// ⚡ Index for fast phone lookups (important for chatbots)
userSchema.index({ phone: 1 });

module.exports = mongoose.model("User", userSchema);
