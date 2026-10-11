const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    type: {
      type: String,
      enum: [
        "new_order",
        "low_stock",
        "out_of_stock",
        "payment_received",
        "payment_mismatch",
        "order_cancelled",
        "return_requested",
        "delivery_update",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    relatedProduct: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
