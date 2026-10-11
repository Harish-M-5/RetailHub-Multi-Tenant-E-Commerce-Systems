const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const { notifyOwner } = require("../utils/notify");
const { emitToOwner } = require("../utils/socket");
const { sweepOverduePickups } = require("../utils/pickupSweep");

const RETURN_WINDOW_HOURS = 24;

// Customer-facing: view own orders / track status
const getMyOrders = asyncHandler(async (req, res) => {
  // Instant catch-up on load, on top of the periodic background sweep -
  // see utils/pickupSweep.js.
  await sweepOverduePickups({ business: req.businessId, customer: req.customer._id });

  const orders = await Order.find({ business: req.businessId, customer: req.customer._id }).sort({
    createdAt: -1,
  });
  res.json({ success: true, orders });
});

const getMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    business: req.businessId,
    customer: req.customer._id,
  });
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  res.json({ success: true, order });
});

// Customer requests a return - only for home-delivery orders, only within
// 24 hours of delivery, and only once. UPI orders must give the UPI ID to
// refund to, since the owner has no other way to send money back. Owner
// then approves/rejects it from the Returns page (ownerOrderController).
const requestReturn = asyncHandler(async (req, res) => {
  const { reason, upiId } = req.body;
  const order = await Order.findOne({
    _id: req.params.id,
    business: req.businessId,
    customer: req.customer._id,
  });
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.deliveryType !== "home_delivery") {
    res.status(400);
    throw new Error("Only home delivery orders can be returned");
  }
  if (order.status !== "delivered" || !order.deliveredAt) {
    res.status(400);
    throw new Error("The order must be delivered before it can be returned");
  }
  const hoursSinceDelivery = (Date.now() - order.deliveredAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceDelivery > RETURN_WINDOW_HOURS) {
    res.status(400);
    throw new Error("The 24-hour return window for this order has expired");
  }
  if (order.returnStatus !== "none") {
    res.status(400);
    throw new Error("A return has already been requested for this order");
  }
  if (!reason || !reason.trim()) {
    res.status(400);
    throw new Error("Please provide a reason for the return");
  }
  if (order.paymentMethod === "upi" && (!upiId || !upiId.trim())) {
    res.status(400);
    throw new Error("Please provide your UPI ID so the refund can be sent to it");
  }

  order.returnStatus = "requested";
  order.returnReason = reason.trim();
  order.returnRequestedAt = new Date();
  if (order.paymentMethod === "upi") order.returnUpiId = upiId.trim();
  await order.save();

  await notifyOwner({
    business: req.businessId,
    type: "return_requested",
    title: `Return requested - ${order.orderNumber}`,
    message: `Customer requested a return for ${order.orderNumber}: ${order.returnReason}`,
    relatedOrder: order._id,
  });
  emitToOwner(req.businessId, "order:changed", { orderId: order._id });

  res.json({ success: true, order });
});

module.exports = { getMyOrders, getMyOrder, requestReturn };
