import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "../api/axios";
import { getSocket } from "../api/socket";
import {
  HiOutlineCurrencyRupee,
  HiOutlineChartBar,
  HiOutlineCube,
  HiOutlineUsers,
  HiOutlineShoppingCart,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from "react-icons/hi";

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

const StatCard = ({ label, value, icon: Icon, tint }) => (
  <motion.div
    variants={cardVariants}
    whileHover={{ y: -3 }}
    className="card flex items-start justify-between cursor-default"
  >
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
    </div>
    <div className={`rounded-xl w-11 h-11 flex items-center justify-center text-xl shrink-0 ${tint}`}>
      <Icon />
    </div>
  </motion.div>
);

export default function Dashboard() {
  const business = useSelector((s) => s.business.business);
  const [stats, setStats] = useState(null);
  const [chart, setChart] = useState({ monthlySales: [], bestSelling: [] });

  const fetchStats = () => {
    api.get("/dashboard/stats").then(({ data }) => setStats(data.stats)).catch(() => {});
    api.get("/dashboard/sales-chart").then(({ data }) => setChart(data)).catch(() => {});
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Today's Sales / Monthly Revenue only count orders once payment is
  // actually verified (see dashboardController's earnedRevenueMatch), so the
  // owner needs these cards to update the moment that happens - without a
  // manual page reload. ownerOrderController emits this on payment
  // verification and on any status change into/out of "delivered".
  useEffect(() => {
    const socket = getSocket();
    socket.on("dashboard:refresh", fetchStats);
    return () => socket.off("dashboard:refresh", fetchStats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const salesData = chart.monthlySales.map((m) => ({
    label: `${m._id.month}/${m._id.year}`,
    revenue: m.revenue,
    orders: m.orders,
  }));

  return (
    <div className="space-y-6">
      {/* Gradient welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900 text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-6 -bottom-10 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="relative">
          <h1 className="text-2xl font-extrabold tracking-tight">Welcome, {business?.businessName}</h1>
          <p className="text-brand-200 mt-1">{business?.businessType} · {business?.businessId}</p>
        </div>
        <div className="relative flex gap-6">
          <div>
            <p className="text-brand-200 text-xs uppercase tracking-wide">Today's Sales</p>
            <p className="text-2xl font-bold tracking-tight">₹{stats?.todaySales ?? 0}</p>
          </div>
          <div>
            <p className="text-brand-200 text-xs uppercase tracking-wide">Monthly Revenue</p>
            <p className="text-2xl font-bold tracking-tight">₹{stats?.monthlyRevenue ?? 0}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard
          label="Total Products"
          value={stats?.totalProducts ?? 0}
          icon={HiOutlineCube}
          tint="bg-brand-100 text-brand-700 dark:bg-gray-800 dark:text-brand-400"
        />
        <StatCard
          label="Total Customers"
          value={stats?.totalCustomers ?? 0}
          icon={HiOutlineUsers}
          tint="bg-purple-100 text-purple-700 dark:bg-gray-800 dark:text-purple-400"
        />
        <StatCard
          label="Total Orders"
          value={stats?.totalOrders ?? 0}
          icon={HiOutlineShoppingCart}
          tint="bg-blue-100 text-blue-700 dark:bg-gray-800 dark:text-blue-400"
        />
        <StatCard
          label="Pending Orders"
          value={stats?.pendingOrders ?? 0}
          icon={HiOutlineClock}
          tint="bg-amber-100 text-amber-700 dark:bg-gray-800 dark:text-amber-400"
        />
        <StatCard
          label="Delivered Orders"
          value={stats?.deliveredOrders ?? 0}
          icon={HiOutlineCheckCircle}
          tint="bg-green-100 text-green-700 dark:bg-gray-800 dark:text-green-400"
        />
        <StatCard
          label="Low Stock Products"
          value={stats?.lowStockProducts ?? 0}
          icon={HiOutlineExclamationCircle}
          tint="bg-red-100 text-red-700 dark:bg-gray-800 dark:text-red-400"
        />
        <StatCard
          label="Monthly Revenue"
          value={`₹${stats?.monthlyRevenue ?? 0}`}
          icon={HiOutlineCurrencyRupee}
          tint="bg-indigo-100 text-indigo-700 dark:bg-gray-800 dark:text-indigo-400"
        />
        <StatCard
          label="Today's Sales"
          value={`₹${stats?.todaySales ?? 0}`}
          icon={HiOutlineChartBar}
          tint="bg-teal-100 text-teal-700 dark:bg-gray-800 dark:text-teal-400"
        />
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-3">Monthly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">Best Selling Products</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chart.bestSelling}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalSold" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
