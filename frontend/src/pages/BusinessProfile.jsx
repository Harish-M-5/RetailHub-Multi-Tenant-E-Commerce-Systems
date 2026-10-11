import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import api from "../api/axios";
import { setBusiness } from "../features/business/businessSlice";
import ImageUploadField from "../components/ImageUploadField";

export default function BusinessProfile() {
  const business = useSelector((s) => s.business.business);
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    businessName: "",
    businessType: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
    description: "",
  });
  const [payment, setPayment] = useState({
    googlePayQr: "",
    phonePeQr: "",
    paytmQr: "",
    genericUpiQr: "",
    upiId: "",
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [codCharge, setCodCharge] = useState(40);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingDelivery, setSavingDelivery] = useState(false);

  useEffect(() => {
    if (business) {
      setForm({
        businessName: business.businessName || "",
        businessType: business.businessType || "",
        address: business.address || "",
        city: business.city || "",
        state: business.state || "",
        pincode: business.pincode || "",
        gstNumber: business.gstNumber || "",
        description: business.description || "",
      });
      setPayment({
        googlePayQr: business.paymentSettings?.googlePayQr || "",
        phonePeQr: business.paymentSettings?.phonePeQr || "",
        paytmQr: business.paymentSettings?.paytmQr || "",
        genericUpiQr: business.paymentSettings?.genericUpiQr || "",
        upiId: business.paymentSettings?.upiId || "",
      });
      setCodCharge(business.deliverySettings?.codCharge ?? 40);
    }
  }, [business]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.put("/business/me", form);
      dispatch(setBusiness(data.business));
      toast.success("Business profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogoUploaded = async (url) => {
    const { data } = await api.put("/business/me", { logo: url });
    dispatch(setBusiness(data.business));
  };

  const handleBannerUploaded = async (url) => {
    const { data } = await api.put("/business/me", { banner: url });
    dispatch(setBusiness(data.business));
  };

  const savePaymentSettings = async (e) => {
    e.preventDefault();
    setSavingPayment(true);
    try {
      const { data } = await api.put("/business/payment-settings", payment);
      dispatch(setBusiness(data.business));
      toast.success("Payment settings saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSavingPayment(false);
    }
  };

  const saveDeliverySettings = async (e) => {
    e.preventDefault();
    setSavingDelivery(true);
    try {
      const { data } = await api.put("/business/delivery-settings", { codCharge });
      dispatch(setBusiness(data.business));
      toast.success("Delivery settings saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSavingDelivery(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      await api.put("/business/change-password", passwords);
      toast.success("Password changed successfully");
      setPasswords({ currentPassword: "", newPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Password change failed");
    }
  };

  const deleteBusiness = async () => {
    if (!window.confirm("This will PERMANENTLY delete your business and all its data. Continue?")) return;
    try {
      await api.delete("/business/me");
      toast.success("Business deleted");
      window.location.href = "/";
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Business Profile</h1>

      <div className="card space-y-4">
        <h2 className="font-semibold">Logo & Banner</h2>
        <div className="flex gap-6">
          <ImageUploadField label="Logo" value={business?.logo} onChange={handleLogoUploaded} />
          <ImageUploadField label="Banner" value={business?.banner} onChange={handleBannerUploaded} />
        </div>
      </div>

      <form onSubmit={saveProfile} className="card space-y-4">
        <h2 className="font-semibold">Business Details</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Business Name</label>
            <input className="input" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          </div>
          <div>
            <label className="label">Business Type</label>
            <input className="input" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <label className="label">State</label>
            <input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </div>
          <div>
            <label className="label">Pincode</label>
            <input className="input" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
          </div>
          <div>
            <label className="label">GST Number</label>
            <input className="input" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <button className="btn-primary" disabled={savingProfile}>{savingProfile ? "Saving..." : "Save Changes"}</button>
      </form>

      {/* Payment Settings - UPI QR upload UI (was previously missing from the frontend). */}
      <form onSubmit={savePaymentSettings} className="card space-y-4">
        <h2 className="font-semibold">Payment Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Upload your UPI QR codes so customers can scan and pay directly at checkout.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ImageUploadField label="Google Pay QR" value={payment.googlePayQr} onChange={(url) => setPayment({ ...payment, googlePayQr: url })} />
          <ImageUploadField label="PhonePe QR" value={payment.phonePeQr} onChange={(url) => setPayment({ ...payment, phonePeQr: url })} />
          <ImageUploadField label="Paytm QR" value={payment.paytmQr} onChange={(url) => setPayment({ ...payment, paytmQr: url })} />
          <ImageUploadField label="Generic UPI QR" value={payment.genericUpiQr} onChange={(url) => setPayment({ ...payment, genericUpiQr: url })} />
        </div>
        <div>
          <label className="label">UPI ID</label>
          <input className="input max-w-xs" placeholder="yourname@upi" value={payment.upiId} onChange={(e) => setPayment({ ...payment, upiId: e.target.value })} />
        </div>
        <button className="btn-primary" disabled={savingPayment}>{savingPayment ? "Saving..." : "Save Payment Settings"}</button>
      </form>

      {/* Delivery charge - Cash on Delivery carries this fee, online/UPI never does. */}
      <form onSubmit={saveDeliverySettings} className="card space-y-4">
        <h2 className="font-semibold">Delivery Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Charged only for Cash on Delivery + home delivery orders. Online/UPI payment and store pickup never carry a delivery charge.
        </p>
        <div>
          <label className="label">Cash on Delivery charge (₹)</label>
          <input
            type="number"
            min="0"
            className="input max-w-xs"
            value={codCharge}
            onChange={(e) => setCodCharge(e.target.value)}
          />
        </div>
        <button className="btn-primary" disabled={savingDelivery}>{savingDelivery ? "Saving..." : "Save Delivery Settings"}</button>
      </form>

      <form onSubmit={changePassword} className="card space-y-4">
        <h2 className="font-semibold">Change Password</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
          </div>
        </div>
        <button className="btn-secondary">Change Password</button>
      </form>

      <div className="card border-red-200 dark:border-red-900">
        <h2 className="font-semibold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-3">Permanently delete your business account and all associated data.</p>
        <button onClick={deleteBusiness} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium">
          Delete Business Account
        </button>
      </div>
    </div>
  );
}
