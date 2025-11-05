const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurentController");

// ✅ Create Restaurant
router.post("/", restaurantController.createRestaurant);

// ✅ Get All Restaurants
router.get("/", restaurantController.getAllRestaurants);

// ✅ Get Restaurant by Merchant ID
router.get("/merchant/:merchantId", restaurantController.getRestaurantByMerchant);

// ✅ Get Menu Items by Restaurant ID
router.get("/:restaurantId/menu", restaurantController.getItemsByRestaurant);

// ✅ Add Menu Item
router.post("/:restaurantId/menu", restaurantController.addMenuItem);

// ✅ Update Menu Item
router.put("/:restaurantId/menu/:itemId", restaurantController.updateMenuItem);

// ✅ Delete Menu Item
router.delete("/:restaurantId/menu/:itemId", restaurantController.deleteMenuItem);

// ✅ Delete Restaurant
router.delete("/:restaurantId", restaurantController.deleteRestaurant);

router.post("/upload_menu_excel/:restaurantId", 
    restaurantController.uploadMenuItemsExcel
)

module.exports = router;
