const express = require("express");
const router = express.Router();
const { protectCustomer } = require("../middleware/customerAuth");
const { getWishlist, addToWishlist, removeFromWishlist } = require("../controllers/wishlistController");

router.use(protectCustomer);
router.get("/", getWishlist);
router.post("/", addToWishlist);
router.delete("/:productId", removeFromWishlist);

module.exports = router;
