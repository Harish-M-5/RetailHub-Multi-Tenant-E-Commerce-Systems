import { Link } from "react-router-dom";
import { HiHeart, HiOutlineHeart, HiOutlineShoppingBag, HiStar } from "react-icons/hi";

export default function StoreProductCard({ product, slug, onAddToCart, onAddToWishlist, onOrderNow, isWishlisted }) {
  const canOrder = product.deliveryType !== "offline_only" && product.stockStatus !== "out_of_stock";

  return (
    <div className="store-card group">
      <Link to={`/store/${slug}/product/${product._id}`} className="block relative">
        <div className="h-40 sm:h-44 bg-storeteal-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span className="text-storeteal-300 text-sm">No image</span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onAddToWishlist(product);
          }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-900/90 shadow flex items-center justify-center text-storeteal-600 hover:scale-110 transition-transform"
        >
          {isWishlisted ? <HiHeart className="text-red-500" /> : <HiOutlineHeart />}
        </button>
      </Link>

      <div className="p-3.5">
        <Link to={`/store/${slug}/product/${product._id}`}>
          <h3 className="font-medium text-sm truncate">{product.name}</h3>
        </Link>

        <div className="flex items-center gap-1 mt-1 text-amber-400 text-xs">
          <HiStar /><HiStar /><HiStar /><HiStar /><HiStar className="text-gray-200 dark:text-gray-700" />
          <span className="text-gray-400 ml-1">(new)</span>
        </div>

        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-bold text-storeteal-700 dark:text-storeteal-400">₹{product.finalPrice}</span>
          {product.discount > 0 && <span className="text-xs text-gray-400 line-through">₹{product.price}</span>}
        </div>

        {product.deliveryType === "offline_only" && (
          <p className="text-xs text-amber-600 mt-1">Available only in store</p>
        )}
        {product.stockStatus === "out_of_stock" && <p className="text-xs text-red-500 mt-1">Out of stock</p>}

        {canOrder && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onAddToCart(product)}
              className="flex-1 text-xs font-semibold border-2 border-storeteal-500 text-storeteal-600 dark:text-storeteal-400 rounded-full py-1.5 hover:bg-storeteal-50 dark:hover:bg-gray-800 transition-colors"
            >
              Add to Cart
            </button>
            <button
              onClick={() => onOrderNow(product)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-storeteal-500 hover:bg-storeteal-600 text-white shrink-0"
              title="Order Now"
            >
              <HiOutlineShoppingBag className="text-sm" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
