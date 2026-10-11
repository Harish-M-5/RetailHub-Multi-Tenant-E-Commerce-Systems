const asyncHandler = require("express-async-handler");
const Category = require("../models/Category");

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ business: req.businessId }).sort({ name: 1 });
  res.json({ success: true, categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, image } = req.body;
  if (!name) {
    res.status(400);
    throw new Error("Category name is required");
  }
  const category = await Category.create({ business: req.businessId, name, description, image });
  res.status(201).json({ success: true, category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOneAndUpdate(
    { _id: req.params.id, business: req.businessId },
    req.body,
    { new: true }
  );
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  res.json({ success: true, category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOneAndDelete({
    _id: req.params.id,
    business: req.businessId,
  });
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  res.json({ success: true, message: "Category deleted" });
});

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
