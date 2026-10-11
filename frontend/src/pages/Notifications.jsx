import { useEffect, useState } from "react";
import api from "../api/axios";
import { getSocket } from "../api/socket";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.get("/notifications").then(({ data }) => setNotifications(data.notifications));

    // Live updates - new order/payment/stock notifications appear here
    // instantly instead of waiting for a page reload (see NotificationBell
    // for the same pattern + backend/utils/socket.js for the push).
    const socket = getSocket();
    const onNew = (notification) => setNotifications((prev) => [notification, ...prev]);
    socket.on("notification:new", onNew);
    return () => socket.off("notification:new", onNew);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <div className="card divide-y divide-gray-100 dark:divide-gray-800">
        {notifications.map((n) => (
          <div key={n._id} className="py-3">
            <p className="font-medium">{n.title}</p>
            <p className="text-sm text-gray-500">{n.message}</p>
            <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
          </div>
        ))}
        {notifications.length === 0 && <p className="text-gray-500 py-4">No notifications yet.</p>}
      </div>
    </div>
  );
}
