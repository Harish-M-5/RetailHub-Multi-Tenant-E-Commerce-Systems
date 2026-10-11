import { useEffect, useRef, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { HiCheckCircle, HiOutlineUpload } from "react-icons/hi";
import customerApi from "../../api/customerAxios";
import { setCartCount } from "../../features/cart/cartSlice";

export default function Checkout() {
  const { slug, business } = useOutletContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", state: "", pincode: "" });
  const [deliveryType, setDeliveryType] = useState("home_delivery");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [pickupStart, setPickupStart] = useState("");
  const [pickupEnd, setPickupEnd] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  // UPI payment proof
  const [amountPaid, setAmountPaid] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    customerApi.get("/cart").then(({ data }) => setCart(data.cart)).catch(() => {});
    customerApi.get("/customer/me").then(({ data }) => {
      setForm((f) => ({ ...f, name: data.customer.name, phone: data.customer.phone, email: data.customer.email || "" }));
    }).catch(() => {});
  }, []);

  if (placedOrder) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <HiCheckCircle className="text-green-500 text-6xl mx-auto" />
        <h1 className="font-display text-2xl font-bold">Order Placed!</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Order <span className="font-semibold">{placedOrder.orderNumber}</span> has been placed successfully.
          You can track its status anytime from My Orders.
        </p>
        <button onClick={() => navigate(`/store/${slug}/orders`)} className="store-btn-primary">
          Track My Order
        </button>
      </div>
    );
  }

  if (!cart) return <p className="text-gray-500">Loading...</p>;

  const subtotal = cart.items.reduce((sum, i) => sum + (i.product?.finalPrice || 0) * i.quantity, 0);
  const codCharge = business?.deliverySettings?.codCharge ?? 40;
  const deliveryCharge = paymentMethod === "cod" && deliveryType === "home_delivery" ? codCharge : 0;
  const total = subtotal + deliveryCharge;

  const qrImage =
    business?.paymentSettings?.genericUpiQr ||
    business?.paymentSettings?.googlePayQr ||
    business?.paymentSettings?.phonePeQr ||
    business?.paymentSettings?.paytmQr;

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    setUploading(true);
    try {
      const { data } = await customerApi.post("/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setScreenshot(data.url);
      toast.success("Payment screenshot uploaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const placeOrder = async () => {
    if (!form.name || !form.phone || !form.address || !form.city || !form.state || !form.pincode) {
      toast.error("Please fill in all shipping details");
      return;
    }
    if (deliveryType === "store_pickup" && (!pickupStart || !pickupEnd)) {
      toast.error("Choose the date range you'll come collect your order");
      return;
    }
    if (deliveryType === "store_pickup" && pickupEnd < pickupStart) {
      toast.error("Your end date can't be before your start date");
      return;
    }
    if (paymentMethod === "upi") {
      if (!qrImage) {
        toast.error("This store hasn't set up UPI payment - choose Cash on Delivery instead");
        return;
      }
      if (!amountPaid || Number(amountPaid) <= 0) {
        toast.error("Enter the amount you paid after scanning the QR code");
        return;
      }
      if (!screenshot) {
        toast.error("Upload your payment screenshot as proof");
        return;
      }
    }
    setPlacing(true);
    try {
      const { data } = await customerApi.post("/checkout", {
        shippingAddress: form,
        deliveryType,
        paymentMethod,
        paymentScreenshot: screenshot,
        amountPaid: paymentMethod === "upi" ? Number(amountPaid) : 0,
        expectedPickupDateStart: deliveryType === "store_pickup" ? pickupStart : undefined,
        expectedPickupDate: deliveryType === "store_pickup" ? pickupEnd : undefined,
      });
      dispatch(setCartCount(0));
      toast.success(`Order ${data.order.orderNumber} placed successfully!`);
      setPlacedOrder(data.order);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold">Checkout</h1>
        <div className="store-card space-y-3 p-5">
          <h2 className="font-semibold">Shipping Details</h2>
          {["name", "phone", "email", "address", "city", "state", "pincode"].map((field) => (
            <input
              key={field}
              className="store-input"
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            />
          ))}
        </div>

        <div className="store-card space-y-2 p-5">
          <h2 className="font-semibold">Delivery Type</h2>
          <label className="flex items-center gap-2">
            <input type="radio" checked={deliveryType === "home_delivery"} onChange={() => setDeliveryType("home_delivery")} />
            Home Delivery
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={deliveryType === "store_pickup"} onChange={() => setDeliveryType("store_pickup")} />
            Store Pickup
          </label>
          {deliveryType === "store_pickup" && (
            <div className="mt-1 pl-6 space-y-2">
              <label className="label">Date range you'll come collect it</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="store-input"
                  min={new Date().toISOString().slice(0, 10)}
                  value={pickupStart}
                  onChange={(e) => {
                    setPickupStart(e.target.value);
                    if (pickupEnd && pickupEnd < e.target.value) setPickupEnd(e.target.value);
                  }}
                />
                <span className="text-sm text-gray-400">to</span>
                <input
                  type="date"
                  className="store-input"
                  min={pickupStart || new Date().toISOString().slice(0, 10)}
                  value={pickupEnd}
                  onChange={(e) => setPickupEnd(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                The store will reserve your order for this window - if it isn't collected by the end date it may be
                released to another customer.
              </p>
            </div>
          )}
        </div>

        <div className="store-card space-y-2 p-5">
          <h2 className="font-semibold">Payment Method</h2>
          <label className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <input type="radio" checked={paymentMethod === "upi"} onChange={() => setPaymentMethod("upi")} />
              UPI QR Payment
            </span>
            <span className="store-pill">No delivery charge</span>
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <input type="radio" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
              Cash on Delivery
            </span>
            {deliveryType === "home_delivery" && (
              <span className="text-xs text-amber-600 font-medium">+₹{codCharge} delivery charge</span>
            )}
          </label>

          {paymentMethod === "upi" && (
            <div className="mt-3 text-center space-y-3">
              {qrImage ? (
                <>
                  <img src={qrImage} alt="UPI QR" className="w-40 h-40 mx-auto rounded-lg border" />
                  {business?.paymentSettings?.upiId && (
                    <p className="text-sm text-gray-500">UPI ID: {business.paymentSettings.upiId}</p>
                  )}
                  <p className="text-xs text-gray-400">Scan with any UPI app and pay ₹{total}, then fill in the details below.</p>

                  <div className="text-left space-y-2">
                    <label className="label">Amount you paid (₹)</label>
                    <input
                      type="number"
                      className="store-input"
                      placeholder={`${total}`}
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                    />
                    {amountPaid && Number(amountPaid) !== total && (
                      <p className="text-xs text-red-500">
                        This doesn't match the order total (₹{total}) - the owner will see it flagged as a mismatch.
                      </p>
                    )}

                    <label className="label mt-2">Payment screenshot</label>
                    {screenshot ? (
                      <div className="relative w-28 h-28">
                        <img src={screenshot} className="w-full h-full object-cover rounded-lg border" />
                        <button
                          type="button"
                          onClick={() => setScreenshot("")}
                          className="absolute -top-2 -right-2 bg-black/70 text-white rounded-full w-6 h-6 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="store-btn-outline text-sm flex items-center gap-1"
                      >
                        <HiOutlineUpload /> {uploading ? "Uploading..." : "Upload screenshot"}
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshotUpload} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-amber-600">This store hasn't set up a QR code yet - please choose Cash on Delivery.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="store-card h-fit space-y-3 p-5">
        <h2 className="font-semibold">Order Summary</h2>
        {cart.items.map((i) => (
          <div key={i.product._id} className="flex justify-between text-sm">
            <span>{i.product.name} x {i.quantity}</span>
            <span>₹{i.product.finalPrice * i.quantity}</span>
          </div>
        ))}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-sm text-gray-500">
          <span>Subtotal</span>
          <span>₹{subtotal}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Delivery charge</span>
          <span>{deliveryCharge > 0 ? `₹${deliveryCharge}` : "Free"}</span>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold">
          <span>Total</span>
          <span className="text-storeteal-700 dark:text-storeteal-400">₹{total}</span>
        </div>
        <button onClick={placeOrder} disabled={placing} className="store-btn-primary w-full">
          {placing ? "Placing order..." : "Place Order"}
        </button>
      </div>
    </div>
  );
}
