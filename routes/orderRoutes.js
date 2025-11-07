const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// Create new order (customer)
router.post("/create", orderController.createOrder);

router.post("/:orderId/accept", orderController.acceptOrder);
router.post("/:orderId/reject", orderController.rejectOrder);

router.patch("/:orderId/status", orderController.updateOrderStatus);
router.patch("/:orderId/payment", orderController.updatePaymentStatus);

router.patch("/agents/:agentId/location", orderController.updateAgentLocation);


// Merchant fetches all their orders
router.get("/merchant/:merchantId", orderController.getOrdersByMerchant);

module.exports = router;
