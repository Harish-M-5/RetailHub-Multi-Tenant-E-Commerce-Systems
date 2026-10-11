import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ ownerName: "", email: "", phone: "", password: "", role: "staff" });

  const fetchStaff = () => api.get("/staff").then(({ data }) => setStaff(data.staff));

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/staff", form);
      toast.success("Staff member added");
      setForm({ ownerName: "", email: "", phone: "", password: "", role: "staff" });
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this staff member?")) return;
    await api.delete(`/staff/${id}`);
    fetchStaff();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Staff & Role-Based Access</h1>

      <form onSubmit={handleSubmit} className="card grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className="input" placeholder="Name" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} required />
        <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        <input className="input" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
          <option value="delivery">Delivery Boy</option>
        </select>
        <button className="btn-primary sm:col-span-2">Add Staff Member</button>
      </form>

      <div className="card divide-y divide-gray-100 dark:divide-gray-800">
        {staff.map((s) => (
          <div key={s._id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div>
              <p className="font-medium">{s.ownerName} <span className="text-xs text-gray-400">({s.role})</span></p>
              <p className="text-sm text-gray-500">{s.email}</p>
            </div>
            <button onClick={() => remove(s._id)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
          </div>
        ))}
        {staff.length === 0 && <p className="text-gray-500 py-4">No staff members yet.</p>}
      </div>
    </div>
  );
}
