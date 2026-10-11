const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");

const getSalesReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const query = { business: req.businessId, status: { $ne: "cancelled" } };
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }
  const orders = await Order.find(query).populate("customer", "name email");
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  res.json({ success: true, orders, totalRevenue, totalOrders: orders.length });
});

module.exports = { getSalesReport };
