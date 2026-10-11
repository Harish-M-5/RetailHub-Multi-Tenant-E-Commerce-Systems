const asyncHandler = require("express-async-handler");
const Notification = require("../models/Notification");

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ business: req.businessId })
    .sort({ createdAt: -1 })
    .limit(50);
  const unreadCount = await Notification.countDocuments({ business: req.businessId, isRead: false });
  res.json({ success: true, notifications, unreadCount });
});

const markAsRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, business: req.businessId },
    { isRead: true }
  );
  res.json({ success: true });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ business: req.businessId, isRead: false }, { isRead: true });
  res.json({ success: true });
});

module.exports = { getNotifications, markAsRead, markAllAsRead };
