const asyncHandler = require("express-async-handler");
const Customer = require("../models/Customer");

const getMyProfile = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.customer._id);
  res.json({ success: true, customer });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const customer = await Customer.findById(req.customer._id);
  if (name) customer.name = name;
  if (phone) customer.phone = phone;
  await customer.save();
  res.json({ success: true, customer });
});

const addAddress = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.customer._id);
  customer.addresses.push(req.body);
  await customer.save();
  res.status(201).json({ success: true, addresses: customer.addresses });
});

const deleteAddress = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.customer._id);
  customer.addresses = customer.addresses.filter((a) => a._id.toString() !== req.params.addressId);
  await customer.save();
  res.json({ success: true, addresses: customer.addresses });
});

module.exports = { getMyProfile, updateMyProfile, addAddress, deleteAddress };
