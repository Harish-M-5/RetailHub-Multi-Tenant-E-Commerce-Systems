import { useEffect, useState } from "react";
import { Outlet, useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  HiOutlineShoppingBag,
  HiOutlineHeart,
  HiOutlineUser,
  HiOutlineClipboardList,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineSearch,
  HiOutlineTruck,
  HiOutlineRefresh,
  HiOutlineLogout,
} from "react-icons/hi";
import api from "../api/axios";
import customerApi from "../api/customerAxios";
import { setStoreSlug, customerLogoutLocal } from "../features/customer/customerSlice";
import { setCartCount } from "../features/cart/cartSlice";
import { toggleTheme } from "../features/theme/themeSlice";
import { getSocket } from "../api/socket";

export default function StoreLayout() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector((s) => s.customer.isAuthenticated);
  const cartCount = useSelector((s) => s.cart.count);
  const mode = useSelector((s) => s.theme.mode);
  const [business, setBusiness] = useState(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    api.get(`/store/${slug}`).then(({ data }) => setBusiness(data.business)).catch(() => {});
  }, [slug]);

  // Join this customer's real-time room so order-status/payment/delivery
  // updates (see backend/utils/socket.js) arrive live on this tab. Fetches
  // the customer id fresh rather than trusting redux state, since that
  // isn't persisted across a page reload.
  useEffect(() => {
    if (isAuthenticated && business?._id) {
      customerApi
        .get("/customer/me")
        .then(({ data }) => {
          getSocket().emit("join:customer", { businessId: business._id, customerId: data.customer._id });
        })
        .catch(() => {});
    }
  }, [isAuthenticated, business?._id]);

  useEffect(() => {
    dispatch(setStoreSlug(slug));
  }, [slug, dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      customerApi.get("/cart").then(({ data }) => {
        const count = data.cart.items.reduce((sum, i) => sum + i.quantity, 0);
        dispatch(setCartCount(count));
      }).catch(() => {});
    }
  }, [isAuthenticated, dispatch]);

  const handleLogout = async () => {
    try {
      await customerApi.post(`/store/${slug}/auth/logout`);
    } catch {}
    dispatch(customerLogoutLocal());
    toast.success("Logged out");
    navigate(`/store/${slug}`);
  };

  return (
    <div className="storefront min-h-screen flex flex-col">
      {/* Top promo bar */}
      <div className="bg-storeteal-700 text-white text-xs md:text-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4 overflow-x-auto whitespace-nowrap">
          <span className="flex items-center gap-1.5"><HiOutlineTruck /> Free shipping on orders over ₹999</span>
          <span className="hidden sm:inline">10% off your first order · use code WELCOME10</span>
          <span className="flex items-center gap-1.5"><HiOutlineRefresh /> Easy returns anytime</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to={`/store/${slug}`} className="flex items-center gap-2 shrink-0">
            {business?.logo ? (
              <img src={business.logo} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-storeteal-500 text-white flex items-center justify-center font-bold">
                {business?.businessName?.[0]?.toUpperCase() || "R"}
              </span>
            )}
            <span className="store-heading font-bold text-lg text-storeteal-700 dark:text-storeteal-400 truncate max-w-[140px]">
              {business?.businessName || slug}
            </span>
          </Link>

          <div className="hidden md:flex items-center flex-1 max-w-sm">
            <div className="relative w-full">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="store-input pl-9"
                placeholder="Search products..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate(`/store/${slug}?search=${e.target.value}`);
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 shrink-0">
            <button
              onClick={() => setMobileSearchOpen((v) => !v)}
              className="md:hidden p-2 rounded-full hover:bg-storeteal-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              aria-label="Search"
            >
              <HiOutlineSearch />
            </button>
            <button onClick={() => dispatch(toggleTheme())} className="p-2 rounded-full hover:bg-storeteal-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
              {mode === "dark" ? <HiOutlineSun /> : <HiOutlineMoon />}
            </button>
            <Link to={`/store/${slug}/wishlist`} className="p-2 rounded-full hover:bg-storeteal-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
              <HiOutlineHeart />
            </Link>
            {isAuthenticated && (
              <Link to={`/store/${slug}/orders`} className="p-2 rounded-full hover:bg-storeteal-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
                <HiOutlineClipboardList />
              </Link>
            )}
            <Link to={`/store/${slug}/profile`} className="p-2 rounded-full hover:bg-storeteal-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
              <HiOutlineUser />
            </Link>
            <Link to={`/store/${slug}/cart`} className="relative p-2 rounded-full hover:bg-storeteal-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
              <HiOutlineShoppingBag />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-storeteal-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            {isAuthenticated ? (
              <>
                <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 ml-1 hidden sm:inline">
                  Logout
                </button>
                <button onClick={handleLogout} className="sm:hidden p-2 rounded-full hover:bg-storeteal-50 dark:hover:bg-gray-800 text-gray-500" aria-label="Logout">
                  <HiOutlineLogout />
                </button>
              </>
            ) : (
              <Link to={`/store/${slug}/login`} className="store-btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4 ml-1">
                Login
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search - collapses under the header so it doesn't crowd
            the icon row on small screens */}
        {mobileSearchOpen && (
          <div className="md:hidden px-4 pb-3">
            <div className="relative">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                className="store-input pl-9"
                placeholder="Search products..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    navigate(`/store/${slug}?search=${e.target.value}`);
                    setMobileSearchOpen(false);
                  }
                }}
              />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <Outlet context={{ slug, business }} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-storeteal-50 dark:bg-gray-900 border-t border-storeteal-100 dark:border-gray-800 mt-10">
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div className="col-span-2 md:col-span-1">
            <p className="store-heading font-bold text-storeteal-700 dark:text-storeteal-400 text-lg mb-2">
              {business?.businessName || "RetailHub Store"}
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              {business?.description || "Thoughtfully curated products, delivered to your door."}
            </p>
          </div>
          <div>
            <p className="font-semibold mb-2">Shop</p>
            <ul className="space-y-1 text-gray-500 dark:text-gray-400">
              <li><Link to={`/store/${slug}`} className="hover:text-storeteal-600">All Products</Link></li>
              <li><Link to={`/store/${slug}/wishlist`} className="hover:text-storeteal-600">Wishlist</Link></li>
              <li><Link to={`/store/${slug}/cart`} className="hover:text-storeteal-600">Cart</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Account</p>
            <ul className="space-y-1 text-gray-500 dark:text-gray-400">
              <li><Link to={`/store/${slug}/profile`} className="hover:text-storeteal-600">My Profile</Link></li>
              <li><Link to={`/store/${slug}/orders`} className="hover:text-storeteal-600">My Orders</Link></li>
              <li><Link to={`/store/${slug}/login`} className="hover:text-storeteal-600">Login</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Contact</p>
            <p className="text-gray-500 dark:text-gray-400">{business?.phone}</p>
            <p className="text-gray-500 dark:text-gray-400">{business?.email}</p>
            <p className="text-gray-500 dark:text-gray-400">{business?.city}, {business?.state}</p>
          </div>
        </div>
        <div className="border-t border-storeteal-100 dark:border-gray-800 py-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} {business?.businessName || "RetailHub"}. Powered by RetailHub.
        </div>
      </footer>
    </div>
  );
}
