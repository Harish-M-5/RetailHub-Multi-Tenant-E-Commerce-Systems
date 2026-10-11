const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/auth");
const { getCategories, createCategory, updateCategory, deleteCategory } = require("../controllers/categoryController");

router.use(protect);
// Staff can view categories (needed to browse/assign products) but only
// owner/manager can create, edit or delete them.
router.get("/", getCategories);
router.post("/", requireRole("owner", "manager"), createCategory);
router.put("/:id", requireRole("owner", "manager"), updateCategory);
router.delete("/:id", requireRole("owner", "manager"), deleteCategory);

module.exports = router;
