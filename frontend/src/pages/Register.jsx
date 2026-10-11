import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import api from "../api/axios";
import { loginSuccess } from "../features/auth/authSlice";
import { setBusiness } from "../features/business/businessSlice";
import AuthSplitLayout from "../components/AuthSplitLayout";

const initialState = {
  ownerName: "",
  businessName: "",
  businessType: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  businessAddress: "",
  city: "",
  state: "",
  pincode: "",
  gstNumber: "",
  description: "",
};

export default function Register() {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      dispatch(loginSuccess({ accessToken: data.accessToken, user: data.user }));
      dispatch(setBusiness(data.business));
      toast.success(`Business registered! Your Business ID is ${data.business.businessId}`);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout>
      <form onSubmit={handleSubmit} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Owner Name</label>
            <input className="store-input" name="ownerName" value={form.ownerName} onChange={handleChange} required />
          </div>
          <div className="col-span-2">
            <label className="label">Business Name</label>
            <input className="store-input" name="businessName" value={form.businessName} onChange={handleChange} required />
          </div>
          <div className="col-span-2">
            <label className="label">Business Type</label>
            <input className="store-input" name="businessType" placeholder="Shoe Store, Bakery, etc." value={form.businessType} onChange={handleChange} required />
          </div>
          <div className="col-span-2">
            <label className="label">Email</label>
            <input className="store-input" type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="store-input" name="phone" value={form.phone} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">GST No. (Optional)</label>
            <input className="store-input" name="gstNumber" value={form.gstNumber} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="store-input" type="password" name="password" value={form.password} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <input className="store-input" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required />
          </div>
          <div className="col-span-2">
            <label className="label">Business Address</label>
            <input className="store-input" name="businessAddress" value={form.businessAddress} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">City</label>
            <input className="store-input" name="city" value={form.city} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">State</label>
            <input className="store-input" name="state" value={form.state} onChange={handleChange} required />
          </div>
          <div className="col-span-2">
            <label className="label">Pincode</label>
            <input className="store-input" name="pincode" value={form.pincode} onChange={handleChange} required />
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea className="store-input" name="description" value={form.description} onChange={handleChange} rows={2} />
          </div>
        </div>

        <button type="submit" className="store-btn-primary w-full" disabled={loading}>
          {loading ? "Registering..." : "Register Business"}
        </button>

        <p className="text-sm text-center text-gray-500">
          Already have an account? <Link to="/login" className="text-storeteal-600 font-medium">Login</Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}
