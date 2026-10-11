const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");
const { logAction } = require("../utils/audit");

const getProducts = asyncHandler(async (req, res) => {
  const { search, category, status, page = 1, limit = 20 } = req.query;
  const query = { business: req.businessId };

  if (search) query.$text = { $search: search };
  if (category) query.category = category;
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [products, total] = await Promise.all([
    Product.find(query).populate("category", "name").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Product.countDocuments(query),
  ]);

  res.json({ success: true, products, total, page: Number(page), pages: Math.ceil(total / limit) });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, business: req.businessId }).populate(
    "category",
    "name"
  );
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ success: true, product });
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create({ ...req.body, business: req.businessId });
  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "product_created",
    details: `Created product ${product.name} (SKU: ${product.sku})`,
  });
  res.status(201).json({ success: true, product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, business: req.businessId });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  Object.assign(product, req.body);
  await product.save();
  res.json({ success: true, product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndDelete({ _id: req.params.id, business: req.businessId });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  await logAction({
    business: req.businessId,
    performedBy: req.user._id,
    performedByName: req.user.ownerName,
    action: "product_deleted",
    details: `Deleted product ${product.name} (SKU: ${product.sku})`,
  });
  res.json({ success: true, message: "Product deleted" });
});

const toggleProductStatus = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, business: req.businessId });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  product.status = product.status === "active" ? "disabled" : "active";
  await product.save();
  res.json({ success: true, product });
});

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
};
