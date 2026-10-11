const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    ownerName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: function () { return !this.googleId; }, select: false },
    // "delivery" is the delivery-boy role (V7): can only move a home-delivery
    // order through packed -> out_for_delivery -> delivered/cancelled and
    // mark an approved return as collected - see ownerOrderController.
    role: { type: String, enum: ["owner", "manager", "staff", "delivery"], default: "owner" },
    business: { type: mongoose.Schema.Types.ObjectId, ref: "Business" },
    googleId: { type: String, default: null },
    avatar: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  if (!this.password) return false;
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("User", userSchema);
