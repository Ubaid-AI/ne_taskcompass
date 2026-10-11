/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // NE brand teal — matched to the National Enterprises emblem
        brand: {
          50: "#e7f7f3",
          100: "#c5ece3",
          200: "#91dccb",
          300: "#57c7b1",
          400: "#22ad96",
          500: "#0f9c86",
          600: "#0c806f",
          700: "#0b675a",
          800: "#0b524a",
          900: "#0c3b37",
          950: "#082825",
        },
        // NE wordmark green — used for the logo lockup accent
        forest: { 500: "#1e7a5c", 600: "#176b4f", 700: "#12563f" },
        success: { fg: "#1a7a4c", bg: "#e3f7ea", solid: "#22a35f" },
        warning: { fg: "#a3670a", bg: "#fdf1dc", solid: "#c9820c" },
        danger: { fg: "#b23a3a", bg: "#fbe6e6", solid: "#d14747" },
        info: { fg: "#0d5f69", bg: "#e6f7f9", solid: "#1291a3" },
      },
      boxShadow: {
        card: "0 2px 10px rgba(11,46,51,0.06)",
        pop: "0 12px 32px rgba(11,46,51,0.16)",
      },
      borderRadius: {
        xl2: "20px",
      },
    },
  },
  plugins: [],
};
