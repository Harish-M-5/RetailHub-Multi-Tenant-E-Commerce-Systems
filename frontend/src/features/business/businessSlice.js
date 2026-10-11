import { createSlice } from "@reduxjs/toolkit";

const businessSlice = createSlice({
  name: "business",
  initialState: { business: null },
  reducers: {
    setBusiness: (state, action) => {
      state.business = action.payload;
    },
    clearBusiness: (state) => {
      state.business = null;
    },
  },
});

export const { setBusiness, clearBusiness } = businessSlice.actions;
export default businessSlice.reducer;
