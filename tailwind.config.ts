import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // RCG orange — primary action color
        brand: {
          50:  "#fff5eb",
          100: "#ffe4c3",
          200: "#ffca8a",
          300: "#ffaa4d",
          400: "#ff8d1f",
          500: "#f07820",
          600: "#d9630f",
          700: "#b84e0a",
          800: "#923c07",
          900: "#762f04",
        },
        // RCG dark teal — header, sidebar, deep accents
        rcg: {
          50:  "#e8f4f3",
          100: "#c4e3e1",
          200: "#9acfcc",
          300: "#65b5b1",
          400: "#319f9a",
          500: "#1a8480",
          600: "#136764",
          700: "#0e4e4b",
          800: "#0a3735",
          850: "#092f2d",
          900: "#0d2b2a",
          950: "#081e1d",
        },
      },
      fontFamily: {
        sans: ["Montserrat", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
