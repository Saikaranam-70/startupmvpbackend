const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phone: {
  type: String,
  validate: {
    validator: function (v) {
      return /^\+?[1-9]\d{9,14}$/.test(v); // supports +91...
    },
    message: props => `${props.value} is not a valid phone number!`
  },
  required: true
}
,
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
