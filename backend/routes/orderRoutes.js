const express = require("express");
const router = express.Router();
const { protectCustomer } = require("../middleware/customerAuth");
const { getMyOrders, getMyOrder, requestReturn } = require("../controllers/orderController");

router.use(protectCustomer);
router.get("/", getMyOrders);
router.get("/:id", getMyOrder);
router.patch("/:id/return", requestReturn);

module.exports = router;
