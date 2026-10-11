const asyncHandler = require("express-async-handler");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Business = require("../models/Business");
const RefreshToken = require("../models/RefreshToken");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  msFromExpiry,
} = require("../utils/generateTokens");
const { generateBusinessId, generateStoreSlug } = require("../utils/generateBusinessId");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const setRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    // In production, Vercel (frontend) and Render (backend) are different
    // domains, so the cookie must be "none" + secure to be sent cross-site.
    // Locally everything is same-site (via the Vite proxy), so "lax" is fine.
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: msFromExpiry(process.env.JWT_REFRESH_EXPIRES),
    path: "/api/auth",
  });
};

const issueTokensForOwner = async (user, res) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await RefreshToken.create({
    token: refreshToken,
    userType: "owner",
    ownerUser: user._id,
    business: user.business,
    expiresAt: new Date(Date.now() + msFromExpiry(process.env.JWT_REFRESH_EXPIRES)),
  });

  setRefreshCookie(res, refreshToken);
  return accessToken;
};

// @desc Register a new business owner + business
// @route POST /api/auth/register
const registerOwner = asyncHandler(async (req, res) => {
  const {
    ownerName,
    businessName,
    businessType,
    email,
    phone,
    password,
    businessAddress,
    city,
    state,
    pincode,
    gstNumber,
    description,
  } = req.body;

  if (!ownerName || !businessName || !businessType || !email || !phone || !password) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(409);
    throw new Error("An account with this email already exists");
  }

  // FIX (bug: "Path `owner` is required"):
  // Business.owner is a required field, so the User MUST be created first,
  // and the real user._id passed in when creating the Business. The
  // original broken flow created the Business first with owner: null
  // (Mongoose treats null the same as "missing" for a required ObjectId
  // field), which failed validation on every single registration attempt.
  const user = await User.create({
    ownerName,
    email: normalizedEmail,
    phone,
    password,
    role: "owner",
  });

  const businessId = await generateBusinessId();
  const storeSlug = await generateStoreSlug(businessName);

  let business;
  try {
    business = await Business.create({
      owner: user._id,
      businessId,
      businessName,
      businessType,
      storeSlug,
      email: normalizedEmail,
      phone,
      address: businessAddress,
      city,
      state,
      pincode,
      gstNumber: gstNumber || "",
      description: description || "",
    });
  } catch (err) {
    // Roll back the user if business creation fails, so we never leave an
    // orphan owner account with no business behind.
    await User.findByIdAndDelete(user._id);
    throw err;
  }

  user.business = business._id;
  await user.save();

  const accessToken = await issueTokensForOwner(user, res);

  res.status(201).json({
    success: true,
    accessToken,
    user: {
      id: user._id,
      ownerName: user.ownerName,
      email: user.email,
      role: user.role,
    },
    business,
  });
});

// @desc Login owner
// @route POST /api/auth/login
const loginOwner = asyncHandler(async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password");
  }

  const user = await User.findOne({ email }).select("+password").populate("business");
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error("This account has been deactivated");
  }

  user.lastLogin = new Date();
  await user.save();

  const accessToken = await issueTokensForOwner(user, res);

  res.json({
    success: true,
    accessToken,
    user: {
      id: user._id,
      ownerName: user.ownerName,
      email: user.email,
      role: user.role,
    },
    business: user.business,
  });
});

// @desc Refresh owner access token
// @route POST /api/auth/refresh
const refreshOwnerToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401);
    throw new Error("No refresh token provided");
  }

  const stored = await RefreshToken.findOne({ token, userType: "owner", revoked: false });
  if (!stored) {
    res.status(401);
    throw new Error("Refresh token invalid or expired");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token, false);
  } catch (err) {
    res.status(401);
    throw new Error("Refresh token invalid or expired");
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    res.status(401);
    throw new Error("User not found");
  }

  const accessToken = signAccessToken(user);
  res.json({ success: true, accessToken });
});

// @desc Logout owner
// @route POST /api/auth/logout
const logoutOwner = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await RefreshToken.updateOne({ token }, { revoked: true });
  }
  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.json({ success: true, message: "Logged out" });
});

// @desc Google OAuth login for EXISTING owners only
// @route POST /api/auth/google
const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    res.status(400);
    throw new Error("Google idToken is required");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const email = payload.email.toLowerCase();

  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] }).populate(
    "business"
  );

  if (!user) {
    // We never auto-create a Business from Google data alone - a Business
    // requires businessName/type/address/etc which Google can't provide.
    return res.status(404).json({
      success: false,
      needsRegistration: true,
      message: "No account found for this Google email. Please register your business first.",
      googleEmail: email,
      googleName: payload.name,
    });
  }

  if (!user.googleId) {
    user.googleId = payload.sub;
    await user.save();
  }

  const accessToken = await issueTokensForOwner(user, res);

  res.json({
    success: true,
    accessToken,
    user: { id: user._id, ownerName: user.ownerName, email: user.email, role: user.role },
    business: user.business,
  });
});

module.exports = { registerOwner, loginOwner, refreshOwnerToken, logoutOwner, googleLogin };
