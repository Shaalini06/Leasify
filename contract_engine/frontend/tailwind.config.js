/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Primary Background
        "bg-primary": "#0f1419",
        "bg-secondary": "#1a1f2e",
        "bg-tertiary": "#232a3a",

        // Accent Colors
        "accent-blue": "#3b82f6",
        "accent-blue-dark": "#1e40af",
        "accent-blue-light": "#60a5fa",
        "accent-orange": "#f97316",
        "accent-orange-light": "#fb923c",

        // Text Colors
        "text-primary": "#f5f5f5",
        "text-secondary": "#b4b4b8",
        "text-tertiary": "#71717a",
      },
      backdropBlur: {
        xl: "20px",
        "2xl": "40px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          '"Roboto"',
          '"Oxygen"',
          '"Ubuntu"',
          '"Cantarell"',
          '"Fira Sans"',
          '"Droid Sans"',
          '"Helvetica Neue"',
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 20px rgba(59, 130, 246, 0.3)",
        "glow-lg": "0 0 40px rgba(59, 130, 246, 0.5)",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "slide-in-right":
          "slideInRight 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "slide-in-left":
          "slideInLeft 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        glow: "glow 2s ease-in-out infinite",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        "spin-slow": "spin-slow 20s linear infinite",
        "car-float": "carFloat 3s ease-in-out infinite",
        "car-move": "carMove 8s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(30px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          from: { opacity: "0", transform: "translateX(-30px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(59, 130, 246, 0.5)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        carFloat: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        carMove: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(100vw)" },
        },
      },
    },
  },
  plugins: [],
};
