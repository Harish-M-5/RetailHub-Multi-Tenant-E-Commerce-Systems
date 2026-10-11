const express = require("express");
const router = express.Router();
const { protect, requireOwner } = require("../middleware/auth");
const { getAuditLogs } = require("../controllers/auditLogController");

router.use(protect, requireOwner);
router.get("/", getAuditLogs);

module.exports = router;
