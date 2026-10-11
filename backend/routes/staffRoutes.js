const express = require("express");
const router = express.Router();
const { protect, requireOwner } = require("../middleware/auth");
const { getStaff, createStaff, updateStaff, deleteStaff } = require("../controllers/staffController");

router.use(protect, requireOwner);
router.get("/", getStaff);
router.post("/", createStaff);
router.put("/:id", updateStaff);
router.delete("/:id", deleteStaff);

module.exports = router;
