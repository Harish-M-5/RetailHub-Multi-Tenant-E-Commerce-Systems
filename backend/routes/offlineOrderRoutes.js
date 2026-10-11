const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/auth");
const {
  createOfflineOrder,
  getOfflineOrders,
  updateOfflineOrder,
  deleteOfflineOrder,
} = require("../controllers/offlineOrderController");

router.use(protect, requireRole("owner", "manager", "staff"));
router.get("/", getOfflineOrders);
router.post("/", createOfflineOrder);
// Editing/deleting a recorded sale (money + stock correction) stays with
// owner/manager, same as other destructive/financial actions elsewhere.
router.put("/:id", requireRole("owner", "manager"), updateOfflineOrder);
router.delete("/:id", requireRole("owner", "manager"), deleteOfflineOrder);

module.exports = router;
