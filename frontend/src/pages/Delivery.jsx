import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { HiOutlineTruck, HiCheckCircle } from "react-icons/hi";
import api from "../api/axios";
import { getSocket } from "../api/socket";

// What a delivery-role user can do next, for the order status they're
// currently looking at - they can run the whole flow themselves (see
// backend/controllers/ownerOrderController.js's updateOrderStatus, which
// only requires the order to be assigned to them).
const NEXT_STATUS = {
  new: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["out_for_delivery", "delivered", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
};

const STATUS_LABELS = {
  confirmed: "Mark Confirmed",
  packed: "Mark Packed",
  out_for_delivery: "Mark Out for Delivery",
  delivered: "✔ Mark Delivered",
  cancelled: "✕ Mark Cancelled",
};

// This is the delivery-boy's own focused page: only orders the owner has
// actually assigned to them (see Orders.jsx's "Delivery person" dropdown),
// plus approved returns waiting to be collected. Owner/manager see every
// assigned order here too (for oversight), and can act the same way -
// nothing else is exposed, matching backend/routes/ownerOrderRoutes.js's
// RBAC.
export default function Delivery() {
  const role = useSelector((s) => s.auth.user?.role) || "owner";
  const myUserId = useSelector((s) => s.auth.user?.id);
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);

  const fetchData = () => {
    api.get("/owner/orders", { params: { limit: 200 } }).then(({ data }) => {
      const mine = (o) => role !== "delivery" || (o.assignedDeliveryBoy && o.assignedDeliveryBoy === myUserId);
      setOrders(
        data.orders.filter(
          (o) => o.deliveryType === "home_delivery" && o.assignedDeliveryBoy && !["delivered", "cancelled"].includes(o.status) && mine(o)
        )
      );
      setReturns(data.orders.filter((o) => o.returnStatus === "approved" && mine(o)));
    });
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on("order:changed", fetchData);
    socket.on("notification:new", fetchData);
    return () => {
      socket.off("order:changed", fetchData);
      socket.off("notification:new", fetchData);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id, status) => {
    let cancelReason;
    if (status === "cancelled") {
      cancelReason = window.prompt("Why couldn't this be delivered?") || undefined;
    }
    try {
      await api.patch(`/owner/orders/${id}/status`, { status, cancelReason });
      // This doesn't reach the customer yet - it's sent to the owner first
      // for confirmation (see backend/controllers/ownerOrderController.js's
      // updateOrderStatus "delivery" role branch).
      toast.success(`Sent to the owner for confirmation: ${status.replace(/_/g, " ")}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update order");
    }
  };

  const markReturnPickedUp = async (id) => {
    try {
      await api.patch(`/owner/orders/${id}/return/picked-up`);
      // Same as order status updates - this goes to the owner for
      // confirmation first, not straight to the customer.
      toast.success("Sent to the owner for confirmation");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update return");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><HiOutlineTruck /> Deliveries</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {role === "delivery"
            ? "Orders assigned to you, and approved returns waiting to be collected."
            : "Every order currently assigned to a delivery person, and approved returns waiting to be collected."}
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">To Deliver</h2>
        {orders.map((order) => (
          <div key={order._id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{order.orderNumber}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                  {order.status.replace(/_/g, " ")}
                </span>
                {order.pendingDeliveryStatus && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    Waiting for owner: {order.pendingDeliveryStatus.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {order.shippingAddress?.name || order.customer?.name} · {order.shippingAddress?.phone || order.customer?.phone}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {order.shippingAddress?.address}
                {order.shippingAddress?.city ? `, ${order.shippingAddress.city}` : ""}
                {order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ""}
                {order.shippingAddress?.pincode ? ` - ${order.shippingAddress.pincode}` : ""}
              </p>
              <p className="text-xs text-gray-400 mt-1">{order.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}</p>
              <p className="text-xs text-gray-400">
                ₹{order.total} · {order.paymentMethod.toUpperCase()} · {order.paymentStatus}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(NEXT_STATUS[order.status] || []).map((next) => (
                <button
                  key={next}
                  onClick={() => updateStatus(order._id, next)}
                  className={next === "cancelled" ? "btn-secondary text-sm !text-red-600 !border-red-300 hover:!bg-red-50" : "btn-primary text-sm"}
                >
                  {STATUS_LABELS[next]}
                </button>
              ))}
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-gray-500">Nothing to deliver right now.</p>}
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Returns to Collect</h2>
        {returns.map((order) => (
          <div key={order._id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{order.orderNumber}</p>
                {order.returnPendingPickup && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    Waiting for owner confirmation
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {order.shippingAddress?.name || order.customer?.name} · {order.shippingAddress?.phone || order.customer?.phone}
              </p>
              <p className="text-xs text-gray-400 mt-1">Reason: {order.returnReason}</p>
            </div>
            {!order.returnPendingPickup && (
              <button onClick={() => markReturnPickedUp(order._id)} className="btn-primary text-sm">
                <HiCheckCircle className="inline mr-1" /> Mark Item Collected &amp; Verified
              </button>
            )}
          </div>
        ))}
        {returns.length === 0 && <p className="text-gray-500">No returns waiting on pickup.</p>}
      </div>
    </div>
  );
}
