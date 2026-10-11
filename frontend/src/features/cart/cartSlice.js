import { createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
  name: "cart",
  initialState: { count: 0 },
  reducers: {
    setCartCount: (state, action) => {
      state.count = action.payload;
    },
  },
});

export const { setCartCount } = cartSlice.actions;
export default cartSlice.reducer;
