import { createSlice } from "@reduxjs/toolkit";

const customerSlice = createSlice({
  name: "customer",
  initialState: {
    accessToken: null,
    customer: null,
    isAuthenticated: false,
    storeSlug: null,
  },
  reducers: {
    setCustomerAccessToken: (state, action) => {
      state.accessToken = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setStoreSlug: (state, action) => {
      state.storeSlug = action.payload;
    },
    customerLoginSuccess: (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.customer = action.payload.customer;
      state.isAuthenticated = true;
    },
    customerLogoutLocal: (state) => {
      state.accessToken = null;
      state.customer = null;
      state.isAuthenticated = false;
    },
  },
});

export const {
  setCustomerAccessToken,
  setStoreSlug,
  customerLoginSuccess,
  customerLogoutLocal,
} = customerSlice.actions;
export default customerSlice.reducer;
