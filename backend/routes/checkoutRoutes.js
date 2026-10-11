const express = require("express");
const router = express.Router();
const { protectCustomer } = require("../middleware/customerAuth");
const { placeOrder } = require("../controllers/checkoutController");

router.use(protectCustomer);
router.post("/", placeOrder);

module.exports = router;
