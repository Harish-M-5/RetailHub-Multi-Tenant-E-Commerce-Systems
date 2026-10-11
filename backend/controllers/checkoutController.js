const asyncHandler = require("express-async-handler");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const Business = require("../models/Business");
const { generateOrderNumber } = require("../utils/generateBusinessId");
const { notifyOwner } = require("../utils/notify");
const { emitToCustomer } = require("../utils/socket");

const placeOrder = asyncHandler(async (req, res) => {
  const {
    shippingAddress,
    deliveryType,
    paymentMethod,
    paymentScreenshot,
    amountPaid,
    expectedPickupDate,
    expectedPickupDateStart,
  } = req.body;

  // Store pickup: the customer commits to a WINDOW they'll come collect it
  // in (start -> end), not just a single date. The owner reviews/confirms
  // it from the Orders page (pickupDateConfirmed), and the end date is also
  // the deadline pickupSweep uses to auto-release the order (restocked) if
  // they never show up.
  let expectedDeliveryDate = null;
  let pickupWindowStart = null;
  if (deliveryType === "store_pickup") {
    if (!expectedPickupDateStart || !expectedPickupDate) {
      res.status(400);
      throw new Error("Please choose the date range you'll come collect your order");
    }
    const parsedStart = new Date(expectedPickupDateStart);
    const parsedEnd = new Date(expectedPickupDate);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (
      Number.isNaN(parsedStart.getTime()) ||
      Number.isNaN(parsedEnd.getTime()) ||
      parsedStart < startOfToday ||
      parsedEnd < parsedStart
    ) {
      res.status(400);
      throw new Error("Please choose a valid pickup date range (end date on or after the start date)");
    }
    pickupWindowStart = parsedStart;
    expectedDeliveryDate = parsedEnd;
  }

  const cart = await Cart.findOne({ business: req.businessId, customer: req.customer._id }).populate(
    "items.product"
  );
  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error("Your cart is empty");
  }

  const business = await Business.findById(req.businessId);

  const orderItems = [];
  let subtotal = 0;

  for (const item of cart.items) {
    const product = await Product.findOne({ _id: item.product._id, business: req.businessId });
    if (!product || product.status !== "active") {
      res.status(400);
      throw new Error(`${item.product.name || "A product"} is no longer available`);
    }
    if (product.deliveryType === "offline_only") {
      res.status(400);
      throw new Error(`${product.name} is available only in-store`);
    }
    if (product.quantity < item.quantity) {
      res.status(400);
      throw new Error(`Not enough stock for ${product.name}`);
    }

    const lineSubtotal = product.finalPrice * item.quantity;
    orderItems.push({
      product: product._id,
      name: product.name,
      image: product.images?.[0] || "",
      price: product.finalPrice,
      quantity: item.quantity,
      subtotal: lineSubtotal,
    });
    subtotal += lineSubtotal;

    product.quantity -= item.quantity;
    await product.save();

    if (product.stockStatus === "out_of_stock") {
      await notifyOwner({
        business: req.businessId,
        type: "out_of_stock",
        title: "Product out of stock",
        message: `${product.name} is now out of stock`,
        relatedProduct: product._id,
      });
    } else if (product.stockStatus === "low_stock") {
      await notifyOwner({
        business: req.businessId,
        type: "low_stock",
        title: "Low stock warning",
        message: `${product.name} is running low (${product.quantity} left)`,
        relatedProduct: product._id,
      });
    }
  }

  // Delivery charge: Cash on Delivery carries the business's configured
  // handling fee (only for home delivery - store pickup has no delivery to
  // charge for). Online/UPI payment never carries a delivery charge.
  const deliveryCharge =
    paymentMethod === "cod" && deliveryType === "home_delivery"
      ? business?.deliverySettings?.codCharge || 0
      : 0;
  const total = subtotal + deliveryCharge;

  // Payment status: COD starts "pending" (collected on delivery). For UPI,
  // this is a self-reported amount the customer typed in right after
  // scanning the store's QR code, backed by their uploaded screenshot - the
  // project has no real bank/payment-gateway API to confirm the transfer,
  // so this is the best-effort check: match -> "paid" (awaiting the
  // owner's manual "Verify Payment"), mismatch -> "partial" so both sides
  // immediately see something is off.
  let paymentStatus = "pending";
  const paidAmount = Number(amountPaid) || 0;
  if (paymentMethod === "upi") {
    paymentStatus = paidAmount >= total ? "paid" : paidAmount > 0 ? "partial" : "pending";
  }

  const orderNumber = await generateOrderNumber();
  const order = await Order.create({
    business: req.businessId,
    customer: req.customer._id,
    orderNumber,
    items: orderItems,
    subtotal,
    deliveryCharge,
    total,
    shippingAddress,
    deliveryType,
    expectedDeliveryDate,
    pickupWindowStart,
    paymentMethod,
    paymentStatus,
    paymentScreenshot: paymentScreenshot || "",
    amountPaid: paymentMethod === "upi" ? paidAmount : 0,
    status: "new",
    statusHistory: [{ status: "new" }],
  });

  cart.items = [];
  await cart.save();

  const customer = await Customer.findById(req.customer._id);
  customer.totalOrders += 1;
  customer.totalSpent += total;
  await customer.save();

  await notifyOwner({
    business: req.businessId,
    type: "new_order",
    title: "New order received",
    message: `Order ${orderNumber} placed by ${customer.name} for ₹${total}`,
    relatedOrder: order._id,
  });

  if (paymentMethod === "upi") {
    const matched = paymentStatus === "paid";
    await notifyOwner({
      business: req.businessId,
      type: matched ? "payment_received" : "payment_mismatch",
      title: matched ? "Full payment received" : "Payment amount mismatch",
      message: matched
        ? `${customer.name} paid ₹${paidAmount} in full for order ${orderNumber}`
        : `${customer.name} reported paying ₹${paidAmount} but order ${orderNumber} totals ₹${total} - please check before confirming`,
      relatedOrder: order._id,
    });
  }

  // Let the customer's own order-tracking tab update live too, in case
  // they have it open already.
  emitToCustomer(req.businessId, req.customer._id, "order:placed", order);

  res.status(201).json({ success: true, order });
});

module.exports = { placeOrder };
