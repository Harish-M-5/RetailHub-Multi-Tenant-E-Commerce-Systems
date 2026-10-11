const asyncHandler = require("express-async-handler");
const Customer = require("../models/Customer");
const RefreshToken = require("../models/RefreshToken");
const { resolveBusiness } = require("./storeController");
const {
  signCustomerAccessToken,
  signCustomerRefreshToken,
  verifyRefreshToken,
  msFromExpiry,
} = require("../utils/generateTokens");

const setCustomerRefreshCookie = (res, token) => {
  res.cookie("customerRefreshToken", token, {
    httpOnly: true,
    // See authController.js for why this differs between prod (cross-site,
    // Vercel + Render) and local dev (same-site, via the Vite proxy).
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: msFromExpiry(process.env.JWT_REFRESH_EXPIRES),
    path: "/api",
  });
};

const issueTokensForCustomer = async (customer, res) => {
  const accessToken = signCustomerAccessToken(customer);
  const refreshToken = signCustomerRefreshToken(customer);

  await RefreshToken.create({
    token: refreshToken,
    userType: "customer",
    customerUser: customer._id,
    business: customer.business,
    expiresAt: new Date(Date.now() + msFromExpiry(process.env.JWT_REFRESH_EXPIRES)),
  });

  setCustomerRefreshCookie(res, refreshToken);
  return accessToken;
};

// @desc Register a customer for a specific store
// @route POST /api/store/:slug/auth/register
//
// BUG FIX NOTE ("already registered" for every email):
// The real root cause was a STALE MongoDB index left over on the
// `customers` collection from an earlier schema iteration - a legacy
// single-field unique index on `email` (global), instead of the intended
// compound `{business, email}` unique index (per-store). That stale index
// made MongoDB reject inserts as duplicates across ALL businesses, not
// just within one store, no matter what email was used. This is now fixed
// permanently at the source: config/db.js calls `Customer.syncIndexes()`
// on every server startup, which drops any index no longer defined in the
// schema (the stale single-field index) and (re)creates the correct
// compound index. The application-level normalization and race-condition
// handling below are kept as defense-in-depth, not as the primary fix.
const registerCustomer = asyncHandler(async (req, res) => {
  const business = await resolveBusiness(req.params.slug);
  if (!business) {
    res.status(404);
    throw new Error("Store not found");
  }

  const { name, phone, password } = req.body;
  const email = (req.body.email || "").trim().toLowerCase();

  if (!name || !email || !phone || !password) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }

  const existing = await Customer.findOne({ business: business._id, email });
  if (existing) {
    res.status(409);
    throw new Error("An account with this email already exists for this store");
  }

  let customer;
  try {
    customer = await Customer.create({ business: business._id, name, email, phone, password });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409);
      throw new Error("An account with this email already exists for this store");
    }
    throw err;
  }

  const accessToken = await issueTokensForCustomer(customer, res);

  res.status(201).json({
    success: true,
    accessToken,
    customer: {
      id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
  });
});

// @desc Login a customer for a specific store
// @route POST /api/store/:slug/auth/login
const loginCustomer = asyncHandler(async (req, res) => {
  const business = await resolveBusiness(req.params.slug);
  if (!business) {
    res.status(404);
    throw new Error("Store not found");
  }

  const email = (req.body.email || "").trim().toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password");
  }

  const customer = await Customer.findOne({ business: business._id, email }).select("+password");
  if (!customer || !(await customer.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (!customer.isActive) {
    res.status(403);
    throw new Error("This account has been deactivated");
  }

  const accessToken = await issueTokensForCustomer(customer, res);

  res.json({
    success: true,
    accessToken,
    customer: {
      id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
  });
});

// @desc Refresh customer access token
// @route POST /api/store/:slug/auth/refresh
const refreshCustomerToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.customerRefreshToken;
  if (!token) {
    res.status(401);
    throw new Error("No refresh token provided");
  }

  const stored = await RefreshToken.findOne({ token, userType: "customer", revoked: false });
  if (!stored) {
    res.status(401);
    throw new Error("Refresh token invalid or expired");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token, true);
  } catch (err) {
    res.status(401);
    throw new Error("Refresh token invalid or expired");
  }

  const customer = await Customer.findById(decoded.id);
  if (!customer || !customer.isActive) {
    res.status(401);
    throw new Error("Customer not found");
  }

  const accessToken = signCustomerAccessToken(customer);
  res.json({ success: true, accessToken });
});

// @desc Logout customer
// @route POST /api/store/:slug/auth/logout
const logoutCustomer = asyncHandler(async (req, res) => {
  const token = req.cookies?.customerRefreshToken;
  if (token) {
    await RefreshToken.updateOne({ token }, { revoked: true });
  }
  res.clearCookie("customerRefreshToken", { path: "/api" });
  res.json({ success: true, message: "Logged out" });
});

module.exports = { registerCustomer, loginCustomer, refreshCustomerToken, logoutCustomer };
