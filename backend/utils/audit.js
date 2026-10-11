const AuditLog = require("../models/AuditLog");

const logAction = async ({ business, performedBy, performedByName, action, details }) => {
  try {
    await AuditLog.create({ business, performedBy, performedByName, action, details });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err.message);
  }
};

module.exports = { logAction };
