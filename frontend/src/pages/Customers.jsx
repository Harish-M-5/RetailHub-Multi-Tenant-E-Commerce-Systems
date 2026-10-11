import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [orders, setOrders] = useState([]);

  const fetchCustomers = (q = "") => {
    api.get("/customers", { params: { search: q } }).then(({ data }) => setCustomers(data.customers));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const viewCustomer = async (c) => {
    const { data } = await api.get(`/customers/${c._id}`);
    setSelected(data.customer);
    setOrders(data.orders);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Customers (CRM)</h1>
      <input
        className="input max-w-sm"
        placeholder="Search by name, email or phone..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          fetchCustomers(e.target.value);
        }}
      />

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <div className="card divide-y divide-gray-100 dark:divide-gray-800 h-fit">
          {customers.map((c) => (
            <button
              key={c._id}
              onClick={() => viewCustomer(c)}
              className={`w-full text-left py-3 hover:bg-gray-50 dark:hover:bg-gray-800 px-2 rounded ${
                selected?._id === c._id ? "bg-gray-50 dark:bg-gray-800" : ""
              }`}
            >
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-gray-500">{c.email} · {c.phone}</p>
              <p className="text-xs text-gray-400">{c.totalOrders} orders · ₹{c.totalSpent} spent</p>
            </button>
          ))}
          {customers.length === 0 && <p className="text-gray-500 py-4">No customers yet.</p>}
        </div>

        {selected && (
          <div className="card space-y-4 overflow-x-auto">
            <div>
              <h2 className="font-semibold text-lg">{selected.name}</h2>
              <p className="text-sm text-gray-500">
                {selected.email || "-"} · {selected.phone || "-"}
              </p>
              <p className="text-sm">Total Orders: {selected.totalOrders} · Total Spent: ₹{selected.totalSpent}</p>
            </div>

            {selected.addresses?.length > 0 && (
              <div>
                <h3 className="font-medium mb-1">Saved Addresses</h3>
                <div className="space-y-2">
                  {selected.addresses.map((addr) => (
                    <div key={addr._id} className="text-sm bg-gray-50 dark:bg-gray-800/60 rounded-lg p-2">
                      <span className="text-xs font-semibold text-gray-400 uppercase mr-1">
                        {addr.label}
                        {addr.isDefault ? " · Default" : ""}
                      </span>
                      <p className="text-gray-600 dark:text-gray-400">
                        {addr.address}, {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-medium mb-2">Purchase History</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-3">Order #</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Products</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Address</th>
                    <th className="py-2 pr-3">Payment</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o._id} className="border-b border-gray-100 dark:border-gray-800 align-top">
                      <td className="py-2 pr-3 font-medium whitespace-nowrap">{o.orderNumber}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-gray-500">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-3 min-w-[160px]">
                        {o.items.map((i, idx) => (
                          <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                            {i.name} x{i.quantity} · ₹{i.price}
                          </div>
                        ))}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{o.shippingAddress?.name || selected.name}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{o.shippingAddress?.phone || selected.phone || "-"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{o.shippingAddress?.email || selected.email || "-"}</td>
                      <td className="py-2 pr-3 min-w-[160px] text-xs text-gray-500">
                        {o.deliveryType === "store_pickup"
                          ? "Store pickup"
                          : o.deliveryType === "offline"
                          ? "Walk-in / offline"
                          : o.shippingAddress?.address
                          ? `${o.shippingAddress.address}, ${o.shippingAddress.city}, ${o.shippingAddress.state} - ${o.shippingAddress.pincode}`
                          : "-"}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap uppercase text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            o.paymentMethod === "cod" || o.paymentMethod === "cash"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {o.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap font-semibold">₹{o.total}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-gray-500">{o.status.replace(/_/g, " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && <p className="text-sm text-gray-500 py-2">No orders yet.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
