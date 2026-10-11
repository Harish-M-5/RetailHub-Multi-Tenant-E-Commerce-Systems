import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { HiOutlineCash, HiCheckCircle } from "react-icons/hi";
import api from "../api/axios";
import { getSocket } from "../api/socket";

// Store pickup has no delivery stage to track, so payment for it is
// confirmed manually here instead of from the main Orders page - the
// customer pays in person when they collect their order, and the owner
// records that payment here. Confirming it is what makes the order's
// amount count toward Today's Sales / Monthly Revenue on the Dashboard
// (see backend/controllers/dashboardController.js earnedRevenueMatch).
export default function PickupPayments() {
  const [orders, setOrders] = useState([]);
  const [amountDrafts, setAmountDrafts] = useState({});
  const [showPaid, setShowPaid] = useState(false);

  const fetchOrders = () => {
    api.get("/owner/orders", { params: { limit: 100 } }).then(({ data }) => {
      setOrders(data.orders.filter((o) => o.deliveryType === "store_pickup" && o.status !== "cancelled"));
    });
  };

  useEffect(() => {
    fetchOrders();
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

  const confirmPayment = async (order) => {
    const amount = amountDrafts[order._id] ?? order.total;
    try {
      await api.patch(`/owner/orders/${order._id}/verify-payment`, { amountReceived: amount });
      toast.success(`Payment confirmed for ${order.orderNumber} - Today's Sales will update`);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to confirm payment");
    }
  };

  const pending = orders.filter((o) => o.paymentStatus !== "verified");
  const paid = orders.filter((o) => o.paymentStatus === "verified");
  const visible = showPaid ? paid : pending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><HiOutlineCash /> Store Pickup Payments</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          When a customer collects and pays for a store-pickup order in person, confirm it here.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setShowPaid(false)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${!showPaid ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
        >
          Awaiting Payment ({pending.length})
        </button>
        <button
          onClick={() => setShowPaid(true)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${showPaid ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
        >
          Confirmed ({paid.length})
        </button>
      </div>

      <div className="space-y-3">
        {visible.map((order) => (
          <div key={order._id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold flex items-center gap-2">
                {order.orderNumber}
                {order.paymentStatus === "verified" && <HiCheckCircle className="text-green-600" />}
              </p>
              <p className="text-sm text-gray-500">{order.shippingAddress?.name || order.customer?.name} · {order.shippingAddress?.phone || order.customer?.phone}</p>
              <p className="text-xs text-gray-400">{order.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">₹{order.total}</span>
              {order.paymentStatus !== "verified" ? (
                <>
                  <input
                    type="number"
                    className="input text-sm py-1 w-24"
                    placeholder={`${order.total}`}
                    onChange={(e) => setAmountDrafts((d) => ({ ...d, [order._id]: e.target.value }))}
                  />
                  <button onClick={() => confirmPayment(order)} className="btn-primary text-sm">
                    Confirm Payment
                  </button>
                </>
              ) : (
                <span className="text-sm text-green-600 font-medium">Received ₹{order.amountPaid || order.total}</span>
              )}
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-gray-500 py-4">
            {showPaid ? "No confirmed pickup payments yet." : "No pickup orders waiting on payment."}
          </p>
        )}
      </div>
    </div>
  );
}
