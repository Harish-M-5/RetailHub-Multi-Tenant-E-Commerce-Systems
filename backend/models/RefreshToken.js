const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    userType: { type: String, enum: ["owner", "customer"], default: "owner" },
    user: { type: mongoose.Schema.Types.ObjectId, refPath: "userType", required: false },
    ownerUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customerUser: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    business: { type: mongoose.Schema.Types.ObjectId, ref: "Business" },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
