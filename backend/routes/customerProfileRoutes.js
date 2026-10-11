const express = require("express");
const router = express.Router();
const { protectCustomer } = require("../middleware/customerAuth");
const { getMyProfile, updateMyProfile, addAddress, deleteAddress } = require("../controllers/customerProfileController");

router.use(protectCustomer);
router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.post("/addresses", addAddress);
router.delete("/addresses/:addressId", deleteAddress);

module.exports = router;
