require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const http = require("http");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { initSocket } = require("./utils/socket");
const { startPickupSweep } = require("./utils/pickupSweep");

const app = express();

app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Static uploads (used when USE_S3=false)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Tiered rate limiting
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
app.use("/api/", generalLimiter);
app.use("/api/auth/", authLimiter);
app.use("/api/store/:slug/auth", authLimiter);

app.get("/api/health", (req, res) => res.json({ success: true, message: "RetailHub API is running" }));

// ---- Version 1: Foundation MVP ----
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/business", require("./routes/businessRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/products", require("./routes/productRoutes"));

// ---- Version 2: Customer Store ----
app.use("/api/store", require("./routes/storeRoutes"));
app.use("/api/customer", require("./routes/customerProfileRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/checkout", require("./routes/checkoutRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));

// ---- Version 3: Business Operations ----
app.use("/api/owner/orders", require("./routes/ownerOrderRoutes"));
app.use("/api/customers", require("./routes/customerManagementRoutes"));
app.use("/api/inventory", require("./routes/inventoryRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));

// ---- Version 4: Enterprise Features ----
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/staff", require("./routes/staffRoutes"));
app.use("/api/audit-logs", require("./routes/auditLogRoutes"));

// ---- Version 7: Offline sales recording ----
app.use("/api/owner/offline-orders", require("./routes/offlineOrderRoutes"));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);
initSocket(httpServer);

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`RetailHub backend running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
    console.log(`[socket] Real-time server ready on the same port`);
  });
  // Auto-release store-pickup orders that missed their expected pickup
  // date - see utils/pickupSweep.js.
  startPickupSweep();
});

module.exports = app;
