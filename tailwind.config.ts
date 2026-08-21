import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sea: {
          50: "#eef7fb",
          100: "#d6ecf5",
          200: "#aedaeb",
          300: "#79c0dc",
          400: "#3fa0c8",
          500: "#1f83ae",
          600: "#166a92",
          700: "#155676",
          800: "#164961",
          900: "#173e53",
        },
        sand: "#f7f3ea",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
