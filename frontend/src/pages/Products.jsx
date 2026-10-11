import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { HiOutlineTrash, HiOutlinePencil, HiOutlinePlus, HiOutlineX } from "react-icons/hi";
import api from "../api/axios";
import ImageUploadField from "../components/ImageUploadField";

const emptyForm = {
  name: "",
  sku: "",
  brand: "",
  description: "",
  category: "",
  price: "",
  discount: 0,
  quantity: "",
  lowStockThreshold: 5,
  deliveryType: "home_delivery",
  tags: "",
  images: [],
};

export default function Products() {
  const role = useSelector((s) => s.auth.user?.role) || "owner";
  const canManage = role === "owner" || role === "manager";
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const fetchProducts = (q = "") => {
    api.get("/products", { params: { search: q } }).then(({ data }) => setProducts(data.products));
  };

  useEffect(() => {
    fetchProducts();
    api.get("/categories").then(({ data }) => setCategories(data.categories));
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({
      name: p.name,
      sku: p.sku,
      brand: p.brand || "",
      description: p.description || "",
      category: p.category?._id || "",
      price: p.price,
      discount: p.discount,
      quantity: p.quantity,
      lowStockThreshold: p.lowStockThreshold,
      deliveryType: p.deliveryType,
      tags: (p.tags || []).join(", "),
      images: p.images || [],
    });
    setEditingId(p._id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: Number(form.price),
      discount: Number(form.discount) || 0,
      quantity: Number(form.quantity),
      lowStockThreshold: Number(form.lowStockThreshold) || 5,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      category: form.category || undefined,
    };
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/products", payload);
        toast.success("Product added");
      }
      setShowForm(false);
      fetchProducts(search);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save product");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await api.delete(`/products/${id}`);
    fetchProducts(search);
  };

  const toggleStatus = async (id) => {
    await api.patch(`/products/${id}/toggle-status`);
    fetchProducts(search);
  };

  const addImage = (url) => setForm({ ...form, images: [...form.images, url] });
  const removeImage = (url) => setForm({ ...form, images: form.images.filter((i) => i !== url) });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        {canManage && (
          <button onClick={openNew} className="btn-primary flex items-center gap-1"><HiOutlinePlus /> Add Product</button>
        )}
      </div>
      {!canManage && (
        <p className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2">
          You can view the catalog here. Adding, editing or removing products is limited to the owner/manager.
        </p>
      )}

      <input
        className="input max-w-sm"
        placeholder="Search products..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          fetchProducts(e.target.value);
        }}
      />

      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => (
          <div key={p._id} className="card">
            <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
              {p.images?.[0] ? (
                <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-sm">No image</span>
              )}
            </div>
            <h3 className="font-semibold truncate">{p.name}</h3>
            <p className="text-sm text-gray-500">SKU: {p.sku}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-bold">₹{p.finalPrice}</span>
              {p.discount > 0 && <span className="text-xs text-gray-400 line-through">₹{p.price}</span>}
            </div>
            <p className={`text-xs mt-1 ${p.stockStatus === "out_of_stock" ? "text-red-500" : p.stockStatus === "low_stock" ? "text-amber-500" : "text-green-600"}`}>
              {p.stockStatus.replace(/_/g, " ")} ({p.quantity})
            </p>
            {canManage && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(p)} className="btn-secondary flex-1 flex items-center justify-center gap-1 text-sm"><HiOutlinePencil /> Edit</button>
                <button onClick={() => toggleStatus(p._id)} className="btn-secondary text-sm px-2">{p.status === "active" ? "Disable" : "Enable"}</button>
                <button onClick={() => handleDelete(p._id)} className="text-red-500 hover:text-red-700 px-2"><HiOutlineTrash /></button>
              </div>
            )}
          </div>
        ))}
        {products.length === 0 && <p className="text-gray-500 col-span-full">No products yet. Add your first product.</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 relative">
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <HiOutlineX />
            </button>
            <h2 className="text-xl font-bold">{editingId ? "Edit Product" : "Add Product"}</h2>

            <div>
              <label className="label">Product Images</label>
              <div className="flex gap-3 flex-wrap">
                {form.images.map((img) => (
                  <div key={img} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                    <img src={img} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(img)} className="absolute top-0 right-0 bg-black/60 text-white rounded-bl p-0.5">
                      <HiOutlineX className="text-xs" />
                    </button>
                  </div>
                ))}
                <ImageUploadField label="" value="" onChange={addImage} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Product Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">SKU</label>
                <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Brand</label>
                <input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div>
                <label className="label">Price (₹)</label>
                <input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div>
                <label className="label">Discount (%)</label>
                <input type="number" className="input" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
              </div>
              <div>
                <label className="label">Quantity</label>
                <input type="number" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
              </div>
              <div>
                <label className="label">Low Stock Threshold</label>
                <input type="number" className="input" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Delivery Option</label>
                <select className="input" value={form.deliveryType} onChange={(e) => setForm({ ...form, deliveryType: e.target.value })}>
                  <option value="offline_only">Offline Only (Available only in store)</option>
                  <option value="home_delivery">Home Delivery Available</option>
                  <option value="store_pickup">Store Pickup</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Tags (comma separated)</label>
                <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Description</label>
                <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            <button className="btn-primary w-full">{editingId ? "Update Product" : "Add Product"}</button>
          </form>
        </div>
      )}
    </div>
  );
}
