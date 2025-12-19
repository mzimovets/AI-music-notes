import { heroui } from "@heroui/theme";

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Кастомные значения для более плавных теней
      scrollShadow: {
        smooth: "0 0 60px rgba(0,0,0,0.1)",
      },
      colors: {
        page: "#F7F4F1",
        navbar: "#F7F4F1",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },

  plugins: [heroui()],
};

module.exports = config;
