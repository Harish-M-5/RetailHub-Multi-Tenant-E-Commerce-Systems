const asyncHandler = require("express-async-handler");
const Customer = require("../models/Customer");
const Order = require("../models/Order");

const getCustomers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const query = { business: req.businessId };
  if (search) {
    query.$or = [
      { name: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
      { phone: new RegExp(search, "i") },
    ];
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [customers, total] = await Promise.all([
    Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Customer.countDocuments(query),
  ]);
  res.json({ success: true, customers, total, page: Number(page), pages: Math.ceil(total / limit) });
});

const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, business: req.businessId });
  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }
  const orders = await Order.find({ customer: customer._id, business: req.businessId }).sort({
    createdAt: -1,
  });
  res.json({ success: true, customer, orders });
});

const createCustomer = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  const normalizedEmail = (email || "").trim().toLowerCase();
  const customer = await Customer.create({
    business: req.businessId,
    name,
    email: normalizedEmail,
    phone,
    password: password || Math.random().toString(36).slice(2, 10),
  });
  res.status(201).json({ success: true, customer });
});

const updateCustomer = asyncHandler(async (req, res) => {
  const { name, phone, notes, isActive } = req.body;
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, business: req.businessId },
    { name, phone, notes, isActive },
    { new: true }
  );
  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }
  res.json({ success: true, customer });
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndDelete({ _id: req.params.id, business: req.businessId });
  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }
  res.json({ success: true, message: "Customer deleted" });
});

module.exports = { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer };
