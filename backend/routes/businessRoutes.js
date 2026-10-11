const express = require("express");
const router = express.Router();
const { protect, requireOwner, requireRole } = require("../middleware/auth");
const {
  getMyBusiness,
  updateMyBusiness,
  updatePaymentSettings,
  updateDeliverySettings,
  changePassword,
  deleteMyBusiness,
} = require("../controllers/businessController");

router.use(protect);
// Everyone logged in to this business can read its basic info (name shown
// in the navbar etc.), but editing the profile, payment/UPI/delivery
// settings or deleting the business is owner/manager (deletion owner-only).
router.get("/me", getMyBusiness);
router.put("/me", requireRole("owner", "manager"), updateMyBusiness);
router.put("/payment-settings", requireRole("owner", "manager"), updatePaymentSettings);
router.put("/delivery-settings", requireRole("owner", "manager"), updateDeliverySettings);
router.put("/change-password", changePassword);
router.delete("/me", requireOwner, deleteMyBusiness);

module.exports = router;
