import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import api from "../api/axios";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

export default function Analytics() {
  const [categoryPerf, setCategoryPerf] = useState([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState([]);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState([]);
  const [repeatRate, setRepeatRate] = useState(null);

  useEffect(() => {
    api.get("/analytics/category-performance").then(({ data }) => setCategoryPerf(data.categoryPerformance));
    api.get("/analytics/payment-breakdown").then(({ data }) => setPaymentBreakdown(data.paymentBreakdown));
    api.get("/analytics/delivery-breakdown").then(({ data }) => setDeliveryBreakdown(data.deliveryBreakdown));
    api.get("/analytics/repeat-customer-rate").then(({ data }) => setRepeatRate(data));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Advanced Analytics</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-3">Category Performance (Revenue)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryPerf}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalRevenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Payment Method Breakdown</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={paymentBreakdown} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={90} label>
                {paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Delivery Type Breakdown</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={deliveryBreakdown} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={90} label>
                {deliveryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card flex flex-col items-center justify-center">
          <h3 className="font-semibold mb-3">Repeat Customer Rate</h3>
          <p className="text-4xl font-bold text-brand-600">{repeatRate?.repeatCustomerRate ?? 0}%</p>
          <p className="text-sm text-gray-500 mt-2">
            {repeatRate?.repeatCustomers ?? 0} of {repeatRate?.totalCustomers ?? 0} customers ordered more than once
          </p>
        </div>
      </div>
    </div>
  );
}
