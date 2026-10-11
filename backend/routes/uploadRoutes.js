const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const upload = require("../middleware/upload");
const { uploadImage } = require("../controllers/uploadController");
const { verifyAccessToken } = require("../utils/generateTokens");

// Accepts EITHER an owner token OR a customer token (owners upload
// logo/banner/QR images, customers upload payment screenshots).
const flexibleAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  const token = header && header.startsWith("Bearer ") ? header.split(" ")[1] : null;
  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token provided");
  }

  try {
    const ownerDecoded = verifyAccessToken(token, false);
    if (ownerDecoded.type === "owner") return next();
  } catch (err) {
    // fall through and try customer token
  }

  try {
    const customerDecoded = verifyAccessToken(token, true);
    if (customerDecoded.type === "customer") return next();
  } catch (err) {
    // fall through to 401 below
  }

  res.status(401);
  throw new Error("Not authorized, invalid or expired token");
});

router.post("/image", flexibleAuth, upload.single("image"), uploadImage);

module.exports = router;
