const express = require("express");
const router = express.Router();
const merchantController = require("../controllers/merchantController");

router.post("/register", merchantController.registerMerchent);
router.post("/login", merchantController.loginMerchant);
// router.put("/:id", merchantController.updateMerchant);
router.get("/", merchantController.getAllMerchants);
router.get("/:id", merchantController.getMerchantById);

module.exports = router;
