import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import api from "../api/axios";
import { setBusiness } from "../features/business/businessSlice";
import { getSocket } from "../api/socket";

export default function DashboardLayout() {
  const dispatch = useDispatch();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    api
      .get("/business/me")
      .then(({ data }) => {
        dispatch(setBusiness(data.business));
        // Join this business's real-time room so the notification bell and
        // any live order updates arrive without polling/refreshing.
        getSocket().emit("join:owner", { businessId: data.business._id });
      })
      .catch(() => {});
  }, [dispatch]);

  return (
    <div className="flex">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 min-w-0">
        <Navbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="p-3 sm:p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
