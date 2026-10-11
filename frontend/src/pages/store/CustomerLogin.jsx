import { useState } from "react";
import { useOutletContext, useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import customerApi from "../../api/customerAxios";
import { customerLoginSuccess } from "../../features/customer/customerSlice";

export default function CustomerLogin() {
  const { slug } = useOutletContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await customerApi.post(`/store/${slug}/auth/login`, { email, password });
      dispatch(customerLoginSuccess({ accessToken: data.accessToken, customer: data.customer }));
      toast.success("Welcome back!");
      navigate(`/store/${slug}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="store-card space-y-4 p-6">
        <h1 className="font-display text-2xl font-bold">Welcome Back</h1>
        <div>
          <label className="label">Email</label>
          <input className="store-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="store-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="store-btn-primary w-full" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
        <p className="text-sm text-center text-gray-500">
          New here? <Link to={`/store/${slug}/register`} className="text-storeteal-600 font-medium">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
