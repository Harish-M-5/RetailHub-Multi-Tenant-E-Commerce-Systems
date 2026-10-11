import { useEffect, useState } from "react";
import { HiOutlineBell } from "react-icons/hi";
import toast from "react-hot-toast";
import api from "../api/axios";
import { getSocket } from "../api/socket";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent - notifications are non-critical
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Real-time push (see backend/utils/socket.js) - the poll below stays
    // as a safety net in case the socket connection drops.
    const socket = getSocket();
    const handleNew = (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
      setUnreadCount((prev) => prev + 1);
      toast(notification.title, { icon: "🔔" });
    };
    socket.on("notification:new", handleNew);

    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      socket.off("notification:new", handleNew);
      clearInterval(interval);
    };
  }, []);

  const handleOpen = async () => {
    setOpen(!open);
    if (!open && unreadCount > 0) {
      await api.patch("/notifications/read-all");
      setUnreadCount(0);
    }
  };

  return (
    <div className="relative">
      <button onClick={handleOpen} className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
        <HiOutlineBell className="text-xl" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-h-96 overflow-y-auto card z-50 shadow-lg">
          <h3 className="font-semibold mb-2">Notifications</h3>
          {notifications.length === 0 && (
            <p className="text-sm text-gray-500">No notifications yet</p>
          )}
          {notifications.map((n) => (
            <div key={n._id} className="py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-gray-500">{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
