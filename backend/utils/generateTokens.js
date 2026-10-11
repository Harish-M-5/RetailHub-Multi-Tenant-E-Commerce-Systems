const jwt = require("jsonwebtoken");

const signAccessToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, business: user.business, type: "owner" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" }
  );

const signRefreshToken = (user) =>
  jwt.sign({ id: user._id, type: "owner" }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });

const signCustomerAccessToken = (customer) =>
  jwt.sign(
    { id: customer._id, business: customer.business, type: "customer" },
    process.env.CUSTOMER_JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" }
  );

const signCustomerRefreshToken = (customer) =>
  jwt.sign({ id: customer._id, type: "customer" }, process.env.CUSTOMER_JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });

const verifyAccessToken = (token, isCustomer = false) => {
  const secret = isCustomer ? process.env.CUSTOMER_JWT_ACCESS_SECRET : process.env.JWT_ACCESS_SECRET;
  return jwt.verify(token, secret);
};

const verifyRefreshToken = (token, isCustomer = false) => {
  const secret = isCustomer
    ? process.env.CUSTOMER_JWT_REFRESH_SECRET
    : process.env.JWT_REFRESH_SECRET;
  return jwt.verify(token, secret);
};

const msFromExpiry = (expiry) => {
  const match = /^(\d+)([smhd])$/.exec(expiry || "7d");
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * unitMs[unit];
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  signCustomerAccessToken,
  signCustomerRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  msFromExpiry,
};
