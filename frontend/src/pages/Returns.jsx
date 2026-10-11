import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { HiOutlineRefresh, HiCheckCircle, HiXCircle, HiOutlineTruck } from "react-icons/hi";
import api from "../api/axios";
import { getSocket } from "../api/socket";

// Return/refund flow for home-delivery orders (store-pickup has no
// delivery stage, so returns don't apply to it): customer requests within
// 24h of delivery -> owner approves/rejects -> delivery person collects
// the item and the owner confirms it's correct -> owner refunds (cash in
// person for COD, or manually to the customer's UPI ID for online
// payments). See backend/controllers/orderController.js (requestReturn)
// and ownerOrderController.js (decideReturn/markReturnPickedUp/refundReturn).
const TABS = [
  { key: "requested", label: "Awaiting Approval" },
  { key: "approved", label: "Awaiting Pickup" },
  { key: "picked_up", label: "Awaiting Refund" },
  { key: "refunded", label: "Refunded" },
  { key: "rejected", label: "Rejected" },
];

export default function Returns() {
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("requested");
  const [amountDrafts, setAmountDrafts] = useState({});
  const [deliveryBoys, setDeliveryBoys] = useState([]);

  const fetchOrders = () => {
    api.get("/owner/orders", { params: { limit: 200 } }).then(({ data }) => {
      setOrders(data.orders.filter((o) => o.returnStatus && o.returnStatus !== "none"));
    });
  };

  useEffect(() => {
    fetchOrders();
    api.get("/staff").then(({ data }) => setDeliveryBoys(data.staff.filter((s) => s.role === "delivery"))).catch(() => {});
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on("order:changed", fetchOrders);
    socket.on("notification:new", fetchOrders);
    return () => {
      socket.off("order:changed", fetchOrders);
      socket.off("notification:new", fetchOrders);
    };
  }, []);

  const decide = async (order, action) => {
    let rejectReason;
    if (action === "reject") {
      rejectReason = window.prompt("Reason for rejecting this return:") || undefined;
    }
    try {
      await api.patch(`/owner/orders/${order._id}/return/decide`, { action, rejectReason });
      toast.success(action === "approve" ? "Return approved" : "Return rejected");
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update return");
    }
  };

  const markPickedUp = async (order) => {
    try {
      await api.patch(`/owner/orders/${order._id}/return/picked-up`);
      toast.success("Marked as collected & verified");
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update return");
    }
  };

  // Confirms a delivery person's staged "collected & verified" mark - only
  // now does returnStatus actually move to picked_up and the customer get
  // told (see backend/controllers/ownerOrderController.js's confirmReturnPickup).
  const confirmPickup = async (order) => {
    try {
      await api.patch(`/owner/orders/${order._id}/return/confirm-pickup`);
      toast.success("Customer notified");
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to confirm the update");
    }
  };

  // Which delivery person should go collect this returned item - reuses
  // the same assignedDeliveryBoy field the Orders page uses for the
  // delivery itself, so it can be set/changed here too (the Orders page
  // only shows it while the order isn't yet delivered, which it already is
  // by the time a return comes in).
  const assignDeliveryBoy = async (order, deliveryBoyId) => {
    try {
      await api.patch(`/owner/orders/${order._id}/assign-delivery`, { deliveryBoyId: deliveryBoyId || null });
      toast.success(deliveryBoyId ? "Delivery person assigned" : "Delivery person unassigned");
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign delivery person");
    }
  };

  const confirmRefund = async (order) => {
    const amount = amountDrafts[order._id] ?? order.total;
    try {
      await api.patch(`/owner/orders/${order._id}/return/refund`, { refundAmount: amount });
      toast.success(`Refund confirmed for ${order.orderNumber} - Today's Sales will update`);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to confirm refund");
    }
  };

  const counts = Object.fromEntries(TABS.map((t) => [t.key, orders.filter((o) => o.returnStatus === t.key).length]));
  const visible = orders.filter((o) => o.returnStatus === tab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><HiOutlineRefresh /> Returns</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Customer return/refund requests for home-delivery orders - requested within 24 hours of delivery.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${tab === t.key ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
          >
            {t.label} ({counts[t.key] || 0})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((order) => (
          <div key={order._id} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{order.orderNumber}</p>
                <p className="text-sm text-gray-500">
                  {order.shippingAddress?.name || order.customer?.name} · {order.shippingAddress?.phone || order.customer?.phone}
                </p>
              </div>
              <span className="font-bold">₹{order.total}</span>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-gray-400">Reason:</span> {order.returnReason}</p>
              <p className="text-gray-500">
                Requested {order.returnRequestedAt ? new Date(order.returnRequestedAt).toLocaleString() : ""} ·{" "}
                {order.paymentMethod === "upi" ? `Refund to UPI: ${order.returnUpiId}` : "Refund: Cash"}
              </p>
              {order.returnStatus === "rejected" && order.returnRejectReason && (
                <p className="text-red-600">Rejected: {order.returnRejectReason}</p>
              )}
              {order.returnStatus === "refunded" && (
                <p className="text-green-600 font-medium">Refunded ₹{order.refundAmount || order.total}</p>
              )}
            </div>

            {/* Who should go collect this returned item - reassignable here
                even after the order was already delivered (the Orders page
                only shows this dropdown before delivery). */}
            {(order.returnStatus === "approved" || order.returnStatus === "requested") && (
              <div className="flex items-center gap-2 bg-indigo-50 dark:bg-gray-800/60 rounded-lg p-3">
                <HiOutlineTruck className="text-indigo-600 shrink-0" />
                <label className="text-sm text-gray-600 dark:text-gray-400">Delivery person for pickup:</label>
                <select
                  className="input text-sm py-1"
                  value={order.assignedDeliveryBoy || ""}
                  onChange={(e) => assignDeliveryBoy(order, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {deliveryBoys.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.ownerName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 items-center flex-wrap">
              {order.returnStatus === "requested" && (
                <>
                  <button onClick={() => decide(order, "approve")} className="btn-primary text-sm">
                    <HiCheckCircle className="inline mr-1" /> Approve
                  </button>
                  <button
                    onClick={() => decide(order, "reject")}
                    className="btn-secondary text-sm !text-red-600 !border-red-300 hover:!bg-red-50"
                  >
                    <HiXCircle className="inline mr-1" /> Reject
                  </button>
                </>
              )}
              {order.returnStatus === "approved" && !order.returnPendingPickup && (
                <button onClick={() => markPickedUp(order)} className="btn-primary text-sm">
                  Mark Item Collected &amp; Verified
                </button>
              )}
              {order.returnStatus === "approved" && order.returnPendingPickup && (
                <div className="flex items-center gap-2 flex-wrap bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">
                    Delivery person marked this as collected &amp; verified - confirm to notify the customer.
                  </span>
                  <button onClick={() => confirmPickup(order)} className="btn-primary text-sm py-1">
                    Confirm &amp; Notify Customer
                  </button>
                </div>
              )}
              {order.returnStatus === "picked_up" && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="input text-sm py-1 w-24"
                    placeholder={`${order.total}`}
                    onChange={(e) => setAmountDrafts((d) => ({ ...d, [order._id]: e.target.value }))}
                  />
                  <button onClick={() => confirmRefund(order)} className="btn-primary text-sm">
                    Confirm {order.paymentMethod === "upi" ? "UPI" : "Cash"} Refund Sent
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {visible.length === 0 && <p className="text-gray-500">Nothing here right now.</p>}
      </div>
    </div>
  );
}
