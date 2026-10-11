const asyncHandler = require("express-async-handler");
const Business = require("../models/Business");
const User = require("../models/User");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const { logAction } = require("../utils/audit");

const getMyBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.businessId);
  if (!business) {
    res.status(404);
    throw new Error("Business not found");
  }
  res.json({ success: true, business });
});

const updateMyBusiness = asyncHandler(async (req, res) => {
  const allowed = [
    "businessName",
    "businessType",
    "address",
    "city",
    "state",
    "pincode",
    "gstNumber",
    "description",
    "logo",
    "banner",
  ];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  const business = await Business.findByIdAndUpdate(req.businessId, updates, { new: true });
  res.json({ success: true, business });
});

const updatePaymentSettings = asyncHandler(async (req, res) => {
  const { googlePayQr, phonePeQr, paytmQr, genericUpiQr, upiId } = req.body;

  const business = await Business.findById(req.businessId);
  if (!business) {
    res.status(404);
    throw new Error("Business not found");
  }

  business.paymentSettings = {
    googlePayQr: googlePayQr ?? business.paymentSettings.googlePayQr,
    phonePeQr: phonePeQr ?? business.paymentSettings.phonePeQr,
    paytmQr: paytmQr ?? business.paymentSettings.paytmQr,
    genericUpiQr: genericUpiQr ?? business.paymentSettings.genericUpiQr,
    upiId: upiId ?? business.paymentSettings.upiId,
  };
  await business.save();

  res.json({ success: true, business });
});

const updateDeliverySettings = asyncHandler(async (req, res) => {
  const { codCharge } = req.body;
  const business = await Business.findById(req.businessId);
  if (!business) {
    res.status(404);
    throw new Error("Business not found");
  }

  const parsed = Number(codCharge);
  if (Number.isNaN(parsed) || parsed < 0) {
    res.status(400);
    throw new Error("Delivery charge must be a non-negative number");
  }

  business.deliverySettings = { codCharge: parsed };
  await business.save();

  res.json({ success: true, business });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.matchPassword(currentPassword))) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: "Password updated successfully" });
});

const deleteMyBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.businessId);
  if (!business) {
    res.status(404);
    throw new Error("Business not found");
  }

  await Promise.all([
    Product.deleteMany({ business: business._id }),
    Category.deleteMany({ business: business._id }),
    Order.deleteMany({ business: business._id }),
    Customer.deleteMany({ business: business._id }),
    User.deleteMany({ business: business._id }),
  ]);
  await Business.findByIdAndDelete(business._id);

  await logAction({
    business: business._id,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "business_deleted",
    details: `Business ${business.businessName} permanently deleted along with all data`,
  });

  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.json({ success: true, message: "Business account permanently deleted" });
});

module.exports = {
  getMyBusiness,
  updateMyBusiness,
  updatePaymentSettings,
  updateDeliverySettings,
  changePassword,
  deleteMyBusiness,
};
