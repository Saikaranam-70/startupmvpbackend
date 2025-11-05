const Restaurant = require("../models/Restaurent");
const redis = require("../config/redis");
const XLSX = require("xlsx")
const fs = require("fs")
const cloudinary = require("../config/cloudinary")

// Create Restaurant
// ✅ Create Restaurant — Only One Restaurant per Merchant
exports.createRestaurant = async (req, res) => {
  try {
    const { merchantId, cuisines, menuItems, deliveryTime, minOrderValue } = req.body;

    if (!merchantId)
      return res.status(400).json({ message: "merchantId is required" });

    // ⚡ Check if merchant already owns a restaurant
    const existingRestaurant = await Restaurant.findOne({ merchantId });
    if (existingRestaurant)
      return res.status(400).json({
        message: "This merchant already has a restaurant",
        restaurant: existingRestaurant,
      });

    // ✅ Create new restaurant
    const restaurant = new Restaurant({
      merchantId,
      cuisines,
      menuItems,
      deliveryTime,
      minOrderValue,
    });
    await restaurant.save();

    // ⚡ Invalidate cache after new creation
    await redis.del("all_restaurants");
    await redis.del(`restaurant_merchant_${merchantId}`);

    res.status(201).json({
      message: "Restaurant created successfully",
      restaurant,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// Get All Restaurants (cached)
exports.getAllRestaurants = async (req, res) => {
  try {
    const cacheKey = "all_restaurants";
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const restaurants = await Restaurant.find().populate("merchantId", "storeName phone");
    await redis.set(cacheKey, JSON.stringify(restaurants), "EX", 120);
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Get Restaurant by Merchant ID
exports.getRestaurantByMerchant = async (req, res) => {
  try {
    const { merchantId } = req.params;
    const cacheKey = `restaurant_merchant_${merchantId}`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const restaurant = await Restaurant.findOne({ merchantId }).populate("merchantId", "storeName phone email");
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found for this merchant" });

    await redis.set(cacheKey, JSON.stringify(restaurant), "EX", 120);
    res.status(200).json(restaurant);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Get All Menu Items by Restaurant
exports.getItemsByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const cacheKey = `menu_items_${restaurantId}`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    await redis.set(cacheKey, JSON.stringify(restaurant.menuItems), "EX", 120);
    res.status(200).json(restaurant.menuItems);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Add Menu Item
exports.addMenuItem = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { name, price, category } = req.body;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    restaurant.menuItems.push({ name, price, category });
    await restaurant.save();

    await redis.del("all_restaurants");
    await redis.del(`menu_items_${restaurantId}`);

    res.status(200).json({ message: "Menu item added", restaurant });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Update Menu Item
exports.updateMenuItem = async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;
    const { name, price, category, isAvailable } = req.body;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const item = restaurant.menuItems.id(itemId);
    if (!item) return res.status(404).json({ message: "Menu item not found" });

    if (name) item.name = name;
    if (price) item.price = price;
    if (category) item.category = category;
    if (typeof isAvailable === "boolean") item.isAvailable = isAvailable;

    await restaurant.save();

    await redis.del("all_restaurants");
    await redis.del(`menu_items_${restaurantId}`);

    res.status(200).json({ message: "Menu item updated", restaurant });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Delete Menu Item
exports.deleteMenuItem = async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    restaurant.menuItems = restaurant.menuItems.filter(item => item._id.toString() !== itemId);
    await restaurant.save();

    await redis.del("all_restaurants");
    await redis.del(`menu_items_${restaurantId}`);

    res.status(200).json({ message: "Menu item deleted", restaurant });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Delete Restaurant
exports.deleteRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findByIdAndDelete(restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    await redis.del("all_restaurants");
    await redis.del(`restaurant_merchant_${restaurant.merchantId}`);
    await redis.del(`menu_items_${restaurantId}`);

    res.status(200).json({ message: "Restaurant deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
exports.uploadMenuItemsExcel = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const file = req.files?.file;

    console.log("Upload called for restaurant:", restaurantId);

    if (!file)
      return res.status(400).json({ message: "Excel file Required" });

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant)
      return res.status(404).json({ message: "Restaurant not found" });

    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      resource_type: "raw",
      folder: "menus",
      public_id: `menu_${restaurantId}_${Date.now()}`,
    });

    const workbook = XLSX.readFile(file.tempFilePath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!data || data.length === 0)
      return res.status(400).json({ message: "Excel File is Empty" });

    const newItems = data.map((row) => ({
      name: row.name || row.Name,
      price: row.price || row.Price,
      category: row.category || row.Category || "General",
      isAvailable: true,
    }));

    restaurant.menuItems.push(...newItems);
    await restaurant.save();

    await redis.del("all_restaurants");
    await redis.del(`menu_items_${restaurantId}`);

    fs.unlinkSync(file.tempFilePath);

    res.status(200).json({
      message: "Menu Items Uploaded Successfully",
      cloudinaryUrl: result.secure_url,
      addedItems: newItems.length,
    });
  } catch (error) {
    console.error("Upload menu Excel error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
