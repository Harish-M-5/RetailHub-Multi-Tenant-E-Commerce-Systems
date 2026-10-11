const express = require("express");
const router = express.Router();
const { registerOwner, loginOwner, refreshOwnerToken, logoutOwner, googleLogin } = require("../controllers/authController");

router.post("/register", registerOwner);
router.post("/login", loginOwner);
router.post("/refresh", refreshOwnerToken);
router.post("/logout", logoutOwner);
router.post("/google", googleLogin);

module.exports = router;
