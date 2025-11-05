const express = require("express");
const router = express.Router();
const rideController = require("../controllers/rideController");

// Create (Book) Ride
router.post("/book", rideController.bookRide);

// Fetch user ride history
router.get("/user/:userId", rideController.getRidesByUser);

module.exports = router;
