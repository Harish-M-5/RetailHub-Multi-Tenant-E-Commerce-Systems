import { Link, useLocation } from "react-router-dom";
import { HiOutlineCube, HiOutlineBriefcase } from "react-icons/hi";

/**
 * Shared split-screen layout for the owner Login/Register pages: a top nav,
 * a white card on the left with Login/Sign up tabs, and a decorative
 * gradient illustration panel on the right - matching the reference design
 * the person shared (teal/purple split auth screen with an isometric scene).
 */
export default function AuthSplitLayout({ children }) {
  const { pathname } = useLocation();
  const isLogin = pathname === "/login";

  return (
    <div className="min-h-screen bg-gradient-to-br from-storeteal-100 via-cream-50 to-storeteal-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden">
        {/* Top nav */}
        <div className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-gray-100 dark:border-gray-800">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-storeteal-700 dark:text-storeteal-400">
            <HiOutlineCube className="text-xl" /> RetailHub
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/" className="hover:text-storeteal-600">Home</Link>
            <a href="/#features" className="hover:text-storeteal-600">Features</a>
            <a href="/#pricing" className="hover:text-storeteal-600">Pricing</a>
            <a href="/#contact" className="hover:text-storeteal-600">Contact</a>
          </div>
          <Link to={isLogin ? "/register" : "/login"} className="store-btn-primary text-sm py-2 px-5">
            {isLogin ? "Register" : "Login"}
          </Link>
        </div>

        <div className="grid md:grid-cols-2">
          {/* Form side */}
          <div className="p-8 md:p-12">
            <div className="flex gap-8 mb-8 border-b border-gray-100 dark:border-gray-800">
              <Link
                to="/login"
                className={`pb-3 text-lg font-semibold border-b-2 -mb-px ${
                  isLogin
                    ? "border-storeteal-500 text-storeteal-700 dark:text-storeteal-400"
                    : "border-transparent text-gray-300 dark:text-gray-600"
                }`}
              >
                Login
              </Link>
              <Link
                to="/register"
                className={`pb-3 text-lg font-semibold border-b-2 -mb-px ${
                  !isLogin
                    ? "border-storeteal-500 text-storeteal-700 dark:text-storeteal-400"
                    : "border-transparent text-gray-300 dark:text-gray-600"
                }`}
              >
                Sign up
              </Link>
            </div>
            {children}
          </div>

          {/* Illustration side */}
          <div className="hidden md:flex relative bg-gradient-to-br from-storeteal-400 to-storeteal-600 items-center justify-center overflow-hidden">
            <div className="absolute -top-10 -left-10 w-56 h-56 rounded-full bg-white/10" />
            <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-white/10" />
            <div className="relative z-10 bg-white/95 dark:bg-gray-900/95 rounded-2xl shadow-lg p-8 flex flex-col items-center gap-3 mx-10">
              <HiOutlineBriefcase className="text-5xl text-storeteal-500" />
              <p className="font-display font-bold text-center text-gray-800 dark:text-gray-100">
                Run your whole business from one dashboard
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Products, orders, customers and payments - all in one place.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
