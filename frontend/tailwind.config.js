/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class', // ✅ class based dark mode
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Syne'", "sans-serif"],
        body:    ["'DM Sans'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"]
      },
      colors: {
        brand: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          900: "#0c4a6e"
        },
        dark: {
          900: "#080c14",
          800: "#0f1623",
          700: "#161f30",
          600: "#1e2a3d",
          500: "#253349"
        }
      }
    }
  },
  plugins: []
}