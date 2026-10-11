import { NavLink, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineCube as HiLogoMark,
  HiOutlineViewGrid,
  HiOutlineUser,
  HiOutlineCube,
  HiOutlineTag,
  HiOutlineShoppingCart,
  HiOutlineUsers,
  HiOutlineClipboardList,
  HiOutlineChartBar,
  HiOutlineBell,
  HiOutlineUserGroup,
  HiOutlineDocumentReport,
  HiOutlineCash,
  HiOutlineRefresh,
  HiOutlineTruck,
  HiOutlineOfficeBuilding,
  HiX,
} from "react-icons/hi";

// `roles` lists who can see the link. Leaving it out means every
// logged-in role (owner/manager/staff) can see it - matches the backend's
// own route-level RBAC (see backend/routes/*). Owner always sees everything.
const links = [
  { to: "/dashboard", label: "Dashboard", icon: HiOutlineViewGrid, end: true, roles: ["owner", "manager", "staff"] },
  { to: "/dashboard/profile", label: "Business Profile", icon: HiOutlineUser, roles: ["owner", "manager"] },
  { to: "/dashboard/products", label: "Products", icon: HiOutlineCube },
  { to: "/dashboard/categories", label: "Categories", icon: HiOutlineTag },
  { to: "/dashboard/orders", label: "Orders", icon: HiOutlineShoppingCart, roles: ["owner", "manager", "staff"] },
  { to: "/dashboard/delivery", label: "Deliveries", icon: HiOutlineTruck, roles: ["owner", "manager", "delivery"] },
  { to: "/dashboard/offline-store", label: "Offline Store", icon: HiOutlineOfficeBuilding, roles: ["owner", "manager", "staff"] },
  { to: "/dashboard/pickup-payments", label: "Pickup Payments", icon: HiOutlineCash, roles: ["owner", "manager"] },
  { to: "/dashboard/returns", label: "Returns", icon: HiOutlineRefresh, roles: ["owner", "manager"] },
  { to: "/dashboard/customers", label: "Customers", icon: HiOutlineUsers, roles: ["owner", "manager", "staff"] },
  { to: "/dashboard/inventory", label: "Inventory", icon: HiOutlineClipboardList, roles: ["owner", "manager", "staff"] },
  { to: "/dashboard/analytics", label: "Analytics", icon: HiOutlineChartBar, roles: ["owner", "manager"] },
  { to: "/dashboard/notifications", label: "Notifications", icon: HiOutlineBell },
  { to: "/dashboard/staff", label: "Staff", icon: HiOutlineUserGroup, roles: ["owner"] },
  { to: "/dashboard/audit-logs", label: "Audit Logs", icon: HiOutlineDocumentReport, roles: ["owner"] },
];

function NavLinks({ visibleLinks, role, onNavigate, scope }) {
  const location = useLocation();
  return (
    <nav className="px-2 space-y-1">
      {visibleLinks.map(({ to, label, icon: Icon, end }) => {
        const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className="relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 overflow-hidden"
          >
            {isActive && (
              <motion.span
                layoutId={`sidebar-active-pill-${scope}`}
                className="absolute inset-0 bg-gradient-to-r from-brand-600 to-brand-800 rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <Icon className={`relative text-lg shrink-0 transition-transform ${isActive ? "text-white scale-110" : ""}`} />
            <span className={`relative ${isActive ? "text-white font-semibold" : ""}`}>{label}</span>
          </NavLink>
        );
      })}
      {role === "staff" && (
        <p className="px-3 pt-3 text-xs text-gray-400">
          Signed in as Staff - some pages are limited to the business owner/manager.
        </p>
      )}
      {role === "delivery" && (
        <p className="px-3 pt-3 text-xs text-gray-400">
          Signed in as Delivery - you only see deliveries and returns ready for pickup.
        </p>
      )}
    </nav>
  );
}

const Logo = () => (
  <div className="p-4 flex items-center gap-2">
    <motion.span
      whileHover={{ rotate: -8, scale: 1.08 }}
      className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-800 text-white flex items-center justify-center shrink-0 shadow-sm shadow-brand-600/30"
    >
      <HiLogoMark />
    </motion.span>
    <span className="text-lg font-bold tracking-tight text-brand-700 dark:text-brand-400">RetailHub</span>
  </div>
);

export default function Sidebar({ mobileOpen, onClose }) {
  const role = useSelector((s) => s.auth.user?.role) || "owner";
  const visibleLinks = links.filter((l) => !l.roles || l.roles.includes(role));

  return (
    <>
      {/* Desktop: persistent sidebar */}
      <aside className="w-60 shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 h-screen sticky top-0 overflow-y-auto hidden md:block">
        <Logo />
        <NavLinks visibleLinks={visibleLinks} role={role} scope="desktop" />
      </aside>

      {/* Mobile: the "3 lines" hamburger in the Navbar opens this slide-in
          drawer, with every page listed in `links` above (Dashboard,
          Business Profile, Products, Categories, Orders, Deliveries,
          Offline Store, Pickup Payments, Returns, Customers, Inventory,
          Analytics, Notifications, Staff, Audit Logs - filtered by role). */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute left-0 top-0 h-full w-72 max-w-[85%] bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between pr-2">
                <Logo />
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Close menu"
                >
                  <HiX className="text-xl" />
                </button>
              </div>
              <NavLinks visibleLinks={visibleLinks} role={role} onNavigate={onClose} scope="mobile" />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
