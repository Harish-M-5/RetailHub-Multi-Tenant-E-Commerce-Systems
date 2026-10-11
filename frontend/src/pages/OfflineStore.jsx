import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { HiOutlineOfficeBuilding, HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiOutlineX } from "react-icons/hi";
import api from "../api/axios";

// Records a walk-in sale made in person at the store - a customer who
// bought something without ever using the online storefront. There's no
// delivery/payment flow to track here: the sale is complete and paid the
// moment it's entered, so it counts toward Today's Sales immediately (see
// backend/controllers/offlineOrderController.js).
export default function OfflineStore() {
  const role = useSelector((s) => s.auth.user?.role) || "owner";
  const canManage = role === "owner" || role === "manager";

  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    paymentMethod: "cash",
    amountPaid: "",
  });
  const [lines, setLines] = useState([{ productId: "", quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);

  // Inline edit of a past sale (customer/payment details only - not line items).
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // New offline-only product mini-form - these are products the owner sells
  // in person but never lists on the online storefront (deliveryType:
  // "offline_only", see backend/models/Product.js).
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState({ name: "", price: "", quantity: "" });
  const [savingProduct, setSavingProduct] = useState(false);

  useEffect(() => {
    loadProducts();
    fetchSales();
  }, []);

  const loadProducts = () => {
    api.get("/products", { params: { limit: 1000 } }).then(({ data }) => setProducts(data.products || []));
  };

  const fetchSales = () => {
    // No limit param - backend now returns the full all-time history
    // (see offlineOrderController.getOfflineOrders), this page doubles as
    // the record-keeping log for walk-in sales.
    api.get("/owner/offline-orders").then(({ data }) => setSales(data.orders)).catch(() => {});
  };

  const addLine = () => setLines((l) => [...l, { productId: "", quantity: 1 }]);
  const removeLine = (idx) => setLines((l) => l.filter((_, i) => i !== idx));
  const updateLine = (idx, field, value) =>
    setLines((l) => l.map((line, i) => (i === idx ? { ...line, [field]: value } : line)));

  const computedTotal = lines.reduce((sum, line) => {
    const product = products.find((p) => p._id === line.productId);
    if (!product) return sum;
    return sum + (product.finalPrice || product.price || 0) * (Number(line.quantity) || 0);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    const items = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (items.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/owner/offline-orders", {
        ...form,
        amountPaid: form.amountPaid || computedTotal,
        items: items.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
      });
      toast.success("Offline sale recorded - Today's Sales updated");
      setForm({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        paymentMethod: "cash",
        amountPaid: "",
      });
      setLines([{ productId: "", quantity: 1 }]);
      fetchSales();
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record sale");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (sale) => {
    setEditingId(sale._id);
    setEditForm({
      customerName: sale.shippingAddress?.name || sale.customer?.name || "",
      customerEmail: sale.shippingAddress?.email || "",
      customerPhone: sale.shippingAddress?.phone || "",
      address: sale.shippingAddress?.address || "",
      city: sale.shippingAddress?.city || "",
      state: sale.shippingAddress?.state || "",
      pincode: sale.shippingAddress?.pincode || "",
      paymentMethod: sale.paymentMethod,
      amountPaid: sale.amountPaid ?? sale.total,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id) => {
    try {
      await api.put(`/owner/offline-orders/${id}`, editForm);
      toast.success("Sale updated");
      cancelEdit();
      fetchSales();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update sale");
    }
  };

  const deleteSale = async (sale) => {
    if (!window.confirm(`Delete sale ${sale.orderNumber}? This restores the stock and can't be undone.`)) return;
    try {
      await api.delete(`/owner/offline-orders/${sale._id}`);
      toast.success("Sale deleted - stock restored");
      fetchSales();
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete sale");
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.price) {
      toast.error("Name and price are required");
      return;
    }
    setSavingProduct(true);
    try {
      await api.post("/products", {
        name: productForm.name.trim(),
        sku: `OFF-${Date.now().toString(36).toUpperCase()}`,
        price: Number(productForm.price),
        quantity: Number(productForm.quantity) || 0,
        deliveryType: "offline_only",
        status: "active",
      });
      toast.success("Offline product added");
      setProductForm({ name: "", price: "", quantity: "" });
      setShowProductForm(false);
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add product");
    } finally {
      setSavingProduct(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HiOutlineOfficeBuilding /> Offline Store
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Record a walk-in sale made in person at the store - without going through the online store.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Customer</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Customer name *"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder="Phone"
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
            />
            <input
              className="input"
              placeholder="Email (optional)"
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
            />
            <input
              className="input"
              placeholder="Address (optional)"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <input
              className="input"
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <input
              className="input"
              placeholder="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
            <input
              className="input"
              placeholder="Pincode"
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Products Purchased</p>
            {canManage && (
              <button
                type="button"
                onClick={() => setShowProductForm((s) => !s)}
                className="text-xs text-brand-700 dark:text-brand-400 font-medium hover:underline flex items-center gap-1"
              >
                <HiOutlinePlus /> {showProductForm ? "Close" : "Add new offline product"}
              </button>
            )}
          </div>

          {showProductForm && canManage && (
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3 mb-3 space-y-2">
              <p className="text-xs text-gray-500">
                Creates a product that's only sold in person here - it won't show up on the online storefront.
              </p>
              <div className="grid sm:grid-cols-3 gap-2">
                <input
                  className="input"
                  placeholder="Product name *"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
                <input
                  type="number"
                  className="input"
                  placeholder="Price *"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                />
                <input
                  type="number"
                  className="input"
                  placeholder="Stock quantity"
                  value={productForm.quantity}
                  onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={handleCreateProduct}
                disabled={savingProduct}
                className="btn-secondary text-sm"
              >
                {savingProduct ? "Saving..." : "Save Product"}
              </button>
            </div>
          )}

          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-center flex-wrap">
                <select
                  className="input flex-1 min-w-[200px]"
                  value={line.productId}
                  onChange={(e) => updateLine(idx, "productId", e.target.value)}
                >
                  <option value="">Select a product...</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} - ₹{p.finalPrice || p.price} ({p.quantity} in stock)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  className="input w-20"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                />
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700">
                    <HiOutlineTrash />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addLine} className="btn-secondary text-sm mt-2 flex items-center gap-1">
            <HiOutlinePlus /> Add another product
          </button>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Payment</p>
          <div className="grid sm:grid-cols-3 gap-3 items-center">
            <select
              className="input"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            >
              <option value="cash">Cash</option>
              <option value="gpay">GPay</option>
            </select>
            <input
              type="number"
              className="input"
              placeholder={`Amount received (default ₹${computedTotal})`}
              value={form.amountPaid}
              onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
            />
            <p className="text-sm font-bold text-right sm:text-left">Total: ₹{computedTotal}</p>
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving..." : "Record Sale"}
        </button>
      </form>

      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-3">All Offline Sales ({sales.length})</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 pr-3">Order #</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Customer</th>
              <th className="py-2 pr-3">Contact</th>
              <th className="py-2 pr-3">Address</th>
              <th className="py-2 pr-3">Products</th>
              <th className="py-2 pr-3">Payment</th>
              <th className="py-2 pr-3">Amount</th>
              {canManage && <th className="py-2 pr-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => {
              const isEditing = editingId === s._id;
              return (
                <tr key={s._id} className="border-b border-gray-100 dark:border-gray-800 align-top">
                  <td className="py-2 pr-3 font-medium whitespace-nowrap">{s.orderNumber}</td>
                  <td className="py-2 pr-3 whitespace-nowrap text-gray-500">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  {isEditing ? (
                    <>
                      <td className="py-2 pr-3 min-w-[140px]">
                        <input
                          className="input text-sm py-1"
                          value={editForm.customerName}
                          onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-3 min-w-[140px] space-y-1">
                        <input
                          className="input text-sm py-1"
                          placeholder="Phone"
                          value={editForm.customerPhone}
                          onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                        />
                        <input
                          className="input text-sm py-1"
                          placeholder="Email"
                          value={editForm.customerEmail}
                          onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-3 min-w-[160px] space-y-1">
                        <input
                          className="input text-sm py-1"
                          placeholder="Address"
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        />
                        <div className="flex gap-1">
                          <input
                            className="input text-sm py-1"
                            placeholder="City"
                            value={editForm.city}
                            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          />
                          <input
                            className="input text-sm py-1"
                            placeholder="Pincode"
                            value={editForm.pincode}
                            onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-500">
                        {s.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          className="input text-sm py-1"
                          value={editForm.paymentMethod}
                          onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                        >
                          <option value="cash">Cash</option>
                          <option value="gpay">GPay</option>
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          className="input text-sm py-1 w-24"
                          value={editForm.amountPaid}
                          onChange={(e) => setEditForm({ ...editForm, amountPaid: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(s._id)} className="btn-primary text-xs py-1 px-2">
                            Save
                          </button>
                          <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-700">
                            <HiOutlineX />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 pr-3 whitespace-nowrap">{s.shippingAddress?.name || s.customer?.name}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-gray-500">
                        {s.shippingAddress?.phone || "-"}
                        <br />
                        {s.shippingAddress?.email || "-"}
                      </td>
                      <td className="py-2 pr-3 min-w-[140px] text-xs text-gray-500">
                        {s.shippingAddress?.address
                          ? `${s.shippingAddress.address}, ${s.shippingAddress.city || ""} ${
                              s.shippingAddress.pincode || ""
                            }`
                          : "-"}
                      </td>
                      <td className="py-2 pr-3 min-w-[160px] text-xs text-gray-500">
                        {s.items.map((i, idx) => (
                          <div key={idx}>
                            {i.name} x{i.quantity} · ₹{i.price}
                          </div>
                        ))}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap uppercase text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            s.paymentMethod === "cash" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {s.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap font-bold">₹{s.total}</td>
                      {canManage && (
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button onClick={() => startEdit(s)} className="text-gray-500 hover:text-brand-700">
                              <HiOutlinePencil />
                            </button>
                            <button onClick={() => deleteSale(s)} className="text-gray-500 hover:text-red-600">
                              <HiOutlineTrash />
                            </button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {sales.length === 0 && <p className="text-gray-500 py-4">No offline sales recorded yet.</p>}
      </div>
    </div>
  );
}
