import axios from "axios";
import { store } from "../app/store";
import { setCustomerAccessToken, customerLogoutLocal } from "../features/customer/customerSlice";

// See api/axios.js for why this is blank locally (relative "/api", via the
// Vite proxy) and set to the Render backend's origin in production.
const API_ORIGIN = import.meta.env.VITE_API_URL || "";

const customerApi = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  withCredentials: true,
});

customerApi.interceptors.request.use((config) => {
  const token = store.getState().customer.accessToken;
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

customerApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url = original?.url || "";

    // Same fix as the owner axios instance: never route a customer
    // login/register 401 (wrong password, duplicate email, etc.) through
    // the refresh-retry flow.
    const isAuthEndpoint = /\/auth\/(login|register)(\?|$)/.test(url) || url.includes("/auth/");

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return customerApi(original);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      try {
        const slug = store.getState().customer.storeSlug || "store";
        const { data } = await axios.post(
          `${API_ORIGIN}/api/store/${slug}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        store.dispatch(setCustomerAccessToken(data.accessToken));
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return customerApi(original);
      } catch (err) {
        processQueue(err, null);
        store.dispatch(customerLogoutLocal());
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

export default customerApi;
