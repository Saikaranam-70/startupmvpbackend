const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// Create new order (customer)
router.post("/create", orderController.createOrder);

// router.post("/:orderId/accept", orderController.acceptOrder);
// router.post("/:orderId/reject", orderController.rejectOrder);

router.patch("/:orderId/status", orderController.updateOrderStatus);
router.patch("/:orderId/payment", orderController.updatePaymentStatus);

router.patch("/agents/:agentId/location", orderController.updateAgentLocation);


// Merchant fetches all their orders
router.get("/merchant/:merchantId", orderController.getOrdersByMerchant);

router.post("/accept/:orderId", async (req, res) => {
  const agentId = req.user.id;
  const order = await Order.findById(req.params.orderId);

  if (!order || order.status !== "SEARCHING_AGENT") {
    return res.status(400).json({ message: "Order not available" });
  }

  order.agentId = agentId;
  order.status = "ASSIGNED";
  await order.save();

  await Agent.findByIdAndUpdate(agentId, {
    isBusy: true,
    currentOrderId: order._id
  });

  res.json({ success: true, message: "Order accepted" });
});

router.post("/reject/:orderId", async (req, res) => {
  res.json({ success: true, message: "Order rejected" });
});




module.exports = router;
