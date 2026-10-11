import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import customerApi from "../../api/customerAxios";
import { setCartCount } from "../../features/cart/cartSlice";
import StoreProductCard from "../../components/StoreProductCard";

export default function Wishlist() {
  const { slug } = useOutletContext();
  const dispatch = useDispatch();
  const [wishlist, setWishlist] = useState([]);

  const fetchWishlist = async () => {
    try {
      const { data } = await customerApi.get("/wishlist");
      setWishlist(data.wishlist);
    } catch {
      // not logged in
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleAddToCart = async (product) => {
    try {
      const { data } = await customerApi.post("/cart", { productId: product._id, quantity: 1 });
      dispatch(setCartCount(data.cart.items.reduce((s, i) => s + i.quantity, 0)));
      toast.success("Added to cart");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add to cart");
    }
  };

  const handleRemove = async (product) => {
    const { data } = await customerApi.delete(`/wishlist/${product._id}`);
    setWishlist(data.wishlist);
  };

  const handleOrderNow = async (product) => {
    await handleAddToCart(product);
    window.location.href = `/store/${slug}/checkout`;
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Your Wishlist</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {wishlist.map((p) => (
          <StoreProductCard
            key={p._id}
            product={p}
            slug={slug}
            isWishlisted
            onAddToCart={handleAddToCart}
            onAddToWishlist={handleRemove}
            onOrderNow={handleOrderNow}
          />
        ))}
        {wishlist.length === 0 && <p className="text-gray-500 col-span-full text-center py-10">Your wishlist is empty.</p>}
      </div>
    </div>
  );
}
