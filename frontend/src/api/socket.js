import { io } from "socket.io-client";

// Single shared Socket.io connection for the whole tab. Locally VITE_API_URL
// is unset, so this connects to "/" (same origin) and the Vite dev proxy
// forwards it to localhost:5000, ws included (see vite.config.js). In
// production (Vercel + Render are different domains) VITE_API_URL points
// straight at the Render backend.
let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || "/", {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};
