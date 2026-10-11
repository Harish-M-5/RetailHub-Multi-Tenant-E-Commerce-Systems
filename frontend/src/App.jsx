import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import BusinessProfile from "./pages/BusinessProfile";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Inventory from "./pages/Inventory";
import Analytics from "./pages/Analytics";
import Notifications from "./pages/Notifications";
import Staff from "./pages/Staff";
import AuditLogs from "./pages/AuditLogs";
import PickupPayments from "./pages/PickupPayments";
import Returns from "./pages/Returns";
import OfflineStore from "./pages/OfflineStore";
import Delivery from "./pages/Delivery";

import StoreLayout from "./components/StoreLayout";
import StoreHome from "./pages/store/StoreHome";
import ProductDetail from "./pages/store/ProductDetail";
import CartPage from "./pages/store/CartPage";
import Wishlist from "./pages/store/Wishlist";
import Checkout from "./pages/store/Checkout";
import CustomerLogin from "./pages/store/CustomerLogin";
import CustomerRegister from "./pages/store/CustomerRegister";
import CustomerProfile from "./pages/store/CustomerProfile";
import MyOrders from "./pages/store/MyOrders";

function RequireOwnerAuth({ children }) {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// Extra safety net on top of the backend's own role checks: a staff/manager
// account that somehow lands on a page their role can't use (typed URL,
// stale link) gets redirected instead of hitting a wall of 403 errors.
function RequireRole({ roles, children }) {
  const user = useSelector((s) => s.auth.user);
  if (user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// Delivery-role accounts only get the Deliveries page (plus read-only
// Products/Categories) - the revenue-figures Dashboard isn't for them, so
// send them straight to their own page instead.
function DashboardIndex() {
  const role = useSelector((s) => s.auth.user?.role) || "owner";
  if (role === "delivery") return <Navigate to="/dashboard/delivery" replace />;
  return <Dashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <RequireOwnerAuth>
            <DashboardLayout />
          </RequireOwnerAuth>
        }
      >
        <Route index element={<DashboardIndex />} />
        <Route
          path="profile"
          element={
            <RequireRole roles={["owner", "manager"]}>
              <BusinessProfile />
            </RequireRole>
          }
        />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<Categories />} />
        <Route
          path="orders"
          element={
            <RequireRole roles={["owner", "manager", "staff"]}>
              <Orders />
            </RequireRole>
          }
        />
        <Route
          path="delivery"
          element={
            <RequireRole roles={["owner", "manager", "delivery"]}>
              <Delivery />
            </RequireRole>
          }
        />
        <Route
          path="offline-store"
          element={
            <RequireRole roles={["owner", "manager", "staff"]}>
              <OfflineStore />
            </RequireRole>
          }
        />
        <Route
          path="pickup-payments"
          element={
            <RequireRole roles={["owner", "manager"]}>
              <PickupPayments />
            </RequireRole>
          }
        />
        <Route
          path="returns"
          element={
            <RequireRole roles={["owner", "manager"]}>
              <Returns />
            </RequireRole>
          }
        />
        <Route
          path="customers"
          element={
            <RequireRole roles={["owner", "manager", "staff"]}>
              <Customers />
            </RequireRole>
          }
        />
        <Route
          path="inventory"
          element={
            <RequireRole roles={["owner", "manager", "staff"]}>
              <Inventory />
            </RequireRole>
          }
        />
        <Route
          path="analytics"
          element={
            <RequireRole roles={["owner", "manager"]}>
              <Analytics />
            </RequireRole>
          }
        />
        <Route path="notifications" element={<Notifications />} />
        <Route
          path="staff"
          element={
            <RequireRole roles={["owner"]}>
              <Staff />
            </RequireRole>
          }
        />
        <Route
          path="audit-logs"
          element={
            <RequireRole roles={["owner"]}>
              <AuditLogs />
            </RequireRole>
          }
        />
      </Route>

      <Route path="/store/:slug" element={<StoreLayout />}>
        <Route index element={<StoreHome />} />
        <Route path="product/:productId" element={<ProductDetail />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="login" element={<CustomerLogin />} />
        <Route path="register" element={<CustomerRegister />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="orders" element={<MyOrders />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
