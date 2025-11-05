const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/save", userController.createOrUpdateUser);
router.get("/:phone", userController.getUserByPhone);
router.delete("/cache/:phone", userController.clearUserCache);

module.exports = router;
