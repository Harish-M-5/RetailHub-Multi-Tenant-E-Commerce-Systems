const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/auth");
const {
  getCategoryPerformance,
  getCustomerGrowth,
  getPaymentBreakdown,
  getDeliveryBreakdown,
  getRepeatCustomerRate,
} = require("../controllers/analyticsController");

// Analytics/reporting is owner+manager only - staff don't get business
// performance figures.
router.use(protect, requireRole("owner", "manager"));
router.get("/category-performance", getCategoryPerformance);
router.get("/customer-growth", getCustomerGrowth);
router.get("/payment-breakdown", getPaymentBreakdown);
router.get("/delivery-breakdown", getDeliveryBreakdown);
router.get("/repeat-customer-rate", getRepeatCustomerRate);

module.exports = router;
