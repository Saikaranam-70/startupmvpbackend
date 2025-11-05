const GroceryStore = require("../models/GroceryStore");
const redis = require("../config/redis");
const XLSX = require("xlsx");
const fs = require("fs");
const cloudinary = require("../config/cloudinary")


// ✅ Create or Update Grocery Store (only one per merchant)
exports.createOrUpdateGroceryStore = async (req, res) => {
  try {
    const { merchantId, categories, items, deliveryRange } = req.body;

    if (!merchantId)
      return res.status(400).json({ message: "merchantId is required" });

    // 🔎 Check if store already exists for this merchant
    let store = await GroceryStore.findOne({ merchantId });

    if (store) {
      // ✅ Update existing store
      store.categories = categories || store.categories;
      store.items = items?.length ? items : store.items;
      store.deliveryRange = deliveryRange || store.deliveryRange;
      await store.save();

      await redis.del("all_grocery_stores");
      await redis.del(`merchant_grocery_${merchantId}`);

      return res.status(200).json({
        message: "Grocery store updated successfully",
        store,
        action: "updated",
      });
    }

    // ✅ Create new store if not exists
    store = new GroceryStore({ merchantId, categories, items, deliveryRange });
    await store.save();

    await redis.del("all_grocery_stores");
    await redis.del(`merchant_grocery_${merchantId}`);

    res.status(201).json({
      message: "Grocery store created successfully",
      store,
      action: "created",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Get All Grocery Stores (with caching)
exports.getAllGroceryStores = async (req, res) => {
  try {
    const cacheKey = "all_grocery_stores";
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const stores = await GroceryStore.find().populate("merchantId", "storeName phone");
    await redis.set(cacheKey, JSON.stringify(stores), "EX", 120); // 2 min cache
    res.json(stores);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Get Grocery Store by Merchant (only one store)
exports.getGroceryStoreByMerchant = async (req, res) => {
  try {
    const { merchantId } = req.params;
    const cacheKey = `merchant_grocery_${merchantId}`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const store = await GroceryStore.findOne({ merchantId });
    if (!store) return res.status(404).json({ message: "No grocery store found" });

    await redis.set(cacheKey, JSON.stringify(store), "EX", 120);
    res.json(store);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Items by Grocery Store
exports.getItemsByGrocery = async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await GroceryStore.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });

    res.json(store.items);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Add Grocery Item
exports.addGroceryItem = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { name, price, unit, stock } = req.body;

    const store = await GroceryStore.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });

    store.items.push({ name, price, unit, stock });
    await store.save();

    await redis.del("all_grocery_stores");
    await redis.del(`merchant_grocery_${store.merchantId}`);

    res.status(200).json({ message: "Item added successfully", store });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Update Grocery Item
exports.updateGroceryItem = async (req, res) => {
  try {
    const { storeId, itemId } = req.params;
    const { name, price, unit, stock, isAvailable } = req.body;

    const store = await GroceryStore.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });

    const item = store.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (name) item.name = name;
    if (price) item.price = price;
    if (unit) item.unit = unit;
    if (stock) item.stock = stock;
    if (typeof isAvailable === "boolean") item.isAvailable = isAvailable;

    await store.save();

    await redis.del("all_grocery_stores");
    await redis.del(`merchant_grocery_${store.merchantId}`);

    res.status(200).json({ message: "Item updated successfully", store });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Delete Grocery Item
exports.deleteGroceryItem = async (req, res) => {
  try {
    const { storeId, itemId } = req.params;

    const store = await GroceryStore.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });

    store.items = store.items.filter((i) => i._id.toString() !== itemId);
    await store.save();

    await redis.del("all_grocery_stores");
    await redis.del(`merchant_grocery_${store.merchantId}`);

    res.status(200).json({ message: "Item deleted successfully", store });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Delete Grocery Store (per merchant)
exports.deleteGrocery = async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await GroceryStore.findByIdAndDelete(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });

    await redis.del("all_grocery_stores");
    await redis.del(`merchant_grocery_${store.merchantId}`);

    res.status(200).json({ message: "Grocery store deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.uploadMenuItemsExcel = async (req, res) => {
  try {
    const { storeId } = req.params;
    const file = req.files?.file;

    if (!file) return res.status(400).json({ message: "Excel file Required" });
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return res.status(400).json({ message: "Only Excel files are allowed" });
    }

    const store = await GroceryStore.findById(storeId);
    if (!store) return res.status(404).json({ message: "Grocery not found" });

    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      resource_type: "raw",
      folder: "menus",
      public_id: `menu_${storeId}_${Date.now()}`,
    });

    const workbook = XLSX.readFile(file.tempFilePath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!data || data.length === 0)
      return res.status(400).json({ message: "Excel File is Empty" });

    const newItems = data.map((row) => ({
      name: row.name || row.Name,
      price: row.price || row.Price,
      unit: row.unit || row.Unit || "",
      stock: row.stock || row.Stock,
      isAvailable: true,
    }));

    store.items.push(...newItems);
    await store.save();

    await redis.del("all_grocery_stores");
    await redis.del(`merchant_grocery_${store.merchantId}`);

    if (fs.existsSync(file.tempFilePath)) {
  fs.unlinkSync(file.tempFilePath);
}


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
