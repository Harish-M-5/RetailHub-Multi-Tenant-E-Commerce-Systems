const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/auth");
const { getSalesReport } = require("../controllers/reportController");

router.use(protect, requireRole("owner", "manager"));
router.get("/sales", getSalesReport);

module.exports = router;
