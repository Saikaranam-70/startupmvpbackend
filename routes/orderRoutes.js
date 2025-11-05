const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// Create new order (customer)
router.post("/create", orderController.createOrder);

// Merchant fetches all their orders
router.get("/merchant/:merchantId", orderController.getOrdersByMerchant);

module.exports = router;
