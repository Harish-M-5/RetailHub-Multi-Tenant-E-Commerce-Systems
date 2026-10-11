const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/auth");
const { getInventory, updateStock, getLowStock } = require("../controllers/inventoryController");

router.use(protect);
// Delivery-role accounts don't get inventory access - only products/
// categories (read-only) plus their own deliveries/returns.
router.use(requireRole("owner", "manager", "staff"));
router.get("/", getInventory);
router.get("/low-stock", getLowStock);
router.put("/:id/stock", updateStock);

module.exports = router;
