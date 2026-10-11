const express = require("express");
const router = express.Router();
const { getStoreInfo, getStoreCategories, getStoreProducts, getStoreProduct } = require("../controllers/storeController");
const { registerCustomer, loginCustomer, refreshCustomerToken, logoutCustomer } = require("../controllers/customerAuthController");

// Public storefront (no auth required)
router.get("/:slug", getStoreInfo);
router.get("/:slug/categories", getStoreCategories);
router.get("/:slug/products", getStoreProducts);
router.get("/:slug/products/:productId", getStoreProduct);

// Customer auth, scoped to this store's slug
router.post("/:slug/auth/register", registerCustomer);
router.post("/:slug/auth/login", loginCustomer);
router.post("/:slug/auth/refresh", refreshCustomerToken);
router.post("/:slug/auth/logout", logoutCustomer);

module.exports = router;
