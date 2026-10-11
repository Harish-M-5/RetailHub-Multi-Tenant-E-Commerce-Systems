const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getNotifications, markAsRead, markAllAsRead } = require("../controllers/notificationController");

router.use(protect);
router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);
router.patch("/read-all", markAllAsRead);

module.exports = router;
