const asyncHandler = require("express-async-handler");
const AuditLog = require("../models/AuditLog");

const getAuditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find({ business: req.businessId })
    .populate("performedBy", "ownerName email")
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ success: true, logs });
});

module.exports = { getAuditLogs };
