const ClothUser = require("../models/ClothUser");
const Product = require("../models/Product");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const redis = require("../config/redis");

/* ✅ TOKEN GENERATOR */
const generateToken = (clothUserId) => {
  return jwt.sign({ id: clothUserId }, process.env.secret_key, {
    expiresIn: "30d",
  });
};

/* =====================================================
   ✅ AUTH CONTROLLERS
===================================================== */

/* ✅ REGISTER */
exports.register = async (req, res) => {
  try {
    const { phone, password, name } = req.body;

    const cacheKey = `clothUser:${phone}`;
    const cachedClothUser = await redis.get(cacheKey);
    if (cachedClothUser)
      return res.status(409).json({ message: "User already exists" });

    let clothUser = await ClothUser.findOne({ phone });
    if (clothUser)
      return res.status(409).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    clothUser = await ClothUser.create({
      phone,
      password: hashed,
      name,
    });

    await redis.set(cacheKey, JSON.stringify(clothUser), "EX", 600);

    res.status(201).json({
      success: true,
      token: generateToken(clothUser._id),
      clothUser,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ✅ LOGIN */
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const cacheKey = `clothUser:${phone}`;

    let clothUser;

    const cached = await redis.get(cacheKey);
    if (cached) {
      clothUser = JSON.parse(cached);
    } else {
      clothUser = await ClothUser.findOne({ phone });
      if (!clothUser)
        return res.status(404).json({ message: "User not found" });
      await redis.set(cacheKey, JSON.stringify(clothUser), "EX", 600);
    }

    const match = await bcrypt.compare(password, clothUser.password);
    if (!match)
      return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      success: true,
      token: generateToken(clothUser._id),
      clothUser,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================================
   ✅ LOCATION
===================================================== */

exports.updateLocation = async (req, res) => {
  try {
    const clothUser = await ClothUser.findByIdAndUpdate(
      req.user.id,
      { location: req.body },
      { new: true }
    );

    await redis.del(`clothUser:${clothUser.phone}`);

    res.json({ success: true, clothUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================================
   ✅ CART CONTROLLERS
===================================================== */

/* ✅ ADD TO CART */
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity, size, color } = req.body;

    const productCache = `product:${productId}`;
    let product = await redis.get(productCache);

    if (!product) {
      product = await Product.findById(productId);
      if (!product)
        return res.status(404).json({ message: "Product not found" });

      await redis.set(productCache, JSON.stringify(product), "EX", 300);
    } else {
      product = JSON.parse(product);
    }

    let clothUser = await ClothUser.findById(req.user.id);

    const index = clothUser.cart.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (index !== -1) {
      clothUser.cart[index].quantity += quantity;
    } else {
      clothUser.cart.push({ product: productId, quantity, size, color });
    }

    await clothUser.save();
    await redis.del(`clothUser:${clothUser.phone}`);

    res.json({ success: true, cart: clothUser.cart });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ✅ GET CART */
exports.getCart = async (req, res) => {
  try {
    const clothUser = await ClothUser.findById(req.user.id).populate("cart.product");

    res.json({ success: true, cart: clothUser.cart });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ✅ UPDATE CART */
exports.updateCart = async (req, res) => {
  try {
    const { cart } = req.body;

    const clothUser = await ClothUser.findByIdAndUpdate(
      req.user.id,
      { cart },
      { new: true }
    );

    await redis.del(`clothUser:${clothUser.phone}`);

    res.json({ success: true, cart: clothUser.cart });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ✅ REMOVE FROM CART */
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;

    const clothUser = await ClothUser.findById(req.user.id);

    clothUser.cart = clothUser.cart.filter(
      (item) => item.product.toString() !== productId
    );

    await clothUser.save();
    await redis.del(`clothUser:${clothUser.phone}`);

    res.json({ success: true, cart: clothUser.cart });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
