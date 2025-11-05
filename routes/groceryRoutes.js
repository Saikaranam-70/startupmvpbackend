const express = require("express");
const router = express.Router();
const groceryController = require("../controllers/groceryController");

router.post("/", groceryController.createOrUpdateGroceryStore);
router.get("/", groceryController.getAllGroceryStores);
router.get("/merchant/:merchantId", groceryController.getGroceryStoreByMerchant);
router.get("/:storeId/items", groceryController.getItemsByGrocery);
router.post("/:storeId/items", groceryController.addGroceryItem);
router.put("/:storeId/items/:itemId", groceryController.updateGroceryItem);
router.delete("/:storeId/items/:itemId", groceryController.deleteGroceryItem);
router.delete("/:storeId", groceryController.deleteGrocery);
router.post("/upload_excel/:storeId", groceryController.uploadMenuItemsExcel);

module.exports = router;
