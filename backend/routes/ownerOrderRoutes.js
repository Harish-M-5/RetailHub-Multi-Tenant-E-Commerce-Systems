const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/auth");
const {
  getOrders,
  getOrder,
  updateOrderStatus,
  confirmDeliveryStatus,
  verifyPayment,
  updateExpectedDelivery,
  assignDeliveryBoy,
  markPickupCollected,
  releasePickup,
  decideReturn,
  markReturnPickedUp,
  confirmReturnPickup,
  refundReturn,
} = require("../controllers/ownerOrderController");

router.use(protect);
// Staff and the delivery role can see and progress orders (that's their
// day-to-day job - updateOrderStatus itself further restricts what a
// "delivery" user can move an order to), but verifying a payment
// (confirming real money was received), setting the expected
// delivery/pickup date, and deciding/refunding a return (all
// money/commitment decisions) stay with owner/manager only. Marking a
// return as physically collected is the one return step the delivery role
// also does.
router.get("/", getOrders);
router.get("/:id", getOrder);
router.patch("/:id/status", updateOrderStatus);
// Owner/manager reviews & confirms a delivery person's staged status
// change before it reaches the customer - see updateOrderStatus's
// "delivery" role branch and confirmDeliveryStatus.
router.patch("/:id/confirm-delivery-status", requireRole("owner", "manager"), confirmDeliveryStatus);
router.patch("/:id/delivery-date", requireRole("owner", "manager", "staff"), updateExpectedDelivery);
router.patch("/:id/assign-delivery", requireRole("owner", "manager"), assignDeliveryBoy);
// Store pickup's own finish lines - no confirm/packed/out-for-delivery
// flow for pickup orders, just "they came and got it" or "time's up,
// releasing the stock".
router.patch("/:id/pickup/collected", requireRole("owner", "manager"), markPickupCollected);
router.patch("/:id/pickup/release", requireRole("owner", "manager"), releasePickup);
router.patch("/:id/verify-payment", requireRole("owner", "manager"), verifyPayment);
router.patch("/:id/return/decide", requireRole("owner", "manager"), decideReturn);
router.patch("/:id/return/picked-up", requireRole("owner", "manager", "delivery"), markReturnPickedUp);
router.patch("/:id/return/confirm-pickup", requireRole("owner", "manager"), confirmReturnPickup);
router.patch("/:id/return/refund", requireRole("owner", "manager"), refundReturn);

module.exports = router;
