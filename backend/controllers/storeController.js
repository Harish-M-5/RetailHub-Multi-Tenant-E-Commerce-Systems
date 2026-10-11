const asyncHandler = require("express-async-handler");
const Business = require("../models/Business");
const Product = require("../models/Product");
const Category = require("../models/Category");

const resolveBusiness = async (slug) => {
  return Business.findOne({ storeSlug: slug, isActive: true }).select(
    "businessId businessName businessType storeSlug logo banner description address city state phone email paymentSettings deliverySettings storeUrl"
  );
};

const getStoreInfo = asyncHandler(async (req, res) => {
  const business = await resolveBusiness(req.params.slug);
  if (!business) {
    res.status(404);
    throw new Error("Store not found");
  }
  res.json({ success: true, business });
});

const getStoreCategories = asyncHandler(async (req, res) => {
  const business = await resolveBusiness(req.params.slug);
  if (!business) {
    res.status(404);
    throw new Error("Store not found");
  }
  const categories = await Category.find({ business: business._id, isActive: true }).sort({ name: 1 });
  res.json({ success: true, categories });
});

const getStoreProducts = asyncHandler(async (req, res) => {
  const business = await resolveBusiness(req.params.slug);
  if (!business) {
    res.status(404);
    throw new Error("Store not found");
  }

  const { search, category, minPrice, maxPrice, brand, page = 1, limit = 20 } = req.query;
  const query = { business: business._id, status: "active" };

  if (search) query.$text = { $search: search };
  if (category) query.category = category;
  if (brand) query.brand = brand;
  if (minPrice || maxPrice) {
    query.finalPrice = {};
    if (minPrice) query.finalPrice.$gte = Number(minPrice);
    if (maxPrice) query.finalPrice.$lte = Number(maxPrice);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [products, total] = await Promise.all([
    Product.find(query).populate("category", "name").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Product.countDocuments(query),
  ]);

  res.json({ success: true, products, total, page: Number(page), pages: Math.ceil(total / limit) });
});

const getStoreProduct = asyncHandler(async (req, res) => {
  const business = await resolveBusiness(req.params.slug);
  if (!business) {
    res.status(404);
    throw new Error("Store not found");
  }
  const product = await Product.findOne({
    _id: req.params.productId,
    business: business._id,
    status: "active",
  }).populate("category", "name");
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ success: true, product });
});

module.exports = { resolveBusiness, getStoreInfo, getStoreCategories, getStoreProducts, getStoreProduct };
