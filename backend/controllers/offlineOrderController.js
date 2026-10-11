const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const { generateOrderNumber } = require("../utils/generateBusinessId");
const { logAction } = require("../utils/audit");
const { emitToOwner } = require("../utils/socket");

// Records a walk-in sale made in person at the physical store - it never
// goes through the online storefront/checkout at all. Unlike an online
// order there's no delivery or payment-verification flow to track: the
// sale is already complete and paid for the moment the owner types it in,
// so it's created straight into status "delivered" / paymentStatus
// "verified" so it counts toward Today's Sales immediately.
const createOfflineOrder = asyncHandler(async (req, res) => {
  const {
    customerName,
    customerEmail,
    customerPhone,
    address,
    city,
    state,
    pincode,
    items,
    paymentMethod,
    amountPaid,
  } = req.body;

  if (!customerName || !customerName.trim()) {
    res.status(400);
    throw new Error("Customer name is required");
  }
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error("Add at least one product");
  }
  if (!["cash", "gpay"].includes(paymentMethod)) {
    res.status(400);
    throw new Error("Payment method must be cash or gpay");
  }

  const orderItems = [];
  let subtotal = 0;
  for (const line of items) {
    const product = await Product.findOne({ _id: line.productId, business: req.businessId });
    if (!product) {
      res.status(400);
      throw new Error("One of the selected products could not be found");
    }
    const quantity = Math.max(1, Number(line.quantity) || 1);
    if (product.quantity < quantity) {
      res.status(400);
      throw new Error(`Not enough stock for ${product.name} (${product.quantity} left)`);
    }

    const lineSubtotal = product.finalPrice * quantity;
    orderItems.push({
      product: product._id,
      name: product.name,
      image: product.images?.[0] || "",
      price: product.finalPrice,
      quantity,
      subtotal: lineSubtotal,
    });
    subtotal += lineSubtotal;

    product.quantity -= quantity;
    await product.save();
  }

  const total = subtotal;

  // Find (by email, if given) or create a lightweight Customer record so
  // this walk-in sale still shows up in the Customers/CRM page and builds
  // up their purchase history - they never log in with this account, it's
  // just a record.
  let customer = null;
  if (customerEmail && customerEmail.trim()) {
    customer = await Customer.findOne({ business: req.businessId, email: customerEmail.trim().toLowerCase() });
  }
  if (!customer) {
    customer = await Customer.create({
      business: req.businessId,
      name: customerName.trim(),
      email:
        customerEmail && customerEmail.trim()
          ? customerEmail.trim().toLowerCase()
          : `walkin-${Date.now()}-${crypto.randomBytes(3).toString("hex")}@offline.local`,
      phone: customerPhone && customerPhone.trim() ? customerPhone.trim() : "N/A",
      password: crypto.randomBytes(16).toString("hex"),
    });
  }
  customer.totalOrders += 1;
  customer.totalSpent += total;
  await customer.save();

  const orderNumber = await generateOrderNumber();
  const now = new Date();
  const order = await Order.create({
    business: req.businessId,
    customer: customer._id,
    orderNumber,
    items: orderItems,
    subtotal,
    deliveryCharge: 0,
    total,
    shippingAddress: {
      name: customerName.trim(),
      phone: customerPhone || "",
      email: customerEmail || "",
      address: address || "",
      city: city || "",
      state: state || "",
      pincode: pincode || "",
    },
    deliveryType: "offline",
    paymentMethod,
    paymentStatus: "verified",
    amountPaid: Number(amountPaid) > 0 ? Number(amountPaid) : total,
    status: "delivered",
    statusHistory: [{ status: "delivered" }],
    deliveredAt: now,
  });

  emitToOwner(req.businessId, "order:changed", { orderId: order._id });
  emitToOwner(req.businessId, "dashboard:refresh", {});

  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "offline_sale_recorded",
    details: `Offline sale ${order.orderNumber} recorded for ${customer.name} - ₹${total} via ${paymentMethod}`,
  });

  res.status(201).json({ success: true, order });
});

// Full all-time history, not just "recent" - this page is also the
// record-keeping log for walk-in sales, so nothing should drop off it.
const getOfflineOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ business: req.businessId, deliveryType: "offline" })
    .populate("customer", "name email phone")
    .sort({ createdAt: -1 })
    .limit(2000);
  res.json({ success: true, orders });
});

// Edits a previously-recorded walk-in sale's customer/payment details - the
// product line items themselves aren't editable here (that would need
// re-adjusting stock), only who it was for and how it was paid.
const updateOfflineOrder = asyncHandler(async (req, res) => {
  const { customerName, customerEmail, customerPhone, address, city, state, pincode, paymentMethod, amountPaid } =
    req.body;
  const order = await Order.findOne({ _id: req.params.id, business: req.businessId, deliveryType: "offline" });
  if (!order) {
    res.status(404);
    throw new Error("Offline sale not found");
  }

  if (customerName !== undefined && customerName.trim()) order.shippingAddress.name = customerName.trim();
  if (customerEmail !== undefined) order.shippingAddress.email = customerEmail;
  if (customerPhone !== undefined) order.shippingAddress.phone = customerPhone;
  if (address !== undefined) order.shippingAddress.address = address;
  if (city !== undefined) order.shippingAddress.city = city;
  if (state !== undefined) order.shippingAddress.state = state;
  if (pincode !== undefined) order.shippingAddress.pincode = pincode;
  if (paymentMethod && ["cash", "gpay"].includes(paymentMethod)) order.paymentMethod = paymentMethod;
  if (amountPaid !== undefined && amountPaid !== "" && !Number.isNaN(Number(amountPaid))) {
    order.amountPaid = Number(amountPaid);
  }
  await order.save();

  emitToOwner(req.businessId, "order:changed", { orderId: order._id });

  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "offline_sale_updated",
    details: `Offline sale ${order.orderNumber} details updated`,
  });

  res.json({ success: true, order });
});

// Deletes a wrongly-entered walk-in sale - restocks the products it
// decremented and backs the amount out of the customer's running totals.
const deleteOfflineOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, business: req.businessId, deliveryType: "offline" });
  if (!order) {
    res.status(404);
    throw new Error("Offline sale not found");
  }

  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
  }

  const customer = await Customer.findById(order.customer);
  if (customer) {
    customer.totalOrders = Math.max(0, customer.totalOrders - 1);
    customer.totalSpent = Math.max(0, customer.totalSpent - order.total);
    await customer.save();
  }

  await Order.deleteOne({ _id: order._id });

  emitToOwner(req.businessId, "order:changed", { orderId: order._id });
  emitToOwner(req.businessId, "dashboard:refresh", {});

  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "offline_sale_deleted",
    details: `Offline sale ${order.orderNumber} deleted - stock restored`,
  });

  res.json({ success: true, message: "Offline sale deleted" });
});

module.exports = { createOfflineOrder, getOfflineOrders, updateOfflineOrder, deleteOfflineOrder };
