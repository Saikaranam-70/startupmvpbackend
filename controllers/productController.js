const Product = require("../models/Product");
const Merchant = require("../models/Merchent");
const cloudinary = require("../config/cloudinary");
const redis = require("../config/redis");

/* ✅ CREATE PRODUCT */
exports.createProduct = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.body.merchantId);

    if (!merchant)
      return res.status(404).json({ message: "Merchant not found" });

    if (merchant.businessType !== "CLOTHING")
      return res.status(403).json({ message: "Only clothing merchants allowed" });

    if (!merchant.isVerified)
      return res.status(403).json({ message: "Merchant not verified" });

    const images = req.files?.map(file => file.path) || [];

    if (!images.length)
      return res.status(400).json({ message: "At least 1 image is required" });

    const product = await Product.create({
      merchant: merchant._id,
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      subCategory: req.body.subCategory,
      gender: req.body.gender,
      brand: req.body.brand,
      price: req.body.price,
      offerPrice: req.body.offerPrice,
      images,
      sizes: req.body.sizes ? JSON.parse(req.body.sizes) : [],
      colors: req.body.colors ? JSON.parse(req.body.colors) : [],
      stock: req.body.stock,
      fabric: req.body.fabric,
      fitType: req.body.fitType,
      isAvailable: req.body.isAvailable ?? true,
    });

    // ✅ CLEAR REDIS CACHE
    await redis.del("all_products");
    await redis.del(`merchant_products:${merchant._id}`);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};




/* ✅ GET ALL PRODUCTS (PUBLIC) */
exports.getAllProducts = async (req, res) => {
  try {
    const cachedProducts = await redis.get("all_products");

    if (cachedProducts) {
      return res.json(JSON.parse(cachedProducts)); // ⚡ Fast Redis Response
    }

    const products = await Product.find({ isAvailable: true })
      .populate("merchant", "storeName rating");

    // ✅ Save to Redis (TTL 5 minutes)
    await redis.set("all_products", JSON.stringify(products), "EX", 300);

    res.json(products);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* ✅ GET SINGLE PRODUCT */
exports.getSingleProduct = async (req, res) => {
  try {
    const cacheKey = `product:${req.params.id}`;

    const cachedProduct = await redis.get(cacheKey);
    if (cachedProduct) {
      return res.json(JSON.parse(cachedProduct));
    }

    const product = await Product.findById(req.params.id)
      .populate("merchant", "storeName phone");

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    // ✅ Save to Redis
    await redis.set(cacheKey, JSON.stringify(product), "EX", 300);

    res.json(product);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* ✅ UPDATE PRODUCT */
exports.updateProduct = async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedProduct)
      return res.status(404).json({ message: "Product not found" });

    // ✅ CLEAR REDIS CACHE
    await redis.del("all_products");
    await redis.del(`product:${req.params.id}`);
    await redis.del(`merchant_products:${updatedProduct.merchant}`);

    res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* ✅ DELETE PRODUCT WITH CLOUDINARY CLEANUP */
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    for (let img of product.images) {
      const id = img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`clothing-products/${id}`);
    }

    await product.deleteOne();

    // ✅ CLEAR REDIS CACHE
    await redis.del("all_products");
    await redis.del(`product:${req.params.id}`);
    await redis.del(`merchant_products:${product.merchant}`);

    res.json({
      success: true,
      message: "Deleted successfully",
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* ✅ GET PRODUCTS BY MERCHANT ID */
exports.getProductsByMerchant = async (req, res) => {
  try {
    const { merchantId } = req.params;
    const cacheKey = `merchant_products:${merchantId}`;

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const merchant = await Merchant.findById(merchantId);

    if (!merchant)
      return res.status(404).json({ message: "Merchant not found" });

    if (merchant.businessType !== "CLOTHING")
      return res.status(403).json({ message: "Only clothing merchants allowed" });

    const products = await Product.find({ merchant: merchantId })
      .populate("merchant", "storeName phone rating");

    const responseData = {
      success: true,
      total: products.length,
      products,
    };

    // ✅ Save to Redis
    await redis.set(cacheKey, JSON.stringify(responseData), "EX", 300);

    res.json(responseData);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
