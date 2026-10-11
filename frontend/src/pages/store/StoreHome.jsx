import { useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  HiOutlineTruck,
  HiOutlineRefresh,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineHeart,
  HiOutlineGift,
} from "react-icons/hi";
import api from "../../api/axios";
import customerApi from "../../api/customerAxios";
import { setCartCount } from "../../features/cart/cartSlice";
import StoreProductCard from "../../components/StoreProductCard";

const FEATURES = [
  { icon: HiOutlineTruck, label: "Free shipping over ₹999" },
  { icon: HiOutlineRefresh, label: "Pause, skip or cancel anytime" },
  { icon: HiOutlineSparkles, label: "Curated with love" },
  { icon: HiOutlineShieldCheck, label: "Secure payments" },
  { icon: HiOutlineHeart, label: "Happiness guarantee" },
];

const CIRCLE_COLORS = [
  "bg-rose-100 text-rose-600",
  "bg-amber-100 text-amber-600",
  "bg-sky-100 text-sky-600",
  "bg-violet-100 text-violet-600",
  "bg-emerald-100 text-emerald-600",
  "bg-fuchsia-100 text-fuchsia-600",
];

export default function StoreHome() {
  const { slug, business } = useOutletContext();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useSelector((s) => s.customer.isAuthenticated);
  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState("");

  const fetchProducts = async (overrideSearch) => {
    const { data } = await api.get(`/store/${slug}/products`, {
      params: { search: overrideSearch ?? search, category },
    });
    setProducts(data.products);
  };

  useEffect(() => {
    api.get(`/store/${slug}/categories`).then(({ data }) => setCategories(data.categories)).catch(() => {});
  }, [slug]);

  useEffect(() => {
    fetchProducts(searchParams.get("search") || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, category]);

  const requireLogin = () => toast.error("Please login to continue");

  const handleAddToCart = async (product) => {
    if (!isAuthenticated) return requireLogin();
    try {
      const { data } = await customerApi.post("/cart", { productId: product._id, quantity: 1 });
      const count = data.cart.items.reduce((sum, i) => sum + i.quantity, 0);
      dispatch(setCartCount(count));
      toast.success("Added to cart");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add to cart");
    }
  };

  const handleAddToWishlist = async (product) => {
    if (!isAuthenticated) return requireLogin();
    try {
      await customerApi.post("/wishlist", { productId: product._id });
      toast.success("Added to wishlist");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add to wishlist");
    }
  };

  const handleOrderNow = async (product) => {
    if (!isAuthenticated) return requireLogin();
    await handleAddToCart(product);
    window.location.href = `/store/${slug}/checkout`;
  };

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="grid md:grid-cols-2 gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="store-pill mb-3 inline-block">Welcome to {business?.businessName || "our store"}</p>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold leading-tight text-gray-900 dark:text-white">
            Thoughtfully picked. <br />
            <span className="text-storeteal-600 dark:text-storeteal-400">Delivered with care.</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-4 max-w-md">
            {business?.description || `Browse everything ${business?.businessName || "we"} has to offer, picked for quality and delivered straight to your door.`}
          </p>
          <div className="flex gap-3 mt-6">
            <a href="#products" className="store-btn-primary">Shop Now</a>
            <a href="#categories" className="store-btn-outline">Explore Categories</a>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="relative"
        >
          <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-storeteal-100 dark:bg-gray-800 flex items-center justify-center">
            {business?.banner ? (
              <img src={business.banner} alt="" className="w-full h-full object-cover" />
            ) : (
              <HiOutlineGift className="text-6xl text-storeteal-400" />
            )}
          </div>
        </motion.div>
      </section>

      {/* Feature strip */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-4 border-y border-storeteal-100 dark:border-gray-800 py-6">
        {FEATURES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center text-center gap-2">
            <Icon className="text-2xl text-storeteal-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
          </div>
        ))}
      </section>

      {/* Shop by category */}
      {categories.length > 0 && (
        <section id="categories">
          <h2 className="font-display text-xl font-bold text-center mb-6">Shop by Category</h2>
          <div className="flex gap-6 overflow-x-auto pb-2 justify-center flex-wrap">
            <button
              onClick={() => setCategory("")}
              className="flex flex-col items-center gap-2 shrink-0"
            >
              <span className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${category === "" ? "ring-2 ring-storeteal-500" : ""} bg-storeteal-100 text-storeteal-600`}>
                All
              </span>
              <span className="text-xs text-gray-500">Everything</span>
            </button>
            {categories.map((c, idx) => (
              <button
                key={c._id}
                onClick={() => setCategory(c._id)}
                className="flex flex-col items-center gap-2 shrink-0"
              >
                <span
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden ${category === c._id ? "ring-2 ring-storeteal-500" : ""} ${CIRCLE_COLORS[idx % CIRCLE_COLORS.length]}`}
                >
                  {c.image ? <img src={c.image} alt="" className="w-full h-full object-cover" /> : c.name[0]?.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500 text-center max-w-[70px] truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      <section id="products">
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <h2 className="font-display text-xl font-bold">
            {category ? categories.find((c) => c._id === category)?.name : "Popular Products"}
          </h2>
          <div className="flex gap-2">
            <input
              className="store-input max-w-[200px]"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchProducts()}
            />
            <button className="store-btn-outline text-sm py-2 px-4" onClick={() => fetchProducts()}>Search</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <StoreProductCard
              key={p._id}
              product={p}
              slug={slug}
              onAddToCart={handleAddToCart}
              onAddToWishlist={handleAddToWishlist}
              onOrderNow={handleOrderNow}
            />
          ))}
          {products.length === 0 && <p className="text-gray-500 col-span-full text-center py-10">No products found.</p>}
        </div>
      </section>

      {/* Promo banners */}
      <section className="grid md:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-rose-50 dark:bg-gray-900 p-6 flex items-center justify-between gap-4">
          <div>
            <p className="store-heading font-bold text-lg mb-1">Gift someone special</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">A thoughtful gift for any occasion.</p>
          </div>
          <HiOutlineGift className="text-4xl text-rose-400 shrink-0" />
        </div>
        <div className="rounded-2xl bg-storeteal-50 dark:bg-gray-900 p-6 flex items-center justify-between gap-4">
          <div>
            <p className="store-heading font-bold text-lg mb-1">New here?</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create an account to track orders and save your wishlist.</p>
          </div>
          <a href={`/store/${slug}/register`} className="store-btn-primary text-sm shrink-0">Sign Up</a>
        </div>
      </section>

      {/* Trust strip */}
      <section className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs text-gray-400 border-t border-storeteal-100 dark:border-gray-800 pt-8">
        <span>Verified Customer Reviews</span>
        <span>100% Secure Checkout</span>
        <span>Quality Guaranteed</span>
        <span>Easy Returns</span>
      </section>
    </div>
  );
}
