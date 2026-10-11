import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";

export default function Inventory() {
  const [products, setProducts] = useState([]);

  const fetchInventory = () => {
    api.get("/inventory").then(({ data }) => setProducts(data.products));
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const updateStock = async (id, quantity) => {
    try {
      await api.put(`/inventory/${id}/stock`, { quantity: Number(quantity) });
      toast.success("Stock updated");
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inventory Management</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <th className="py-2">Product</th>
              <th>SKU</th>
              <th>Quantity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id} className="border-b border-gray-50 dark:border-gray-900">
                <td className="py-2">{p.name}</td>
                <td>{p.sku}</td>
                <td>
                  <input
                    type="number"
                    defaultValue={p.quantity}
                    className="input w-24"
                    onBlur={(e) => {
                      if (Number(e.target.value) !== p.quantity) updateStock(p._id, e.target.value);
                    }}
                  />
                </td>
                <td>
                  <span className={p.stockStatus === "out_of_stock" ? "text-red-500" : p.stockStatus === "low_stock" ? "text-amber-500" : "text-green-600"}>
                    {p.stockStatus.replace(/_/g, " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <p className="text-gray-500 py-4">No products yet.</p>}
      </div>
    </div>
  );
}
