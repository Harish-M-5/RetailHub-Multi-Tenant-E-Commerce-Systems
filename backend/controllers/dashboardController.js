const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");

const getDashboardStats = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Revenue only counts money the business has actually received, not just
  // orders placed - fixes "Today's Sales" inflating the moment an order is
  // placed. An order's total only counts once:
  //   - home_delivery: it has been DELIVERED and payment is VERIFIED
  //     (owner confirms cash-on-delivery was collected, or confirms the
  //     UPI payment), or
  //   - store_pickup: payment is VERIFIED (confirmed from the Pickup
  //     Payments page - pickup has no delivery stage to wait on), or
  //   - offline: a walk-in sale recorded from the Offline Store page - it's
  //     always created already paid/delivered, so it counts right away.
  // An order that has since been refunded (returnStatus "refunded") is
  // excluded too - that money went back to the customer, so it shouldn't
  // still count as earned revenue.
  const earnedRevenueMatch = {
    business: businessId,
    paymentStatus: "verified",
    returnStatus: { $ne: "refunded" },
    $or: [
      { deliveryType: "home_delivery", status: "delivered" },
      { deliveryType: "store_pickup" },
      { deliveryType: "offline" },
    ],
  };

  const [
    todaySalesAgg,
    monthlyRevenueAgg,
    totalProducts,
    totalCustomers,
    totalOrders,
    pendingOrders,
    deliveredOrders,
    lowStockProducts,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { ...earnedRevenueMatch, createdAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Order.aggregate([
      { $match: { ...earnedRevenueMatch, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Product.countDocuments({ business: businessId }),
    Customer.countDocuments({ business: businessId }),
    Order.countDocuments({ business: businessId }),
    Order.countDocuments({ business: businessId, status: { $in: ["new", "confirmed", "packed", "out_for_delivery"] } }),
    Order.countDocuments({ business: businessId, status: "delivered" }),
    Product.countDocuments({ business: businessId, stockStatus: { $in: ["low_stock", "out_of_stock"] } }),
  ]);

  res.json({
    success: true,
    stats: {
      todaySales: todaySalesAgg[0]?.total || 0,
      monthlyRevenue: monthlyRevenueAgg[0]?.total || 0,
      totalProducts,
      totalCustomers,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      lowStockProducts,
    },
  });
});

const getSalesChart = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Same "actually earned" rule as getDashboardStats above, so the trend
  // line matches the Today's Sales / Monthly Revenue cards.
  const monthlySales = await Order.aggregate([
    {
      $match: {
        business: businessId,
        createdAt: { $gte: sixMonthsAgo },
        paymentStatus: "verified",
        returnStatus: { $ne: "refunded" },
        $or: [
          { deliveryType: "home_delivery", status: "delivered" },
          { deliveryType: "store_pickup" },
          { deliveryType: "offline" },
        ],
      },
    },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const bestSelling = await Order.aggregate([
    { $match: { business: businessId, status: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.product", name: { $first: "$items.name" }, totalSold: { $sum: "$items.quantity" } } },
    { $sort: { totalSold: -1 } },
    { $limit: 5 },
  ]);

  res.json({ success: true, monthlySales, bestSelling });
});

module.exports = { getDashboardStats, getSalesChart };
