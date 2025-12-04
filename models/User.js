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
      unique: true,
    },

    address: { type: String },

    location: {
      lat: Number,
      lng: Number,
    },

    chatState: { type: String, default: null },

    /**
     * ------------------ FOOD ORDER TEMP DATA ------------------
     */
    tempType: {
      type: String,
      enum: ["VEG", "NON-VEG", null],
      default: null,
    },

    tempCategory: { type: String, default: null },

    tempBudget: {
      min: Number,
      max: Number,
    },

    tempSearch: {
      item: String,
      budget: Number,
    },

    tempOrder: {
      restId: String,
      itemName: String,
      price: Number,
      total: Number,
    },

    /**
     * ------------------ GROCERY TEMP DATA ------------------
     */
    tempGroceryStore: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroceryStore",
      default: null,
    },

    tempGroceryItem: {
      itemId: String,
      name: String,
      price: Number,
      unit: String,
      qty: Number,
    },

    cart: [
      {
        itemId: String,
        name: String,
        price: Number,
        unit: String,
        qty: Number,
      },
    ],

    /**
     * ------------------ MEDICINE TEMP DATA ------------------
     */
    tempPrescription: {
      type: String, // Cloudinary URL
      default: null,
    },

    tempMedicinesText: {
      type: String, // typed medicine list
      default: "",
    },

    tempMedicineOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicineOrder",
      default: null,
    },

    tempPaymentMethod: {
      type: String,
      enum: ["COD", "UPI", null],
      default: null,
    },
  },
  { timestamps: true }
);

// Index for speed
userSchema.index({ phone: 1 });

module.exports = mongoose.model("User", userSchema);
