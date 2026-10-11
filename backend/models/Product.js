const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    brand: { type: String, default: "" },
    description: { type: String, default: "" },
    images: [{ type: String }],
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    finalPrice: { type: Number, default: 0 },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    stockStatus: {
      type: String,
      enum: ["in_stock", "low_stock", "out_of_stock"],
      default: "in_stock",
    },
    lowStockThreshold: { type: Number, default: 5 },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    tags: [{ type: String }],
    deliveryType: {
      type: String,
      enum: ["offline_only", "home_delivery", "store_pickup"],
      default: "home_delivery",
    },
  },
  { timestamps: true }
);

productSchema.index({ business: 1, sku: 1 }, { unique: true });
productSchema.index({ business: 1, name: "text", tags: "text", brand: "text" });

productSchema.pre("save", function (next) {
  const discountAmount = (this.price * (this.discount || 0)) / 100;
  this.finalPrice = Math.round((this.price - discountAmount) * 100) / 100;

  if (this.quantity <= 0) {
    this.stockStatus = "out_of_stock";
  } else if (this.quantity <= this.lowStockThreshold) {
    this.stockStatus = "low_stock";
  } else {
    this.stockStatus = "in_stock";
  }
  next();
});

module.exports = mongoose.model("Product", productSchema);
