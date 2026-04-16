/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f4ff",
          100: "#dbe4ff",
          500: "#4361ee",
          600: "#3a52d4",
          700: "#3145b8",
          900: "#1e2d6e",
        },
        accent: {
          500: "#7209b7",
          600: "#5e07a0",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
