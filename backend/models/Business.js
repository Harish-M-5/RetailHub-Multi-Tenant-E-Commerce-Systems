const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    businessId: { type: String, required: true, unique: true },
    businessName: { type: String, required: true, trim: true },
    businessType: { type: String, required: true, trim: true },
    storeSlug: { type: String, required: true, unique: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    gstNumber: { type: String, default: "" },
    description: { type: String, default: "" },
    logo: { type: String, default: "" },
    banner: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    paymentSettings: {
      googlePayQr: { type: String, default: "" },
      phonePeQr: { type: String, default: "" },
      paytmQr: { type: String, default: "" },
      genericUpiQr: { type: String, default: "" },
      upiId: { type: String, default: "" },
    },
    theme: {
      primaryColor: { type: String, default: "#6366f1" },
    },
    // Cash-on-Delivery gets an extra handling fee; online/UPI payment never
    // does (encourages customers toward the prepaid option). Owner-editable
    // from Business Profile.
    deliverySettings: {
      codCharge: { type: Number, default: 40 },
    },
  },
  { timestamps: true }
);

businessSchema.virtual("storeUrl").get(function () {
  const base = process.env.STORE_BASE_URL || "http://localhost:5173/store";
  return `${base}/${this.storeSlug}`;
});

businessSchema.set("toJSON", { virtuals: true });
businessSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Business", businessSchema);
