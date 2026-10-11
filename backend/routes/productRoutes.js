const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/auth");
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} = require("../controllers/productController");

router.use(protect);
// Staff can browse the catalog but not create/edit/delete/publish products.
router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", requireRole("owner", "manager"), createProduct);
router.put("/:id", requireRole("owner", "manager"), updateProduct);
router.delete("/:id", requireRole("owner", "manager"), deleteProduct);
router.patch("/:id/toggle-status", requireRole("owner", "manager"), toggleProductStatus);

module.exports = router;
