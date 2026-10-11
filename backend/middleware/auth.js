const asyncHandler = require("express-async-handler");
const { verifyAccessToken } = require("../utils/generateTokens");
const User = require("../models/User");

const protect = asyncHandler(async (req, res, next) => {
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
    const decoded = verifyAccessToken(token, false);
    if (decoded.type !== "owner") {
      res.status(401);
      throw new Error("Invalid token type");
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401);
      throw new Error("Not authorized, user not found");
    }

    req.user = user;
    req.businessId = user.business;
    next();
  } catch (err) {
    res.status(401);
    throw new Error("Not authorized, invalid or expired token");
  }
});

const requireOwner = (req, res, next) => {
  if (req.user?.role !== "owner") {
    res.status(403);
    throw new Error("Only the business owner can perform this action");
  }
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403);
    throw new Error("You do not have permission to perform this action");
  }
  next();
};

module.exports = { protect, requireOwner, requireRole };
