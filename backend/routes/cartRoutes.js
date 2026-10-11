const express = require("express");
const router = express.Router();
const { protectCustomer } = require("../middleware/customerAuth");
const { getCart, addToCart, updateCartItem, removeCartItem, clearCart } = require("../controllers/cartController");

router.use(protectCustomer);
router.get("/", getCart);
router.post("/", addToCart);
router.put("/:productId", updateCartItem);
router.delete("/:productId", removeCartItem);
router.delete("/", clearCart);

module.exports = router;
