const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/auth");
const { getDashboardStats, getSalesChart } = require("../controllers/dashboardController");

// Revenue figures are owner/manager level visibility - staff don't see them.
router.use(protect, requireRole("owner", "manager"));
router.get("/stats", getDashboardStats);
router.get("/sales-chart", getSalesChart);

module.exports = router;
