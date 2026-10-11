const { Server } = require("socket.io");

/**
 * Real-time layer for RetailHub.
 *
 * Rooms:
 *  - `business:<businessId>`              -> the OWNER dashboard (and any
 *    staff/manager logged into it) for that business. Used for: new order,
 *    order status changed, payment status changed/verified.
 *  - `business:<businessId>:customer:<id>` -> one specific customer's own
 *    browser tab(s) on the storefront. Used for: their order's status
 *    changed, expected delivery date set/updated, payment confirmed.
 *
 * Nothing here replaces the REST API - every event is a "go re-fetch /
 * here's the fresh object" push so the UI updates live without the
 * customer or owner needing to refresh the page.
 */
let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("join:owner", ({ businessId }) => {
      if (businessId) socket.join(`business:${businessId}`);
    });

    socket.on("join:customer", ({ businessId, customerId }) => {
      if (businessId && customerId) {
        socket.join(`business:${businessId}:customer:${customerId}`);
      }
    });

    socket.on("disconnect", () => {});
  });

  return io;
};

const getIO = () => io;

// Safe helpers - never throw if sockets aren't initialized (e.g. tests),
// just skip the push; the REST data is always the source of truth.
const emitToOwner = (businessId, event, payload) => {
  if (!io || !businessId) return;
  io.to(`business:${businessId}`).emit(event, payload);
};

const emitToCustomer = (businessId, customerId, event, payload) => {
  if (!io || !businessId || !customerId) return;
  io.to(`business:${businessId}:customer:${customerId}`).emit(event, payload);
};

module.exports = { initSocket, getIO, emitToOwner, emitToCustomer };
