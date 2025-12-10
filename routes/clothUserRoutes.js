const express = require("express");
const router = express.Router();
const auth = require("../middlewear/auth");
const user = require("../controllers/clothUserController");

router.post("/register", user.register);
router.post("/login", user.login);

router.put("/location", auth, user.updateLocation);

router.post("/cart/add", auth, user.addToCart);
router.get("/cart", auth, user.getCart);
router.put("/cart/update", auth, user.updateCart);
router.post("/cart/remove", auth, user.removeFromCart);

module.exports = router;
