import { useEffect, useState } from "react";
import { useOutletContext, useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import customerApi from "../../api/customerAxios";
import { setCartCount } from "../../features/cart/cartSlice";

export default function CartPage() {
  const { slug } = useOutletContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);

  const fetchCart = async () => {
    try {
      const { data } = await customerApi.get("/cart");
      setCart(data.cart);
      dispatch(setCartCount(data.cart.items.reduce((s, i) => s + i.quantity, 0)));
    } catch {
      // not logged in or error - leave cart empty
    }
  };

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateQty = async (productId, quantity) => {
    const { data } = await customerApi.put(`/cart/${productId}`, { quantity });
    setCart(data.cart);
    dispatch(setCartCount(data.cart.items.reduce((s, i) => s + i.quantity, 0)));
  };

  const removeItem = async (productId) => {
    const { data } = await customerApi.delete(`/cart/${productId}`);
    setCart(data.cart);
    dispatch(setCartCount(data.cart.items.reduce((s, i) => s + i.quantity, 0)));
    toast.success("Item removed");
  };

  if (!cart) return <p className="text-gray-500">Loading cart...</p>;

  const total = cart.items.reduce((sum, i) => sum + (i.product?.finalPrice || 0) * i.quantity, 0);

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="font-display text-2xl font-bold">Your Cart</h1>
      {cart.items.length === 0 && (
        <p className="text-gray-500">
          Your cart is empty. <Link to={`/store/${slug}`} className="text-storeteal-600 font-medium">Continue shopping</Link>
        </p>
      )}
      {cart.items.map((item) => (
        <div key={item.product._id} className="store-card flex flex-wrap items-center gap-3 sm:gap-4 p-4">
          <div className="w-16 h-16 bg-storeteal-50 dark:bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
            {item.product.images?.[0] && <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-[120px]">
            <p className="font-medium truncate">{item.product.name}</p>
            <p className="text-sm text-storeteal-600 font-semibold">₹{item.product.finalPrice}</p>
          </div>
          <div className="flex items-center gap-3 ml-auto sm:ml-0">
            <input
              type="number"
              min={1}
              className="store-input w-16 text-center"
              value={item.quantity}
              onChange={(e) => updateQty(item.product._id, Number(e.target.value))}
            />
            <button onClick={() => removeItem(item.product._id)} className="text-red-500 text-sm shrink-0">Remove</button>
          </div>
        </div>
      ))}

      {cart.items.length > 0 && (
        <div className="store-card flex flex-wrap items-center justify-between gap-3 p-4">
          <span className="font-bold text-lg">Total: ₹{total}</span>
          <button className="store-btn-primary" onClick={() => navigate(`/store/${slug}/checkout`)}>
            Proceed to Checkout
          </button>
        </div>
      )}
    </div>
  );
}
