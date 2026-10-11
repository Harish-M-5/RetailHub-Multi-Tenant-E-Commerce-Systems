const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    performedByName: { type: String, default: "" },
    action: { type: String, required: true },
    details: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
