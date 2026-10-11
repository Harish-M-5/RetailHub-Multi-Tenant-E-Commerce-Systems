const asyncHandler = require("express-async-handler");
const User = require("../models/User");

const getStaff = asyncHandler(async (req, res) => {
  const staff = await User.find({ business: req.businessId, role: { $ne: "owner" } });
  res.json({ success: true, staff });
});

const ASSIGNABLE_ROLES = ["manager", "staff", "delivery"];

const createStaff = asyncHandler(async (req, res) => {
  const { ownerName, email, phone, password, role } = req.body;
  const staff = await User.create({
    ownerName,
    email: (email || "").trim().toLowerCase(),
    phone,
    password,
    role: ASSIGNABLE_ROLES.includes(role) ? role : "staff",
    business: req.businessId,
  });
  res.status(201).json({ success: true, staff });
});

const updateStaff = asyncHandler(async (req, res) => {
  const { role, isActive } = req.body;
  const update = { isActive };
  if (role !== undefined) {
    update.role = ASSIGNABLE_ROLES.includes(role) ? role : "staff";
  }
  const staff = await User.findOneAndUpdate(
    { _id: req.params.id, business: req.businessId },
    update,
    { new: true }
  );
  if (!staff) {
    res.status(404);
    throw new Error("Staff member not found");
  }
  res.json({ success: true, staff });
});

const deleteStaff = asyncHandler(async (req, res) => {
  const staff = await User.findOneAndDelete({ _id: req.params.id, business: req.businessId, role: { $ne: "owner" } });
  if (!staff) {
    res.status(404);
    throw new Error("Staff member not found");
  }
  res.json({ success: true, message: "Staff member removed" });
});

module.exports = { getStaff, createStaff, updateStaff, deleteStaff };
