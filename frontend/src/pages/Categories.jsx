import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { HiOutlineTrash, HiOutlinePencil, HiOutlinePlus } from "react-icons/hi";
import api from "../api/axios";

export default function Categories() {
  const role = useSelector((s) => s.auth.user?.role) || "owner";
  const canManage = role === "owner" || role === "manager";
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);

  const fetchCategories = () => {
    api
      .get("/categories")
      .then(({ data }) => setCategories(data.categories))
      .catch((err) => {
        console.error("Failed to load categories:", err);
        toast.error(err.response?.data?.message || "Could not load categories");
      });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, { name: name.trim() });
        toast.success("Category updated");
      } else {
        await api.post("/categories", { name: name.trim() });
        toast.success("Category created");
      }
      setName("");
      setEditingId(null);
      fetchCategories();
    } catch (err) {
      console.error("Category save failed:", err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Could not save category. Check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cat) => {
    setEditingId(cat._id);
    setName(cat.name);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Category deleted");
      fetchCategories();
    } catch (err) {
      console.error("Failed to delete category:", err);
      toast.error(err.response?.data?.message || "Could not delete category");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Categories</h1>
      {canManage ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input className="input" placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="btn-primary flex items-center gap-1" disabled={submitting}>
            <HiOutlinePlus /> {submitting ? "Saving..." : editingId ? "Update" : "Add"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2">
          You can view categories here. Adding, editing or removing them is limited to the owner/manager.
        </p>
      )}
      <div className="card divide-y divide-gray-100 dark:divide-gray-800">
        {categories.map((cat) => (
          <div key={cat._id} className="flex items-center justify-between py-2">
            <span>{cat.name}</span>
            {canManage && (
              <div className="flex gap-2">
                <button onClick={() => handleEdit(cat)} className="text-gray-500 hover:text-brand-600"><HiOutlinePencil /></button>
                <button onClick={() => handleDelete(cat._id)} className="text-gray-500 hover:text-red-600"><HiOutlineTrash /></button>
              </div>
            )}
          </div>
        ))}
        {categories.length === 0 && <p className="text-sm text-gray-500 py-4">No categories yet</p>}
      </div>
    </div>
  );
}
