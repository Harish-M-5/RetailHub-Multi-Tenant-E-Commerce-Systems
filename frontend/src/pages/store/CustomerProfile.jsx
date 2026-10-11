import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import customerApi from "../../api/customerAxios";

export default function CustomerProfile() {
  const [customer, setCustomer] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "" });

  useEffect(() => {
    customerApi.get("/customer/me").then(({ data }) => {
      setCustomer(data.customer);
      setForm({ name: data.customer.name, phone: data.customer.phone });
    }).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      const { data } = await customerApi.put("/customer/me", form);
      setCustomer(data.customer);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  if (!customer) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-md space-y-4">
      <h1 className="font-display text-2xl font-bold">My Profile</h1>
      <form onSubmit={save} className="store-card space-y-4 p-6">
        <div>
          <label className="label">Name</label>
          <input className="store-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="store-input" value={customer.email} disabled />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="store-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <button className="store-btn-primary">Save Changes</button>
      </form>
    </div>
  );
}
