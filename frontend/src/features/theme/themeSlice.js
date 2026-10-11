import { createSlice } from "@reduxjs/toolkit";

const stored = (() => {
  try {
    return localStorage.getItem("retailhub-theme") || "light";
  } catch {
    return "light";
  }
})();

const themeSlice = createSlice({
  name: "theme",
  initialState: { mode: stored },
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", state.mode === "dark");
      try {
        localStorage.setItem("retailhub-theme", state.mode);
      } catch {}
    },
  },
});

export const { toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
