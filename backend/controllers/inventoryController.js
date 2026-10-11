const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");

const getInventory = asyncHandler(async (req, res) => {
  const { stockStatus } = req.query;
  const query = { business: req.businessId };
  if (stockStatus) query.stockStatus = stockStatus;
  const products = await Product.find(query).select(
    "name sku quantity stockStatus lowStockThreshold status"
  );
  res.json({ success: true, products });
});

const updateStock = asyncHandler(async (req, res) => {
  const { quantity, lowStockThreshold } = req.body;
  const product = await Product.findOne({ _id: req.params.id, business: req.businessId });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  if (quantity !== undefined) product.quantity = quantity;
  if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;
  await product.save();
  res.json({ success: true, product });
});

const getLowStock = asyncHandler(async (req, res) => {
  const products = await Product.find({
    business: req.businessId,
    stockStatus: { $in: ["low_stock", "out_of_stock"] },
  });
  res.json({ success: true, products });
});

module.exports = { getInventory, updateStock, getLowStock };
