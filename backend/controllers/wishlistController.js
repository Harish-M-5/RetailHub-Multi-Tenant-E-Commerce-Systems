const asyncHandler = require("express-async-handler");
const Customer = require("../models/Customer");

const getWishlist = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.customer._id).populate(
    "wishlist",
    "name images finalPrice price discount stockStatus deliveryType"
  );
  res.json({ success: true, wishlist: customer.wishlist });
});

const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const customer = await Customer.findById(req.customer._id);
  if (!customer.wishlist.includes(productId)) {
    customer.wishlist.push(productId);
    await customer.save();
  }
  await customer.populate("wishlist", "name images finalPrice price discount stockStatus deliveryType");
  res.status(201).json({ success: true, wishlist: customer.wishlist });
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.customer._id);
  customer.wishlist = customer.wishlist.filter((id) => id.toString() !== req.params.productId);
  await customer.save();
  await customer.populate("wishlist", "name images finalPrice price discount stockStatus deliveryType");
  res.json({ success: true, wishlist: customer.wishlist });
});

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
