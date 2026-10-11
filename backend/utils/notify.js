const Notification = require("../models/Notification");
const { emitToOwner } = require("./socket");

const notifyOwner = async ({ business, type, title, message, relatedOrder, relatedProduct }) => {
  try {
    const notification = await Notification.create({ business, type, title, message, relatedOrder, relatedProduct });
    // Push it live to the owner dashboard (NotificationBell) - the DB write
    // above is the source of truth, this just avoids waiting for the next
    // poll/page-load to see it.
    emitToOwner(business, "notification:new", notification);
  } catch (err) {
    console.error("[notify] Failed to create notification:", err.message);
  }
};

module.exports = { notifyOwner };
