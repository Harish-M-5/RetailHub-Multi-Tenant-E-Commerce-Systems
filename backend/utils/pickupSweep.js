const Order = require("../models/Order");
const Product = require("../models/Product");
const { notifyOwner } = require("./notify");
const { emitToCustomer, emitToOwner } = require("./socket");

// Store-pickup orders reserve their stock for the customer until the
// owner-set expected pickup date. If the customer never comes to collect
// it by then, the order is released: restocked and cancelled, so the
// owner can sell it to someone else. This runs on a timer (see
// startPickupSweep, called once from server.js) so it happens live even
// if nobody has a page open, and is also called inline from the owner's
// and customer's order-list endpoints for an instant catch-up on load.
const sweepOverduePickups = async (filter = {}) => {
  const now = new Date();
  const overdue = await Order.find({
    ...filter,
    deliveryType: "store_pickup",
    status: { $nin: ["delivered", "cancelled"] },
    expectedDeliveryDate: { $ne: null, $lt: now },
  });

  for (const order of overdue) {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
    }
    order.status = "cancelled";
    order.cancelReason = "Not collected by the expected pickup date - released back to stock";
    order.statusHistory.push({ status: "cancelled" });
    await order.save();

    await notifyOwner({
      business: order.business,
      type: "order_cancelled",
      title: `Pickup order ${order.orderNumber} released`,
      message: `${order.orderNumber} wasn't collected by its expected pickup date, so it was released back to stock`,
      relatedOrder: order._id,
    });
    emitToCustomer(order.business, order.customer, "order:status", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      expectedDeliveryDate: order.expectedDeliveryDate,
      statusHistory: order.statusHistory,
    });
    emitToOwner(order.business, "order:changed", { orderId: order._id });
  }

  return overdue.length;
};

let interval = null;
const startPickupSweep = (intervalMs = 60 * 1000) => {
  if (interval) return;
  interval = setInterval(() => {
    sweepOverduePickups().catch((err) => console.error("[pickupSweep] failed:", err.message));
  }, intervalMs);
};

module.exports = { sweepOverduePickups, startPickupSweep };
