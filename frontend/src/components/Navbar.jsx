import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { HiOutlineSun, HiOutlineMoon, HiOutlineLogout, HiOutlineMenu } from "react-icons/hi";
import toast from "react-hot-toast";
import api from "../api/axios";
import { logoutLocal } from "../features/auth/authSlice";
import { toggleTheme } from "../features/theme/themeSlice";
import StoreLinkBar from "./StoreLinkBar";
import NotificationBell from "./NotificationBell";

export default function Navbar({ onMenuClick }) {
  const business = useSelector((s) => s.business.business);
  const mode = useSelector((s) => s.theme.mode);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore - we clear local state regardless
    }
    dispatch(logoutLocal());
    toast.success("Logged out");
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* The "3 lines" menu button - opens the mobile navigation drawer
              (Sidebar.jsx) listing every dashboard page. */}
          <motion.button
            onClick={onMenuClick}
            whileTap={{ scale: 0.88 }}
            className="md:hidden p-2 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0 transition-colors"
            aria-label="Open menu"
          >
            <HiOutlineMenu className="text-xl" />
          </motion.button>
          <span className="font-bold tracking-tight text-brand-700 dark:text-brand-500 shrink-0 truncate max-w-[40vw] sm:max-w-none">
            {business?.businessName || "RetailHub"}
          </span>
          <span className="text-xs text-gray-400 shrink-0 hidden md:inline">{business?.businessId}</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          <motion.button
            whileTap={{ scale: 0.88, rotate: 15 }}
            onClick={() => dispatch(toggleTheme())}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {mode === "dark" ? <HiOutlineSun /> : <HiOutlineMoon />}
          </motion.button>
          <NotificationBell />
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Logout"
          >
            <HiOutlineLogout />
          </motion.button>
        </div>
      </div>
      <div className="px-4 pb-3">
        {business?.storeUrl && <StoreLinkBar storeUrl={business.storeUrl} />}
      </div>
    </header>
  );
}
