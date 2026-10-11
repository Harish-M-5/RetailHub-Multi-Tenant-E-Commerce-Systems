const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    orderNumber: { type: String, required: true, unique: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    // Extra fee charged for Cash on Delivery orders (home_delivery + cod).
    // Online/UPI orders always have deliveryCharge 0 - see checkoutController.
    deliveryCharge: { type: Number, default: 0 },
    total: { type: Number, required: true },
    // Home delivery: owner-set ETA, shown live to the customer on their
    // MyOrders page. Store pickup: the CUSTOMER sets this at checkout (the
    // date they commit to coming collect it) - the owner then reviews and
    // confirms it (pickupDateConfirmed below), and it's also the deadline
    // pickupSweep uses to auto-release the order if they never show up.
    expectedDeliveryDate: { type: Date, default: null },
    // Store pickup only - the START of the window the customer committed to
    // at checkout ("I'll come collect it between X and Y"). expectedDeliveryDate
    // above doubles as the END of that window / the collection deadline.
    pickupWindowStart: { type: Date, default: null },
    // Store pickup only - true once the owner has reviewed/accepted the
    // customer's requested pickup window (or set their own). See
    // ownerOrderController.updateExpectedDelivery.
    pickupDateConfirmed: { type: Boolean, default: false },
    // Home delivery only - which delivery-role staff member is handling
    // this order. Set by the owner/manager (ownerOrderController.assignDeliveryBoy);
    // once set, that delivery person can progress the order's status and
    // the matching return pickup (see updateOrderStatus's role check).
    assignedDeliveryBoy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // Home delivery only - when a delivery-role user marks a status change,
    // it doesn't go straight to the customer. It's staged here first, the
    // owner sees it as a notification/banner, and only once the owner
    // confirms it (ownerOrderController.confirmDeliveryStatus) does `status`
    // actually change and the customer get notified.
    pendingDeliveryStatus: {
      type: String,
      enum: ["confirmed", "packed", "out_for_delivery", "delivered", "cancelled", null],
      default: null,
    },
    pendingDeliveryCancelReason: { type: String, default: "" },
    shippingAddress: {
      name: String,
      phone: String,
      email: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
    },
    // "offline" is a walk-in/in-store sale recorded by the owner from the
    // Offline Store page - it never goes through the online checkout flow
    // at all (see offlineOrderController).
    deliveryType: { type: String, enum: ["home_delivery", "store_pickup", "offline"], required: true },
    // "cash"/"gpay" are only used for offline sales (see offlineOrderController) -
    // the online checkout flow only ever uses "upi"/"cod".
    paymentMethod: { type: String, enum: ["upi", "cod", "cash", "gpay"], required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partial", "verified", "failed"],
      default: "pending",
    },
    paymentScreenshot: { type: String, default: "" },
    // What the customer says they paid (entered right after scanning the
    // owner's UPI QR code) - compared against `total` so both sides get an
    // accurate "paid in full" / "amount mismatch" notification. This is a
    // self-reported figure plus a screenshot, not a bank-verified read of
    // the transaction (the project has no real payment-gateway
    // integration), so the owner still does the final "Verify Payment".
    amountPaid: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["new", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"],
      default: "new",
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
      },
    ],
    cancelReason: { type: String, default: "" },
    // Set the moment a home-delivery order's status first becomes
    // "delivered" (see ownerOrderController.updateOrderStatus) - this is
    // what the 24-hour return window is measured from.
    deliveredAt: { type: Date, default: null },
    // Return/refund flow (home delivery only): customer requests within 24h
    // of delivery -> owner approves/rejects -> delivery person collects +
    // owner verifies the item is correct -> owner refunds (cash in person
    // for COD, or manually via the customer's UPI ID for online payments).
    returnStatus: {
      type: String,
      enum: ["none", "requested", "approved", "rejected", "picked_up", "refunded"],
      default: "none",
    },
    returnReason: { type: String, default: "" },
    returnRequestedAt: { type: Date, default: null },
    // Only collected/needed when paymentMethod is "upi" - the owner has no
    // other way to send the refund back to the customer.
    returnUpiId: { type: String, default: "" },
    returnRejectReason: { type: String, default: "" },
    returnApprovedAt: { type: Date, default: null },
    returnPickedUpAt: { type: Date, default: null },
    // Home delivery only - true once a delivery-role user has marked the
    // returned item as collected & verified, but before the owner has
    // confirmed it. Mirrors pendingDeliveryStatus above: the delivery
    // person's mark doesn't change returnStatus or reach the customer by
    // itself - the owner reviews it (confirmReturnPickup) first.
    returnPendingPickup: { type: Boolean, default: false },
    refundAmount: { type: Number, default: 0 },
    refundedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
