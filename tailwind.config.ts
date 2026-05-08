import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#b3922f",
          50: "#fdf6ec",
          100: "#fbf4dd",
          200: "#f9efc5",
          300: "#f7e9ad",
          400: "#f5e395",
          500: "#f3dd7d",
          600: "#b3922f",
          700: "#8f7626",
          800: "#6b5a1e",
          900: "#473d16",
        },
        secondary: {
          DEFAULT: "#063b29",
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        accent: {
          DEFAULT: "#10b981",
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        background: {
          DEFAULT: "#f5f0e8",
          50: "#fffaf6",
          100: "#fff5ed",
          200: "#feebde",
          300: "#fde2cf",
          400: "#fcd9c0",
          500: "#fbd0b1",
          600: "#f5f0e8",
          700: "#c4bcba",
          800: "#938788",
          900: "#626266",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;