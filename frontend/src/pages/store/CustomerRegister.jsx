import { useState } from "react";
import { useOutletContext, useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import customerApi from "../../api/customerAxios";
import { customerLoginSuccess } from "../../features/customer/customerSlice";

export default function CustomerRegister() {
  const { slug } = useOutletContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Email is normalized (trim + lowercase) on the backend too, but
      // trimming here as well avoids a leading/trailing space ever being
      // the difference between "new" and "already registered".
      const payload = { ...form, email: form.email.trim().toLowerCase() };
      const { data } = await customerApi.post(`/store/${slug}/auth/register`, payload);
      dispatch(customerLoginSuccess({ accessToken: data.accessToken, customer: data.customer }));
      toast.success("Account created! Welcome.");
      navigate(`/store/${slug}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="store-card space-y-4 p-6">
        <h1 className="font-display text-2xl font-bold">Create Account</h1>
        <div>
          <label className="label">Name</label>
          <input className="store-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="store-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="store-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="store-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <button className="store-btn-primary w-full" disabled={loading}>{loading ? "Creating account..." : "Register"}</button>
        <p className="text-sm text-center text-gray-500">
          Already have an account? <Link to={`/store/${slug}/login`} className="text-storeteal-600 font-medium">Login</Link>
        </p>
      </form>
    </div>
  );
}
