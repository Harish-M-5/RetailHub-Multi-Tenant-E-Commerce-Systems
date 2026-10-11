import axios from "axios";
import { store } from "../app/store";
import { setAccessToken, logoutLocal } from "../features/auth/authSlice";

// VITE_API_URL = the backend's own origin (e.g. https://retailhub-api.onrender.com),
// set as an env var on Vercel. Left unset locally so "/api" stays relative and
// goes through the Vite dev proxy to localhost:5000 (see vite.config.js).
const API_ORIGIN = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue = [];

const processQueue = (error, token) => {
  queue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // FIX ("No refresh token provided" showing up for wrong-password logins):
    // Login/register/google calls returning 401 (e.g. wrong password) must
    // NEVER be treated as a stale-access-token situation and sent through
    // the refresh flow - that swallowed the real "Invalid email or
    // password" message and replaced it with the refresh call's own
    // failure message. Excluding auth endpoints from this branch fixes it.
    const isAuthEndpoint = /\/auth\/(login|register|google)(\?|$)/.test(original?.url || "");

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post(
          `${API_ORIGIN}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        store.dispatch(setAccessToken(data.accessToken));
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        store.dispatch(logoutLocal());
        const sessionError = new Error("Your session has expired. Please log in again.");
        sessionError.response = {
          status: 401,
          data: { message: "Your session has expired. Please log in again." },
        };
        return Promise.reject(sessionError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
