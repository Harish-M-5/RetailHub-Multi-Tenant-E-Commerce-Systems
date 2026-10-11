import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { HiOutlineMail, HiOutlineLockClosed } from "react-icons/hi";
import api from "../api/axios";
import { loginSuccess } from "../features/auth/authSlice";
import { setBusiness } from "../features/business/businessSlice";
import AuthSplitLayout from "../components/AuthSplitLayout";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      dispatch(loginSuccess({ accessToken: data.accessToken, user: data.user }));
      dispatch(setBusiness(data.business));
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      // This message now correctly shows "Invalid email or password"
      // instead of a confusing "No refresh token provided" error, because
      // the axios interceptor no longer routes /auth/login 401s through
      // the token-refresh flow.
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <HiOutlineMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="store-input pl-10"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="relative">
          <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="store-input pl-10"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="flex justify-end text-sm">
          <Link to="/login" className="text-storeteal-600 hover:underline">Forgot your password?</Link>
        </div>
        <button type="submit" className="store-btn-primary w-full" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
        <p className="text-sm text-center text-gray-500">
          New business? <Link to="/register" className="text-storeteal-600 font-medium">Register here</Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}
