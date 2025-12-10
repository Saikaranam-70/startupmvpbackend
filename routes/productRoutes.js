const express = require("express");
const router = express.Router();
const upload = require("../middlewear/upload");
const controller = require("../controllers/productController");

router.post("/product/add", upload.array("images", 5), controller.createProduct);
router.get("/product/", controller.getAllProducts);
router.get("/product/:id", controller.getSingleProduct);
router.put("/product/:id", controller.updateProduct);
router.delete("/product/:id", controller.deleteProduct);

router.get("/merchant/:merchantId", controller.getProductsByMerchant);

module.exports = router;
