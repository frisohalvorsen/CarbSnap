/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        carb: {
          50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa",
          400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c",
        },
        protein: {
          50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe",
          400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca",
        },
        cal: {
          50: "#fffbeb", 100: "#fef3c7", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706",
        },
        fit: {
          50: "#fdf2f8", 100: "#fce7f3", 400: "#e879f9", 500: "#d946ef", 600: "#c026d3",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
    },
  },
  plugins: [],
};
