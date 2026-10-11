const asyncHandler = require("express-async-handler");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ business: req.businessId, customer: req.customer._id }).populate(
    "items.product",
    "name images price finalPrice discount stockStatus deliveryType quantity"
  );
  if (!cart) {
    cart = await Cart.create({ business: req.businessId, customer: req.customer._id, items: [] });
  }
  res.json({ success: true, cart });
});

const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  const product = await Product.findOne({ _id: productId, business: req.businessId, status: "active" });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  if (product.deliveryType === "offline_only") {
    res.status(400);
    throw new Error("This product is available only in-store and cannot be ordered online");
  }

  let cart = await Cart.findOne({ business: req.businessId, customer: req.customer._id });
  if (!cart) {
    cart = await Cart.create({ business: req.businessId, customer: req.customer._id, items: [] });
  }

  const existingItem = cart.items.find((i) => i.product.toString() === productId);
  if (existingItem) {
    existingItem.quantity += Number(quantity);
  } else {
    cart.items.push({ product: productId, quantity: Number(quantity) });
  }
  await cart.save();
  await cart.populate("items.product", "name images price finalPrice discount stockStatus deliveryType quantity");

  res.status(201).json({ success: true, cart });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const cart = await Cart.findOne({ business: req.businessId, customer: req.customer._id });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  const item = cart.items.find((i) => i.product.toString() === req.params.productId);
  if (!item) {
    res.status(404);
    throw new Error("Item not found in cart");
  }

  if (quantity <= 0) {
    cart.items = cart.items.filter((i) => i.product.toString() !== req.params.productId);
  } else {
    item.quantity = quantity;
  }
  await cart.save();
  await cart.populate("items.product", "name images price finalPrice discount stockStatus deliveryType quantity");
  res.json({ success: true, cart });
});

const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ business: req.businessId, customer: req.customer._id });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }
  cart.items = cart.items.filter((i) => i.product.toString() !== req.params.productId);
  await cart.save();
  res.json({ success: true, cart });
});

const clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate({ business: req.businessId, customer: req.customer._id }, { items: [] });
  res.json({ success: true, message: "Cart cleared" });
});

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
