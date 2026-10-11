import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { HiCheckCircle, HiXCircle, HiOutlineTruck, HiOutlineCalendar, HiOutlineCash, HiOutlineRefresh } from "react-icons/hi";
import api from "../api/axios";
import { getSocket } from "../api/socket";

const STATUS_FLOW = {
  new: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  // "Delivered" shows here too (not just after "out for delivery") so the
  // owner can jump straight to it for a same-time/local handoff.
  packed: ["out_for_delivery", "delivered", "cancelled"],
  // Once out for delivery, show both outcomes together - owner picks
  // whichever actually happened and confirms it.
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  packed: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

// Quick visual read of where an order stands: green tick once delivered,
// red cross if cancelled, a moving-truck icon while it's on its way.
function StatusIcon({ status }) {
  if (status === "delivered") return <HiCheckCircle className="text-green-600 text-lg" />;
  if (status === "cancelled") return <HiXCircle className="text-red-600 text-lg" />;
  if (status === "out_for_delivery") return <HiOutlineTruck className="text-amber-600 text-lg" />;
  return null;
}

function toDateInputValue(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateInputValue(d);
}

export default function Orders() {
  const role = useSelector((s) => s.auth.user?.role) || "owner";
  const canVerifyPayment = role === "owner" || role === "manager";
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("");
  const [dateDrafts, setDateDrafts] = useState({});
  const [cashDrafts, setCashDrafts] = useState({});
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const canAssignDelivery = role === "owner" || role === "manager";

  const fetchOrders = (status = "") => {
    api.get("/owner/orders", { params: status ? { status } : {} }).then(({ data }) => setOrders(data.orders));
  };

  useEffect(() => {
    fetchOrders();
    if (canAssignDelivery) {
      api.get("/staff").then(({ data }) => setDeliveryBoys(data.staff.filter((s) => s.role === "delivery"))).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live refresh: any order placed, status changed or payment verified on
  // this business pushes here instantly instead of waiting for a manual
  // refresh (see backend/utils/socket.js + ownerOrderController.js).
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => fetchOrders(filter);
    socket.on("notification:new", refresh);
    socket.on("order:changed", refresh);
    return () => {
      socket.off("notification:new", refresh);
      socket.off("order:changed", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const updateStatus = async (id, status) => {
    let cancelReason;
    if (status === "cancelled") {
      cancelReason = window.prompt("Reason for cancelling this order (e.g. delivery failed, customer refused):") || undefined;
    }
    try {
      await api.patch(`/owner/orders/${id}/status`, { status, cancelReason });
      toast.success(`Order moved to ${status.replace(/_/g, " ")}`);
      fetchOrders(filter);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update order");
    }
  };

  const verifyPayment = async (id, amountReceived) => {
    try {
      await api.patch(`/owner/orders/${id}/verify-payment`, amountReceived !== undefined ? { amountReceived } : {});
      toast.success("Payment marked as received - Today's Sales will update");
      fetchOrders(filter);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to confirm payment");
    }
  };

  const confirmCash = (order) => {
    const amount = cashDrafts[order._id] ?? order.total;
    verifyPayment(order._id, amount);
  };

  const assignDeliveryBoy = async (id, deliveryBoyId) => {
    try {
      await api.patch(`/owner/orders/${id}/assign-delivery`, { deliveryBoyId: deliveryBoyId || null });
      toast.success(deliveryBoyId ? "Delivery person assigned" : "Delivery person unassigned");
      fetchOrders(filter);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign delivery person");
    }
  };

  const saveDeliveryDate = async (id, explicitValue) => {
    const value = explicitValue ?? dateDrafts[id];
    if (!value) {
      toast.error("Pick a date first");
      return;
    }
    try {
      await api.patch(`/owner/orders/${id}/delivery-date`, { expectedDeliveryDate: value });
      toast.success("Delivery date updated - customer will see it live");
      setDateDrafts((d) => ({ ...d, [id]: value }));
      fetchOrders(filter);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to set delivery date");
    }
  };

  // Owner reviews a delivery person's staged status suggestion and confirms
  // it - only then does the customer actually see it (see
  // backend/controllers/ownerOrderController.js's confirmDeliveryStatus).
  const confirmDeliveryStatus = async (id) => {
    try {
      await api.patch(`/owner/orders/${id}/confirm-delivery-status`);
      toast.success("Customer notified");
      fetchOrders(filter);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to confirm the update");
    }
  };

  // Store pickup's own two finish lines - no confirm/packed/out-for-delivery
  // flow for these, just "they came and got it" or "time's up, release it".
  const markPickupCollected = async (id) => {
    try {
      await api.patch(`/owner/orders/${id}/pickup/collected`);
      toast.success("Marked as collected");
      fetchOrders(filter);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update order");
    }
  };

  const releasePickup = async (id) => {
    if (!window.confirm("Release this order's stock to sell to another customer? This cancels the order.")) return;
    try {
      await api.patch(`/owner/orders/${id}/pickup/release`);
      toast.success("Order released back to stock");
      fetchOrders(filter);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to release order");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex items-center gap-4">
          <Link to="/dashboard/returns" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
            <HiOutlineRefresh /> Returns
          </Link>
          <Link to="/dashboard/pickup-payments" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
            <HiOutlineCash /> Store Pickup Payments
          </Link>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["", "new", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setFilter(s);
              fetchOrders(s);
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${filter === s ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
          >
            {s === "" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {orders.map((order) => {
          const isHomeDelivery = order.deliveryType === "home_delivery";
          const isPickup = order.deliveryType === "store_pickup";
          const trackingDone = order.status === "delivered" || order.status === "cancelled";
          const pickupOverdue =
            isPickup && !trackingDone && order.expectedDeliveryDate && new Date(order.expectedDeliveryDate) < new Date();

          return (
            <div key={order._id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{order.orderNumber}</p>
                  <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {order.returnStatus && order.returnStatus !== "none" && (
                    <Link
                      to="/dashboard/returns"
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-rose-100 text-rose-700 hover:underline"
                      title="See this on the Returns page"
                    >
                      <HiOutlineRefresh /> Return: {order.returnStatus.replace(/_/g, " ")}
                    </Link>
                  )}
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>
                    <StatusIcon status={order.status} />
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* Customer details + full delivery address */}
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Customer</p>
                  <p className="text-sm font-medium">{order.shippingAddress?.name || order.customer?.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{order.shippingAddress?.email || order.customer?.email}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{order.shippingAddress?.phone || order.customer?.phone}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    {order.deliveryType === "store_pickup"
                      ? "Pickup"
                      : order.deliveryType === "offline"
                      ? "Offline Sale"
                      : "Delivery Address"}
                  </p>
                  {order.deliveryType === "store_pickup" ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Customer will pick up at the store.</p>
                  ) : order.deliveryType === "offline" ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Recorded in person at the store.</p>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {order.shippingAddress?.address}
                      {order.shippingAddress?.city ? `, ${order.shippingAddress.city}` : ""}
                      {order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ""}
                      {order.shippingAddress?.pincode ? ` - ${order.shippingAddress.pincode}` : ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Expected delivery date (home delivery) or expected pickup-by
                  date (store pickup) - owner sets it, customer sees it live.
                  For pickup orders this is also the deadline after which the
                  order is auto-released back to stock if never collected
                  (see backend/utils/pickupSweep.js). Hidden once the order
                  is delivered or cancelled - tracking is over. */}
              {(isHomeDelivery || isPickup) && !trackingDone && (
                <div
                  className={`mt-3 flex flex-wrap items-center gap-2 rounded-lg p-3 ${
                    pickupOverdue ? "bg-red-50 dark:bg-red-900/20" : "bg-amber-50 dark:bg-gray-800/60"
                  }`}
                >
                  <HiOutlineCalendar className={`shrink-0 ${pickupOverdue ? "text-red-600" : "text-amber-600"}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {isPickup
                      ? order.expectedDeliveryDate
                        ? `Pickup window: ${
                            order.pickupWindowStart ? new Date(order.pickupWindowStart).toLocaleDateString() : "now"
                          } - ${new Date(order.expectedDeliveryDate).toLocaleDateString()}`
                        : "No pickup window set yet"
                      : order.expectedDeliveryDate
                      ? `Expected delivery: ${new Date(order.expectedDeliveryDate).toLocaleDateString()}`
                      : "No expected delivery date set yet"}
                    {isPickup && order.expectedDeliveryDate && (
                      <span className={order.pickupDateConfirmed ? "text-green-600 ml-1" : "text-amber-600 ml-1"}>
                        {order.pickupDateConfirmed ? "(confirmed)" : "(customer requested - awaiting your confirmation)"}
                      </span>
                    )}
                    {pickupOverdue && " - overdue, will be released back to stock automatically"}
                  </span>
                  <div className="flex items-center gap-2 ml-auto flex-wrap">
                    {isPickup && order.expectedDeliveryDate && !order.pickupDateConfirmed && (
                      <button
                        onClick={() => saveDeliveryDate(order._id, toDateInputValue(order.expectedDeliveryDate))}
                        className="btn-primary text-sm py-1"
                      >
                        Confirm Window
                      </button>
                    )}
                    {!isPickup && (
                      <>
                        <div className="flex gap-1">
                          {[1, 2, 3].map((n) => (
                            <button
                              key={n}
                              onClick={() => saveDeliveryDate(order._id, addDays(n))}
                              className="btn-secondary text-xs py-1 px-2"
                              title={`Set to ${n} day${n > 1 ? "s" : ""} from today`}
                            >
                              +{n}d
                            </button>
                          ))}
                        </div>
                        <input
                          type="date"
                          className="input text-sm py-1"
                          defaultValue={toDateInputValue(order.expectedDeliveryDate)}
                          onChange={(e) => setDateDrafts((d) => ({ ...d, [order._id]: e.target.value }))}
                        />
                        <button onClick={() => saveDeliveryDate(order._id)} className="btn-secondary text-sm py-1">
                          Set date
                        </button>
                      </>
                    )}
                    {isPickup && (
                      <>
                        <button onClick={() => markPickupCollected(order._id)} className="btn-primary text-sm py-1">
                          ✔ Mark Picked Up
                        </button>
                        <button
                          onClick={() => releasePickup(order._id)}
                          className="btn-secondary text-sm py-1 !text-red-600 !border-red-300 hover:!bg-red-50"
                        >
                          ✕ Release (time finished)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Delivery-person staged status update - set by the delivery
                  role via updateOrderStatus, doesn't reach the customer
                  until the owner/manager reviews and confirms it here. */}
              {isHomeDelivery && order.pendingDeliveryStatus && (
                <div className="mt-3 flex flex-wrap items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                  <HiOutlineTruck className="text-indigo-600 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Delivery person marked this order as{" "}
                    <span className="font-semibold">{order.pendingDeliveryStatus.replace(/_/g, " ")}</span>
                    {order.pendingDeliveryStatus === "cancelled" && order.pendingDeliveryCancelReason
                      ? ` (${order.pendingDeliveryCancelReason})`
                      : ""}{" "}
                    - confirm to notify the customer.
                  </span>
                  {canAssignDelivery && (
                    <button
                      onClick={() => confirmDeliveryStatus(order._id)}
                      className="btn-primary text-sm py-1 ml-auto"
                    >
                      Confirm &amp; Notify Customer
                    </button>
                  )}
                </div>
              )}

              {/* Delivery-person assignment - home delivery only. Once
                  assigned, that person's own Deliveries page shows this
                  order and they can progress it themselves. */}
              {isHomeDelivery && !trackingDone && canAssignDelivery && (
                <div className="mt-3 flex items-center gap-2 bg-indigo-50 dark:bg-gray-800/60 rounded-lg p-3">
                  <HiOutlineTruck className="text-indigo-600 shrink-0" />
                  <label className="text-sm text-gray-600 dark:text-gray-400">Delivery person:</label>
                  <select
                    className="input text-sm py-1"
                    value={order.assignedDeliveryBoy || ""}
                    onChange={(e) => assignDeliveryBoy(order._id, e.target.value)}
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

              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {order.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
              </div>
              <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                <div className="text-sm">
                  <span className="font-bold">₹{order.total}</span>{" "}
                  {order.deliveryCharge > 0 && (
                    <span className="text-xs text-gray-400">(incl. ₹{order.deliveryCharge} delivery)</span>
                  )}{" "}
                  <span className="text-gray-500">· {order.paymentMethod.toUpperCase()} · {order.paymentStatus}</span>
                  {order.paymentMethod === "upi" && order.paymentStatus === "partial" && (
                    <span className="text-red-600 ml-1">(paid ₹{order.amountPaid} of ₹{order.total} - mismatch)</span>
                  )}
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  {/* UPI: owner checks the screenshot/amount and confirms. */}
                  {canVerifyPayment && isHomeDelivery && order.paymentMethod === "upi" && order.paymentStatus !== "verified" && (
                    <button onClick={() => verifyPayment(order._id)} className="btn-secondary text-sm">Verify Payment</button>
                  )}
                  {/* COD: only makes sense to collect once it's actually delivered. */}
                  {canVerifyPayment && isHomeDelivery && order.paymentMethod === "cod" && order.status === "delivered" && order.paymentStatus !== "verified" && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className="input text-sm py-1 w-20"
                        placeholder={`${order.total}`}
                        onChange={(e) => setCashDrafts((d) => ({ ...d, [order._id]: e.target.value }))}
                      />
                      <button onClick={() => confirmCash(order)} className="btn-secondary text-sm">Confirm Cash Received</button>
                    </div>
                  )}
                  {/* Store pickup has its own actions above (collected/release) -
                      this confirm/packed/out-for-delivery/delivered flow is home
                      delivery only. It's also hidden while a delivery person's
                      update is awaiting the owner's confirmation above, so there's
                      only one place to act from at a time. */}
                  {!isPickup && !order.pendingDeliveryStatus && STATUS_FLOW[order.status]?.map((next) => (
                    <button
                      key={next}
                      onClick={() => updateStatus(order._id, next)}
                      className={next === "cancelled" ? "btn-secondary text-sm !text-red-600 !border-red-300 hover:!bg-red-50" : "btn-primary text-sm"}
                    >
                      {next === "delivered" ? "✔ Mark Delivered" : next === "cancelled" ? "✕ Mark Cancelled" : `Mark ${next.replace(/_/g, " ")}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        {orders.length === 0 && <p className="text-gray-500">No orders found.</p>}
      </div>
    </div>
  );
}
