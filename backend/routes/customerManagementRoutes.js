const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/auth");
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customerManagementController");

router.use(protect);
// Staff can look up customer records (to handle orders/support) but can't
// create, edit or delete customer accounts - that stays with owner/manager.
// Delivery-role accounts have no business here at all (CRM data isn't part
// of their scope - just deliveries/returns plus read-only products).
router.get("/", requireRole("owner", "manager", "staff"), getCustomers);
router.get("/:id", requireRole("owner", "manager", "staff"), getCustomer);
router.post("/", requireRole("owner", "manager"), createCustomer);
router.put("/:id", requireRole("owner", "manager"), updateCustomer);
router.delete("/:id", requireRole("owner", "manager"), deleteCustomer);

module.exports = router;
