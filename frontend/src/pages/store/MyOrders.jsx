import { useEffect, useState } from "react";
import { HiCheckCircle, HiXCircle, HiOutlineTruck, HiOutlineCalendar, HiOutlineRefresh } from "react-icons/hi";
import toast from "react-hot-toast";
import customerApi from "../../api/customerAxios";
import { getSocket } from "../../api/socket";

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  packed: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const RETURN_WINDOW_HOURS = 24;

// Labels/colors for the return/refund status line shown once a return has
// been requested - mirrors Order.returnStatus on the backend.
const RETURN_INFO = {
  requested: { label: "Return requested - waiting for the store to review it", color: "text-amber-600" },
  approved: { label: "Return approved - our delivery person will collect the item", color: "text-indigo-600" },
  rejected: { label: "Return request was declined", color: "text-red-600" },
  picked_up: { label: "Item collected and verified - refund is being processed", color: "text-indigo-600" },
  refunded: { label: "Refunded", color: "text-green-600" },
};

function StatusIcon({ status }) {
  if (status === "delivered") return <HiCheckCircle className="text-green-600 text-base" />;
  if (status === "cancelled") return <HiXCircle className="text-red-600 text-base" />;
  if (status === "out_for_delivery") return <HiOutlineTruck className="text-amber-600 text-base" />;
  return null;
}

// Eligible for a return: delivered home-delivery order, no return already
// in progress, and still within the 24-hour window from delivery - mirrors
// the same check in backend/controllers/orderController.js's requestReturn.
function canRequestReturn(order) {
  if (order.deliveryType !== "home_delivery") return false;
  if (order.status !== "delivered" || !order.deliveredAt) return false;
  if (order.returnStatus && order.returnStatus !== "none") return false;
  const hoursSinceDelivery = (Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60);
  return hoursSinceDelivery <= RETURN_WINDOW_HOURS;
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [openReturnFor, setOpenReturnFor] = useState(null);
  const [returnDrafts, setReturnDrafts] = useState({});

  const fetchOrders = () => {
    customerApi.get("/orders").then(({ data }) => setOrders(data.orders)).catch(() => {});
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Real-time tracking: owner moving the order forward, setting a
  // delivery date, verifying payment, or acting on a return all push
  // straight here (see backend/utils/socket.js + ownerOrderController.js)
  // - no refresh needed.
  useEffect(() => {
    const socket = getSocket();

    const onStatus = (payload) => {
      setOrders((prev) =>
        prev.map((o) =>
          o._id === payload.orderId
            ? { ...o, status: payload.status, expectedDeliveryDate: payload.expectedDeliveryDate }
            : o
        )
      );
      toast(`Order ${payload.orderNumber} is now ${payload.status.replace(/_/g, " ")}`, {
        icon: payload.status === "delivered" ? "✅" : payload.status === "cancelled" ? "❌" : "📦",
      });
    };

    const onDeliveryDate = (payload) => {
      setOrders((prev) =>
        prev.map((o) =>
          o._id === payload.orderId
            ? {
                ...o,
                expectedDeliveryDate: payload.expectedDeliveryDate,
                pickupDateConfirmed: payload.pickupDateConfirmed ?? o.pickupDateConfirmed,
              }
            : o
        )
      );
      toast(`Expected delivery date updated for ${payload.orderNumber}`, { icon: "📅" });
    };

    const onPayment = (payload) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === payload.orderId ? { ...o, paymentStatus: payload.paymentStatus } : o))
      );
      toast(`Payment ${payload.paymentStatus} for ${payload.orderNumber}`, { icon: "💳" });
    };

    const onReturn = (payload) => {
      setOrders((prev) =>
        prev.map((o) =>
          o._id === payload.orderId
            ? {
                ...o,
                returnStatus: payload.returnStatus,
                returnRejectReason: payload.returnRejectReason ?? o.returnRejectReason,
                refundAmount: payload.refundAmount ?? o.refundAmount,
              }
            : o
        )
      );
      toast(`${payload.orderNumber}: ${RETURN_INFO[payload.returnStatus]?.label || payload.returnStatus}`, {
        icon: payload.returnStatus === "refunded" ? "💰" : payload.returnStatus === "rejected" ? "❌" : "🔄",
      });
    };

    socket.on("order:status", onStatus);
    socket.on("order:delivery-date", onDeliveryDate);
    socket.on("order:payment", onPayment);
    socket.on("order:return", onReturn);
    return () => {
      socket.off("order:status", onStatus);
      socket.off("order:delivery-date", onDeliveryDate);
      socket.off("order:payment", onPayment);
      socket.off("order:return", onReturn);
    };
  }, []);

  const submitReturn = async (order) => {
    const draft = returnDrafts[order._id] || {};
    if (!draft.reason || !draft.reason.trim()) {
      toast.error("Please tell us why you're returning this order");
      return;
    }
    if (order.paymentMethod === "upi" && (!draft.upiId || !draft.upiId.trim())) {
      toast.error("Please enter the UPI ID the refund should go to");
      return;
    }
    try {
      await customerApi.patch(`/orders/${order._id}/return`, { reason: draft.reason, upiId: draft.upiId });
      toast.success("Return requested - the store will review it shortly");
      setOpenReturnFor(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to request return");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">My Orders</h1>
      {orders.length === 0 && <p className="text-gray-500">You haven't placed any orders yet.</p>}
      {orders.map((order) => {
        const returnInfo = order.returnStatus && order.returnStatus !== "none" ? RETURN_INFO[order.returnStatus] : null;
        const eligibleForReturn = canRequestReturn(order);

        return (
          <div key={order._id} className="store-card p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{order.orderNumber}</p>
                <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>
                <StatusIcon status={order.status} />
                {order.status.replace(/_/g, " ")}
              </span>
            </div>

            {(order.deliveryType === "home_delivery" || order.deliveryType === "store_pickup") &&
              order.status !== "cancelled" &&
              order.status !== "delivered" && (
                <div className="mt-3 flex items-center gap-2 bg-amber-50 dark:bg-gray-800/60 rounded-lg p-2.5 text-sm">
                  <HiOutlineCalendar className="text-amber-600 shrink-0" />
                  {order.deliveryType === "store_pickup" ? (
                    order.expectedDeliveryDate ? (
                      <span>
                        Please collect between{" "}
                        {order.pickupWindowStart
                          ? new Date(order.pickupWindowStart).toLocaleDateString()
                          : "now"}{" "}
                        and {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                        {order.pickupDateConfirmed ? " (confirmed by the store)" : " - awaiting store confirmation"} -
                        after the end date your order may be released back to stock.
                      </span>
                    ) : (
                      "Choose a pickup date range to reserve this order"
                    )
                  ) : order.expectedDeliveryDate ? (
                    `Expected delivery: ${new Date(order.expectedDeliveryDate).toLocaleDateString()}`
                  ) : (
                    "Delivery date will be updated by the store soon"
                  )}
                </div>
              )}

            <div className="mt-3 space-y-1">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.name} x {item.quantity}</span>
                  <span>₹{item.subtotal}</span>
                </div>
              ))}
            </div>

            <div className="mt-2 text-xs text-gray-500 flex justify-between">
              <span>Subtotal: ₹{order.subtotal}</span>
              {order.deliveryCharge > 0 && <span>Delivery: ₹{order.deliveryCharge}</span>}
            </div>

            <div className="mt-2 flex justify-between font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
              <span>Total</span>
              <span className="text-storeteal-700 dark:text-storeteal-400">₹{order.total}</span>
            </div>

            {order.paymentMethod === "upi" && (
              <p className={`text-xs mt-1 ${order.paymentStatus === "partial" ? "text-red-500" : "text-gray-500"}`}>
                Payment: {order.paymentStatus}
                {order.paymentStatus === "partial" && ` (paid ₹${order.amountPaid} of ₹${order.total})`}
              </p>
            )}

            {/* Return/refund flow - home delivery only, within 24h of delivery.
                See backend/controllers/orderController.js's requestReturn. */}
            {returnInfo && (
              <div className="mt-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg p-2.5 text-sm space-y-1">
                <p className={`flex items-center gap-2 font-medium ${returnInfo.color}`}>
                  <HiOutlineRefresh className="shrink-0" /> {returnInfo.label}
                </p>
                {order.returnReason && <p className="text-xs text-gray-500">Reason: {order.returnReason}</p>}
                {order.returnStatus === "rejected" && order.returnRejectReason && (
                  <p className="text-xs text-gray-500">Store's note: {order.returnRejectReason}</p>
                )}
                {order.returnStatus === "refunded" && (
                  <p className="text-xs text-gray-500">Refunded ₹{order.refundAmount || order.total}</p>
                )}
              </div>
            )}

            {eligibleForReturn && openReturnFor !== order._id && (
              <button
                onClick={() => setOpenReturnFor(order._id)}
                className="mt-3 text-sm text-storeteal-700 dark:text-storeteal-400 font-medium hover:underline"
              >
                Return this order
              </button>
            )}

            {eligibleForReturn && openReturnFor === order._id && (
              <div className="mt-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3 space-y-2">
                <p className="text-xs text-gray-500">Returns must be requested within 24 hours of delivery.</p>
                <textarea
                  className="store-input text-sm w-full"
                  rows={2}
                  placeholder="Why are you returning this order?"
                  value={returnDrafts[order._id]?.reason || ""}
                  onChange={(e) =>
                    setReturnDrafts((d) => ({ ...d, [order._id]: { ...d[order._id], reason: e.target.value } }))
                  }
                />
                {order.paymentMethod === "upi" && (
                  <input
                    type="text"
                    className="store-input text-sm w-full"
                    placeholder="Your UPI ID (for the refund)"
                    value={returnDrafts[order._id]?.upiId || ""}
                    onChange={(e) =>
                      setReturnDrafts((d) => ({ ...d, [order._id]: { ...d[order._id], upiId: e.target.value } }))
                    }
                  />
                )}
                <div className="flex gap-2">
                  <button onClick={() => submitReturn(order)} className="store-btn-primary text-sm py-1.5 px-4">
                    Submit Return Request
                  </button>
                  <button onClick={() => setOpenReturnFor(null)} className="text-sm text-gray-500 hover:underline">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
