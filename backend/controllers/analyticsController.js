const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Customer = require("../models/Customer");

const getCategoryPerformance = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const data = await Order.aggregate([
    { $match: { business: businessId, status: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
    { $lookup: { from: "categories", localField: "product.category", foreignField: "_id", as: "category" } },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$category.name",
        totalRevenue: { $sum: "$items.subtotal" },
        totalSold: { $sum: "$items.quantity" },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);
  res.json({ success: true, categoryPerformance: data });
});

const getCustomerGrowth = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const data = await Customer.aggregate([
    { $match: { business: businessId } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);
  res.json({ success: true, customerGrowth: data });
});

const getPaymentBreakdown = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const data = await Order.aggregate([
    { $match: { business: businessId, status: { $ne: "cancelled" } } },
    { $group: { _id: "$paymentMethod", count: { $sum: 1 }, total: { $sum: "$total" } } },
  ]);
  res.json({ success: true, paymentBreakdown: data });
});

const getDeliveryBreakdown = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const data = await Order.aggregate([
    { $match: { business: businessId, status: { $ne: "cancelled" } } },
    { $group: { _id: "$deliveryType", count: { $sum: 1 } } },
  ]);
  res.json({ success: true, deliveryBreakdown: data });
});

const getRepeatCustomerRate = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const total = await Customer.countDocuments({ business: businessId });
  const repeat = await Customer.countDocuments({ business: businessId, totalOrders: { $gt: 1 } });
  res.json({
    success: true,
    repeatCustomerRate: total > 0 ? Math.round((repeat / total) * 100) : 0,
    totalCustomers: total,
    repeatCustomers: repeat,
  });
});

module.exports = {
  getCategoryPerformance,
  getCustomerGrowth,
  getPaymentBreakdown,
  getDeliveryBreakdown,
  getRepeatCustomerRate,
};
