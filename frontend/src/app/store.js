import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import businessReducer from "../features/business/businessSlice";
import customerReducer from "../features/customer/customerSlice";
import cartReducer from "../features/cart/cartSlice";
import themeReducer from "../features/theme/themeSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    business: businessReducer,
    customer: customerReducer,
    cart: cartReducer,
    theme: themeReducer,
  },
});
