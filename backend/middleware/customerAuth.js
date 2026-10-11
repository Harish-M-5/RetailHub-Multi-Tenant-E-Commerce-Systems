const asyncHandler = require("express-async-handler");
const { verifyAccessToken } = require("../utils/generateTokens");
const Customer = require("../models/Customer");

const protectCustomer = asyncHandler(async (req, res, next) => {
  let token;
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token provided");
  }

  try {
    const decoded = verifyAccessToken(token, true);
    if (decoded.type !== "customer") {
      res.status(401);
      throw new Error("Invalid token type");
    }

    const customer = await Customer.findById(decoded.id);
    if (!customer || !customer.isActive) {
      res.status(401);
      throw new Error("Not authorized, customer not found");
    }

    req.customer = customer;
    req.businessId = customer.business;
    next();
  } catch (err) {
    res.status(401);
    throw new Error("Not authorized, invalid or expired token");
  }
});

module.exports = { protectCustomer };
