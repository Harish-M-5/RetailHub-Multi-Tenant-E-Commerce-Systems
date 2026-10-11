const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { notifyOwner } = require("../utils/notify");
const { logAction } = require("../utils/audit");
const { emitToCustomer, emitToOwner } = require("../utils/socket");
const { sweepOverduePickups } = require("../utils/pickupSweep");

const NEXT_STATUS = {
  new: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  // "Delivered" is offered here too (not just after "out for delivery") so
  // the owner can jump straight to it for a same-time/local handoff instead
  // of being forced through an out-for-delivery step first.
  packed: ["out_for_delivery", "delivered", "cancelled"],
  // Once out for delivery, the owner needs to be able to record either
  // outcome - a successful delivery, or a failed/returned one - rather
  // than being locked into "delivered" as the only next step.
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const getOrders = asyncHandler(async (req, res) => {
  // Instant catch-up on load, on top of the periodic background sweep -
  // see utils/pickupSweep.js.
  await sweepOverduePickups({ business: req.businessId });

  const { status, returnStatus, page = 1, limit = 20 } = req.query;
  const query = { business: req.businessId };
  if (status) query.status = status;
  if (returnStatus) query.returnStatus = returnStatus;

  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(query).populate("customer", "name email phone").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Order.countDocuments(query),
  ]);

  res.json({ success: true, orders, total, page: Number(page), pages: Math.ceil(total / limit) });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, business: req.businessId }).populate(
    "customer",
    "name email phone"
  );
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  res.json({ success: true, order });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, cancelReason } = req.body;
  const order = await Order.findOne({ _id: req.params.id, business: req.businessId });
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Store pickup orders don't use this confirm/packed/out-for-delivery/
  // delivered flow at all - there's no delivery leg to track. Use the
  // dedicated pickup actions below (markPickupCollected / releasePickup)
  // instead.
  if (order.deliveryType === "store_pickup") {
    res.status(400);
    throw new Error("Store pickup orders use the pickup actions (collected / release), not this status flow");
  }

  const allowedNext = NEXT_STATUS[order.status] || [];
  if (!allowedNext.includes(status)) {
    res.status(400);
    throw new Error(`Cannot move order from "${order.status}" to "${status}"`);
  }

  // A delivery-role user can run the full confirm -> packed -> out for
  // delivery -> delivered/cancelled flow themselves, but ONLY for an order
  // the owner has actually assigned to them (see assignDeliveryBoy below) -
  // they have no access to orders nobody assigned them.
  if (req.user.role === "delivery") {
    if (!order.assignedDeliveryBoy || order.assignedDeliveryBoy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("This order hasn't been assigned to you");
    }

    // A delivery person's status marks don't go straight to the customer -
    // they're staged here as a pending update. The owner sees it as a
    // notification/banner and has to confirm it (confirmDeliveryStatus
    // below) before `status` actually changes and the customer is told.
    order.pendingDeliveryStatus = status;
    order.pendingDeliveryCancelReason = status === "cancelled" ? cancelReason || "Couldn't be delivered" : "";
    await order.save();

    await notifyOwner({
      business: req.businessId,
      type: "delivery_update",
      title: `Delivery update on ${order.orderNumber}`,
      message: `${req.user.ownerName} marked ${order.orderNumber} as "${status.replace(/_/g, " ")}" - confirm it to notify the customer`,
      relatedOrder: order._id,
    });
    emitToOwner(req.businessId, "order:changed", { orderId: order._id });

    await logAction({
      business: req.businessId,
      performedBy: req.user._id,
      performedByName: req.user.ownerName,
      action: "order_delivery_update_pending",
      details: `Delivery person marked order ${order.orderNumber} as "${status}" - awaiting owner confirmation`,
    });

    res.json({ success: true, order });
    return;
  }

  // Owner/manager/staff updating the status directly - takes effect right
  // away and clears out any stale delivery-person suggestion that hasn't
  // been confirmed yet (this update supersedes it).
  order.pendingDeliveryStatus = null;
  order.pendingDeliveryCancelReason = "";

  const previousStatus = order.status;

  if (status === "cancelled") {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
    }
    order.cancelReason = cancelReason || "Cancelled by owner";
  }

  // Marks the start of the 24-hour return window for home-delivery orders
  // (see requestReturn in the customer orderController).
  if (status === "delivered" && !order.deliveredAt) {
    order.deliveredAt = new Date();
  }

  order.status = status;
  order.statusHistory.push({ status });
  await order.save();

  await notifyOwner({
    business: req.businessId,
    type: status === "cancelled" ? "order_cancelled" : "new_order",
    title: `Order ${order.orderNumber} ${status.replace(/_/g, " ")}`,
    message: `Order ${order.orderNumber} moved from ${previousStatus} to ${status}`,
    relatedOrder: order._id,
  });

  // Push the live status to the customer's own order-tracking page - this
  // is what drives the real-time tick/cross icons on their side without a
  // page refresh.
  emitToCustomer(req.businessId, order.customer, "order:status", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    expectedDeliveryDate: order.expectedDeliveryDate,
    statusHistory: order.statusHistory,
  });
  emitToOwner(req.businessId, "order:changed", { orderId: order._id });
  // "delivered" is one half of the revenue-counting rule for home delivery
  // orders (see dashboardController), so the stat cards may need to update.
  if (status === "delivered" || previousStatus === "delivered") {
    emitToOwner(req.businessId, "dashboard:refresh", {});
  }

  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "order_status_updated",
    details: `Order ${order.orderNumber} status changed from ${previousStatus} to ${status}`,
  });

  res.json({ success: true, order });
});

// Owner/manager reviews a delivery person's staged status suggestion
// (order.pendingDeliveryStatus, set by updateOrderStatus above) and
// confirms it - only now does the real status change and the customer get
// notified. This is the "owner has the final say" step the delivery flow
// goes through before anything reaches the customer.
const confirmDeliveryStatus = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, business: req.businessId });
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (!order.pendingDeliveryStatus) {
    res.status(400);
    throw new Error("No delivery update is waiting for confirmation on this order");
  }

  const status = order.pendingDeliveryStatus;
  const cancelReason = order.pendingDeliveryCancelReason;
  const previousStatus = order.status;
  order.pendingDeliveryStatus = null;
  order.pendingDeliveryCancelReason = "";

  if (status === "cancelled") {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
    }
    order.cancelReason = cancelReason || "Cancelled by delivery person";
  }
  if (status === "delivered" && !order.deliveredAt) {
    order.deliveredAt = new Date();
  }

  order.status = status;
  order.statusHistory.push({ status });
  await order.save();

  emitToCustomer(req.businessId, order.customer, "order:status", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    expectedDeliveryDate: order.expectedDeliveryDate,
    statusHistory: order.statusHistory,
  });
  emitToOwner(req.businessId, "order:changed", { orderId: order._id });
  if (status === "delivered" || previousStatus === "delivered") {
    emitToOwner(req.businessId, "dashboard:refresh", {});
  }

  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "order_status_updated",
    details: `Order ${order.orderNumber} status confirmed from delivery update: ${previousStatus} -> ${status}`,
  });

  res.json({ success: true, order });
});

// Owner sets/updates the expected delivery date for a home-delivery order,
// or the expected pickup-by date for a store-pickup order - for pickup
// orders this also doubles as the deadline after which the reserved stock
// is automatically released (see utils/pickupSweep.js). Pushed straight to
// the customer's tracking page in real time.
const updateExpectedDelivery = asyncHandler(async (req, res) => {
  const { expectedDeliveryDate } = req.body;
  const order = await Order.findOne({ _id: req.params.id, business: req.businessId });
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.deliveryType === "offline") {
    res.status(400);
    throw new Error("Expected delivery/pickup date doesn't apply to offline sales");
  }

  order.expectedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null;
  // For store pickup, the customer picks their own intended date at
  // checkout - whenever the owner touches this (accepting it as-is or
  // changing it), that counts as reviewing/confirming it.
  if (order.deliveryType === "store_pickup") {
    order.pickupDateConfirmed = true;
  }
  await order.save();

  emitToCustomer(req.businessId, order.customer, "order:delivery-date", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    expectedDeliveryDate: order.expectedDeliveryDate,
    pickupDateConfirmed: order.pickupDateConfirmed,
  });
  emitToOwner(req.businessId, "order:changed", { orderId: order._id });

  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "order_delivery_date_updated",
    details: `Order ${order.orderNumber} expected delivery date set to ${order.expectedDeliveryDate ? order.expectedDeliveryDate.toDateString() : "none"}`,
  });

  res.json({ success: true, order });
});

// Confirms money has actually been received for this order - UPI "Verify
// Payment" (owner checked the screenshot/amount) and Cash on Delivery /
// store-pickup "Confirm Payment" (manual entry, see PickupPayments page and
// the Orders page's cash-collected button) both land here. This is the
// single place that flips paymentStatus to "verified", which is what the
// dashboard's Today's Sales / Monthly Revenue figures are built from - see
// dashboardController's earnedRevenueMatch.
const verifyPayment = asyncHandler(async (req, res) => {
  const { amountReceived } = req.body;
  const order = await Order.findOne({ _id: req.params.id, business: req.businessId });
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (amountReceived !== undefined && amountReceived !== null && amountReceived !== "") {
    const parsed = Number(amountReceived);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      order.amountPaid = parsed;
    }
  }
  order.paymentStatus = "verified";
  await order.save();

  emitToCustomer(req.businessId, order.customer, "order:payment", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
  });
  emitToOwner(req.businessId, "order:changed", { orderId: order._id });
  // Payment confirmations change the revenue figures, not just this one
  // order, so the Dashboard's stat cards should also refresh live.
  emitToOwner(req.businessId, "dashboard:refresh", {});

  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "payment_verified",
    details: `Payment verified for order ${order.orderNumber}${amountReceived ? ` (₹${order.amountPaid} received)` : ""}`,
  });

  res.json({ success: true, order });
});

// Owner approves or rejects a customer's return request (requested by
// requestReturn in the customer orderController, within 24h of delivery).
const decideReturn = asyncHandler(async (req, res) => {
  const { action, rejectReason } = req.body; // action: "approve" | "reject"
  const order = await Order.findOne({ _id: req.params.id, business: req.businessId });
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.returnStatus !== "requested") {
    res.status(400);
    throw new Error("There is no pending return request for this order");
  }
  if (!["approve", "reject"].includes(action)) {
    res.status(400);
    throw new Error("Invalid action - must be approve or reject");
  }

  if (action === "approve") {
    order.returnStatus = "approved";
    order.returnApprovedAt = new Date();
  } else {
    order.returnStatus = "rejected";
    order.returnRejectReason = rejectReason || "Rejected by owner";
  }
  await order.save();

  emitToCustomer(req.businessId, order.customer, "order:return", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    returnStatus: order.returnStatus,
    returnRejectReason: order.returnRejectReason,
  });
  emitToOwner(req.businessId, "order:changed", { orderId: order._id });

  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "return_" + action + "d",
    details: `Return for order ${order.orderNumber} ${action === "approve" ? "approved" : `rejected (${order.returnRejectReason})`}`,
  });

  res.json({ success: true, order });
});

// Owner/manager assigns (or reassigns/unassigns with deliveryBoyId: null) a
// delivery-role staff member to a home-delivery order. Once assigned, that
// person's own Delivery page shows the order and they can progress its
// status/return pickup themselves - see updateOrderStatus and
// markReturnPickedUp's role checks above.
const assignDeliveryBoy = asyncHandler(async (req, res) => {
  const { deliveryBoyId } = req.body;
  const order = await Order.findOne({ _id: req.params.id, business: req.businessId });
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.deliveryType !== "home_delivery") {
    res.status(400);
    throw new Error("Only home delivery orders need a delivery person assigned");
  }

  let deliveryBoy = null;
  if (deliveryBoyId) {
    deliveryBoy = await User.findOne({ _id: deliveryBoyId, business: req.businessId, role: "delivery" });
    if (!deliveryBoy) {
      res.status(400);
      throw new Error("Delivery person not found");
    }
  }

  order.assignedDeliveryBoy = deliveryBoy ? deliveryBoy._id : null;
  await order.save();

  emitToOwner(req.businessId, "order:changed", { orderId: order._id });

  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "order_delivery_boy_assigned",
    details: deliveryBoy
      ? `Order ${order.orderNumber} assigned to delivery person ${deliveryBoy.ownerName}`
      : `Order ${order.orderNumber} unassigned from delivery`,
  });

  res.json({ success: true, order });
});

// Owner confirms the delivery person has collected the returned item and
// checked it is correct (condition/item matches, for both COD and UPI
// orders) - the step right before issuing the refund. A delivery-role user
// calling this doesn't finish the step outright - it's staged on
// returnPendingPickup for the owner to review/confirm first (see
// confirmReturnPickup below), same pattern as updateOrderStatus.
const markReturnPickedUp = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, business: req.businessId });
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.returnStatus !== "approved") {
    res.status(400);
    throw new Error("Return must be approved before it can be marked as picked up");
  }
  if (req.user.role === "delivery") {
    if (!order.assignedDeliveryBoy || order.assignedDeliveryBoy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("This order hasn't been assigned to you");
    }

    order.returnPendingPickup = true;
    await order.save();

    await notifyOwner({
      business: req.businessId,
      type: "delivery_update",
      title: `Return pickup update on ${order.orderNumber}`,
      message: `${req.user.ownerName} marked the return for ${order.orderNumber} as collected & verified - confirm to notify the customer`,
      relatedOrder: order._id,
    });
    emitToOwner(req.businessId, "order:changed", { orderId: order._id });

    await logAction({
      business: req.businessId,
      performedBy: req.user._id,
      performedByName: req.user.ownerName,
      action: "return_pickup_pending",
      details: `Delivery person marked the return for order ${order.orderNumber} as collected - awaiting owner confirmation`,
    });

    res.json({ success: true, order });
    return;
  }

  order.returnStatus = "picked_up";
  order.returnPickedUpAt = new Date();
  order.returnPendingPickup = false;
  await order.save();

  emitToCustomer(req.businessId, order.customer, "order:return", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    returnStatus: order.returnStatus,
  });
  emitToOwner(req.businessId, "order:changed", { orderId: order._id });

  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "return_picked_up",
    details: `Returned item for order ${order.orderNumber} collected and verified`,
  });

  res.json({ success: true, order });
});

// Owner/manager reviews a delivery person's staged "collected & verified"
// mark (order.returnPendingPickup) and confirms it - only now does
// returnStatus actually move to "picked_up" and the customer get notified.
const confirmReturnPickup = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, business: req.businessId });
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (!order.returnPendingPickup) {
    res.status(400);
    throw new Error("No return pickup update is waiting for confirmation on this order");
  }

  order.returnPendingPickup = false;
  order.returnStatus = "picked_up";
  order.returnPickedUpAt = new Date();
  await order.save();

  emitToCustomer(req.businessId, order.customer, "order:return", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    returnStatus: order.returnStatus,
  });
  emitToOwner(req.businessId, "order:changed", { orderId: order._id });

  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "return_picked_up",
    details: `Return pickup for order ${order.orderNumber} confirmed from delivery update`,
  });

  res.json({ success: true, order });
});

// Owner confirms the refund has actually been paid out - cash handed back
// in person for COD, or sent manually to the customer's UPI ID (collected
// at return-request time) for online payments. This is what removes the
// order's amount from Today's Sales / Monthly Revenue - see
// dashboardController's earnedRevenueMatch.
const refundReturn = asyncHandler(async (req, res) => {
  const { refundAmount } = req.body;
  const order = await Order.findOne({ _id: req.params.id, business: req.businessId });
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.returnStatus !== "picked_up") {
    res.status(400);
    throw new Error("The returned item must be collected and verified before refunding");
  }

  const parsed = Number(refundAmount);
  order.refundAmount = !Number.isNaN(parsed) && parsed >= 0 ? parsed : order.total;
  order.returnStatus = "refunded";
  order.refundedAt = new Date();
  await order.save();

  emitToCustomer(req.businessId, order.customer, "order:return", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    returnStatus: order.returnStatus,
    refundAmount: order.refundAmount,
  });
  emitToOwner(req.businessId, "order:changed", { orderId: order._id });
  // Refunding this order removes its amount from earned revenue, so the
  // Dashboard's stat cards need to refresh live too.
  emitToOwner(req.businessId, "dashboard:refresh", {});

  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "return_refunded",
    details: `Order ${order.orderNumber} refunded ₹${order.refundAmount} via ${order.paymentMethod === "upi" ? `UPI (${order.returnUpiId})` : "cash"}`,
  });

  res.json({ success: true, order });
});

// Owner marks a store-pickup order as successfully collected - the
// customer came and bought it within their window. Store pickup doesn't go
// through the confirm/packed/out-for-delivery flow at all (see
// updateOrderStatus's guard above), this is its own simple finish line.
const markPickupCollected = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, business: req.businessId });
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.deliveryType !== "store_pickup") {
    res.status(400);
    throw new Error("This action is only for store pickup orders");
  }
  if (["delivered", "cancelled"].includes(order.status)) {
    res.status(400);
    throw new Error("This order is already finished");
  }

  order.status = "delivered";
  order.deliveredAt = new Date();
  order.statusHistory.push({ status: "delivered" });
  await order.save();

  emitToCustomer(req.businessId, order.customer, "order:status", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    expectedDeliveryDate: order.expectedDeliveryDate,
    statusHistory: order.statusHistory,
  });
  emitToOwner(req.businessId, "order:changed", { orderId: order._id });

  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "order_status_updated",
    details: `Pickup order ${order.orderNumber} marked as collected by the customer`,
  });

  res.json({ success: true, order });
});

// Owner releases a store-pickup order early - the customer's window is up
// (or about to be) and the owner has decided to sell the stock to someone
// else instead of waiting for the automatic deadline sweep (see
// utils/pickupSweep.js, which does the same thing automatically once
// expectedDeliveryDate passes).
const releasePickup = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, business: req.businessId });
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.deliveryType !== "store_pickup") {
    res.status(400);
    throw new Error("This action is only for store pickup orders");
  }
  if (["delivered", "cancelled"].includes(order.status)) {
    res.status(400);
    throw new Error("This order is already finished");
  }

  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
  }
  order.status = "cancelled";
  order.cancelReason = "Pickup window finished - released to another customer by the owner";
  order.statusHistory.push({ status: "cancelled" });
  await order.save();

  emitToCustomer(req.businessId, order.customer, "order:status", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    expectedDeliveryDate: order.expectedDeliveryDate,
    statusHistory: order.statusHistory,
  });
  emitToOwner(req.businessId, "order:changed", { orderId: order._id });

  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "order_status_updated",
    details: `Pickup order ${order.orderNumber} released by the owner - stock restored`,
  });

  res.json({ success: true, order });
});

module.exports = {
  getOrders,
  getOrder,
  updateOrderStatus,
  confirmDeliveryStatus,
  verifyPayment,
  updateExpectedDelivery,
  assignDeliveryBoy,
  markPickupCollected,
  releasePickup,
  decideReturn,
  markReturnPickedUp,
  confirmReturnPickup,
  refundReturn,
};
