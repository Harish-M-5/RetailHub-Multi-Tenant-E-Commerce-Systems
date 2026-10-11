import { useEffect, useState } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { HiOutlineShoppingCart, HiOutlineShoppingBag, HiOutlineHeart } from "react-icons/hi";
import api from "../../api/axios";
import customerApi from "../../api/customerAxios";
import { setCartCount } from "../../features/cart/cartSlice";

export default function ProductDetail() {
  const { productId } = useParams();
  const { slug } = useOutletContext();
  const isAuthenticated = useSelector((s) => s.customer.isAuthenticated);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    api.get(`/store/${slug}/products/${productId}`).then(({ data }) => setProduct(data.product)).catch(() => {});
  }, [slug, productId]);

  if (!product) return <p className="text-gray-500">Loading...</p>;

  const canOrder = product.deliveryType !== "offline_only" && product.stockStatus !== "out_of_stock";

  const addToCart = async () => {
    if (!isAuthenticated) return toast.error("Please login to continue");
    try {
      const { data } = await customerApi.post("/cart", { productId: product._id, quantity: 1 });
      const count = data.cart.items.reduce((sum, i) => sum + i.quantity, 0);
      dispatch(setCartCount(count));
      toast.success("Added to cart");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add to cart");
    }
  };

  const onOrderNow = async () => {
    if (!isAuthenticated) return toast.error("Please login to continue");
    await addToCart();
    navigate(`/store/${slug}/checkout`);
  };

  const addToWishlist = async () => {
    if (!isAuthenticated) return toast.error("Please login to continue");
    try {
      await customerApi.post("/wishlist", { productId: product._id });
      toast.success("Added to wishlist");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add to wishlist");
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-10">
      <div className="aspect-square rounded-3xl bg-storeteal-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-storeteal-300">No image</span>
        )}
      </div>
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold">{product.name}</h1>
        <p className="text-gray-500 dark:text-gray-400">{product.brand}</p>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-storeteal-700 dark:text-storeteal-400">₹{product.finalPrice}</span>
          {product.discount > 0 && (
            <>
              <span className="text-gray-400 line-through">₹{product.price}</span>
              <span className="store-pill">{product.discount}% off</span>
            </>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-300">{product.description}</p>

        {product.deliveryType === "offline_only" && (
          <p className="text-amber-600 font-medium">Available only in store</p>
        )}
        {product.stockStatus === "out_of_stock" && <p className="text-red-500 font-medium">Out of stock</p>}
        {product.stockStatus === "low_stock" && <p className="text-amber-600 font-medium">Hurry, only a few left!</p>}

        {canOrder && (
          <div className="flex flex-wrap gap-3">
            <button onClick={addToCart} className="store-btn-outline flex items-center gap-2">
              <HiOutlineShoppingCart /> Add to Cart
            </button>
            <button onClick={onOrderNow} className="store-btn-primary flex items-center gap-2">
              <HiOutlineShoppingBag /> Order Now
            </button>
          </div>
        )}
        <button onClick={addToWishlist} className="flex items-center gap-2 text-gray-500 hover:text-red-500">
          <HiOutlineHeart /> Add to Wishlist
        </button>
      </div>
    </div>
  );
}
