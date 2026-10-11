import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HiOutlineCube,
  HiArrowRight,
  HiOutlineShoppingBag,
  HiOutlineChartBar,
  HiOutlineCreditCard,
  HiOutlineTruck,
  HiOutlineUserGroup,
  HiOutlineShieldCheck,
  HiOutlineLightningBolt,
  HiOutlineGlobeAlt,
  HiStar,
} from "react-icons/hi";

const FEATURES = [
  { icon: HiOutlineShoppingBag, label: "Storefront builder" },
  { icon: HiOutlineChartBar, label: "Live analytics" },
  { icon: HiOutlineCreditCard, label: "Secure payments" },
  { icon: HiOutlineTruck, label: "Order tracking" },
  { icon: HiOutlineUserGroup, label: "Customer CRM" },
];

const SERVICES = [
  {
    icon: HiOutlineGlobeAlt,
    title: "Your own storefront",
    desc: "Every business gets a branded online store with a shareable link, ready to sell in minutes.",
  },
  {
    icon: HiOutlineShoppingBag,
    title: "Product & inventory",
    desc: "Manage catalog, categories, stock levels and low-stock alerts from one dashboard.",
  },
  {
    icon: HiOutlineCreditCard,
    title: "Orders & payments",
    desc: "Track every order from placed to delivered, with a full payment and order history.",
  },
  {
    icon: HiOutlineUserGroup,
    title: "Customer insights",
    desc: "See who's buying, repeat customers, and build relationships that keep them coming back.",
  },
  {
    icon: HiOutlineChartBar,
    title: "Analytics & reports",
    desc: "Revenue trends, best sellers and performance charts updated in real time.",
  },
  {
    icon: HiOutlineShieldCheck,
    title: "Secure & reliable",
    desc: "Multi-tenant architecture keeps every business's data fully isolated and protected.",
  },
];

const STATS = [
  { value: "100%", label: "Cloud hosted" },
  { value: "24/7", label: "Store uptime" },
  { value: "0", label: "Setup cost" },
  { value: "1", label: "Dashboard for everything" },
];

const INSIGHTS = [
  {
    tag: "Getting started",
    title: "Launch your store in under 10 minutes",
    desc: "Register your business, add your first products, and share your store link with customers today.",
  },
  {
    tag: "Growth",
    title: "Turn browsers into repeat buyers",
    desc: "Use the built-in customer accounts, wishlist and order history to keep shoppers coming back.",
  },
  {
    tag: "Operations",
    title: "Run the whole business from one place",
    desc: "Products, orders, staff, inventory and analytics - no more juggling spreadsheets and chat apps.",
  },
];

export default function Landing() {
  return (
    <div className="bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100">
      {/* Announcement bar */}
      <div className="bg-brand-700 text-white text-center text-sm py-2 px-4">
        🎉 Multi-tenant retail platform — register your business free, no credit card required.
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-brand-700 dark:text-brand-400">
            <HiOutlineCube /> RetailHub
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-400">
            <a href="#features" className="hover:text-brand-600">Features</a>
            <a href="#services" className="hover:text-brand-600">Services</a>
            <a href="#insights" className="hover:text-brand-600">Insights</a>
            <a href="#contact" className="hover:text-brand-600">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:inline text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-brand-600">
              Owner Login
            </Link>
            <Link to="/register" className="btn-primary text-sm py-2.5 px-5 rounded-full">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block bg-brand-100 text-brand-700 dark:bg-gray-800 dark:text-brand-400 text-xs font-semibold px-3 py-1 rounded-full mb-5">
              Multi-Tenant Retail SaaS
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-gray-900 dark:text-white">
              Turn your retail business into a <span className="text-brand-600">fully online store</span>
            </h1>
            <p className="mt-5 text-gray-600 dark:text-gray-400 text-lg max-w-lg">
              RetailHub gives every business its own branded storefront, order management, customer accounts
              and live analytics — all from a single owner dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/register" className="btn-primary rounded-full px-6 py-3 flex items-center gap-2">
                Register Your Business <HiArrowRight />
              </Link>
              <Link to="/login" className="btn-secondary rounded-full px-6 py-3">
                Owner Login
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl bg-gradient-to-br from-brand-500 to-brand-800 p-6 shadow-xl">
              <div className="rounded-2xl h-56 md:h-72 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80"
                  alt="RetailHub storefront"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-900/50 to-transparent" />
              </div>
            </div>
            {/* 3D floating shopping bag badge */}
            <motion.div
              className="absolute -top-6 right-6 bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-4 text-brand-600"
              animate={{ y: [0, -10, 0], rotate: [-4, 4, -4] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <HiOutlineShoppingBag className="text-4xl" />
            </motion.div>
            {/* Floating stat cards */}
            <div className="absolute -left-6 top-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
              <div className="bg-brand-100 dark:bg-gray-800 text-brand-700 dark:text-brand-400 rounded-full p-2">
                <HiOutlineChartBar />
              </div>
              <div>
                <p className="text-xs text-gray-500">Monthly Revenue</p>
                <p className="font-bold">₹1,24,500</p>
              </div>
            </div>
            <div className="absolute -right-4 bottom-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
              <div className="bg-green-100 dark:bg-gray-800 text-green-600 rounded-full p-2">
                <HiOutlineTruck />
              </div>
              <div>
                <p className="text-xs text-gray-500">Orders Delivered</p>
                <p className="font-bold">312</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature icon strip */}
      <section id="features" className="border-y border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="bg-brand-50 dark:bg-gray-900 text-brand-600 dark:text-brand-400 rounded-full p-3 text-xl">
                <Icon />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trusted-by strip (generic placeholders, not real brands) */}
      <section className="bg-gray-50 dark:bg-gray-900/40 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs uppercase tracking-wide text-gray-400 mb-5">
            Built for every kind of retail business
          </p>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-gray-400 dark:text-gray-600 font-semibold text-lg">
            <span>Fashion</span>
            <span>Electronics</span>
            <span>Grocery</span>
            <span>Bakery</span>
            <span>Footwear</span>
            <span>Home Decor</span>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section id="services" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Everything your business needs</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3">
            One platform that replaces a storefront builder, an order tracker, a CRM and a reporting tool.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {SERVICES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card hover:shadow-md transition-shadow">
              <div className="bg-brand-100 dark:bg-gray-800 text-brand-700 dark:text-brand-400 rounded-xl w-12 h-12 flex items-center justify-center text-xl mb-4">
                <Icon />
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats banner */}
      <section className="bg-brand-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl md:text-4xl font-extrabold text-brand-300">{value}</p>
              <p className="text-sm text-brand-200 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="flex justify-center gap-1 text-yellow-400 mb-4">
          {Array.from({ length: 5 }).map((_, i) => <HiStar key={i} />)}
        </div>
        <p className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-100">
          "Having one dashboard for products, orders and customers instead of three different tools
          saved us hours every week."
        </p>
        <p className="mt-5 text-gray-500 dark:text-gray-400 text-sm font-medium">
          — A RetailHub business owner
        </p>
      </section>

      {/* Insights / blog cards */}
      <section id="insights" className="bg-gray-50 dark:bg-gray-900/40 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Insights for growing your store
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {INSIGHTS.map(({ tag, title, desc }) => (
              <div key={title} className="card hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide">
                  {tag}
                </span>
                <h3 className="font-semibold text-lg mt-2 mb-2">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter / CTA bar */}
      <section id="contact" className="bg-brand-600">
        <div className="max-w-5xl mx-auto px-6 py-14 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <HiOutlineLightningBolt /> Ready to go online?
            </h3>
            <p className="text-brand-100 mt-1">Register your business and get your store link in minutes.</p>
          </div>
          <Link to="/register" className="bg-white text-brand-700 font-semibold px-6 py-3 rounded-full hover:bg-brand-50 transition-colors shrink-0">
            Register Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <p className="flex items-center gap-2 text-white font-bold text-lg mb-2">
              <HiOutlineCube /> RetailHub
            </p>
            <p className="text-gray-500">
              The multi-tenant SaaS platform that turns any offline retail business into a fully online store.
            </p>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Product</p>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-white">Features</a></li>
              <li><a href="#services" className="hover:text-white">Services</a></li>
              <li><a href="#insights" className="hover:text-white">Insights</a></li>
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Account</p>
            <ul className="space-y-2">
              <li><Link to="/register" className="hover:text-white">Register Business</Link></li>
              <li><Link to="/login" className="hover:text-white">Owner Login</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Contact</p>
            <ul className="space-y-2">
              <li>support@retailhub.example</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 text-center text-xs text-gray-500 py-5">
          © {new Date().getFullYear()} RetailHub. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
