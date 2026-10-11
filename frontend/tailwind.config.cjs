const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Owner dashboard now shares the same green/teal hue as the
        // storefront (storeteal below) instead of its old indigo palette -
        // every bg-brand-*/text-brand-*/border-brand-* class across the
        // dashboard picks this up automatically, no per-component changes.
        brand: {
          50: "#eefaf6",
          100: "#d7f1e9",
          200: "#aee3d3",
          300: "#7ccfb5",
          400: "#4ab999",
          500: "#2f9c7e",
          600: "#237d64",
          700: "#1d6652",
          800: "#184f40",
          900: "#123b30",
        },
        // Storefront palette - warm cream background + teal accent, matching
        // the reference design (boxjoy-style subscription storefront).
        storeteal: {
          50: "#eefaf6",
          100: "#d7f1e9",
          200: "#aee3d3",
          400: "#4ab999",
          500: "#2f9c7e",
          600: "#237d64",
          700: "#1d6652",
        },
        cream: {
          50: "#fdfaf5",
          100: "#faf4e9",
          200: "#f3e8d3",
        },
      },
      fontFamily: {
        // Global default (picked up by Tailwind's own preflight on
        // html/body) - this is what gives the owner dashboard its own
        // distinct, modern look without touching every dashboard page.
        sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui"],
        // Storefront body/button text (applied via the .storefront
        // wrapper class in index.css, overriding the sans default above).
        display: ["Poppins", "ui-sans-serif", "system-ui"],
        // Storefront display headings - see the ".storefront h1/h2/.font-display"
        // rule in index.css for where this is actually used.
        serif: ["Fraunces", "ui-serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [heroui()],
};
