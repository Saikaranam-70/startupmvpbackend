const express = require("express");
const router = express.Router();
const agentController = require("../controllers/agentController");

router.post("/register", agentController.registerAgent);
router.post("/login", agentController.loginAgent);
router.get("/:agentId", agentController.getAgentById);
router.put("/online-status/:agentId", agentController.updateOnlineStatus);
router.put("/update-location/:agentId", agentController.updateLocation);
router.get("/nearby", agentController.getNearbyAgents);

module.exports = router;
