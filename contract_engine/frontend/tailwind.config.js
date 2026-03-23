/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Primary Background — deep dark for premium feel
        "bg-primary": "#0a0a0f",
        "bg-secondary": "#111118",
        "bg-tertiary": "#1a1a24",

        // RED Accent Palette
        "accent-red": "#dc2626",
        "accent-red-dark": "#991b1b",
        "accent-red-light": "#f87171",
        "accent-red-glow": "#ef4444",

        // Gold Accent (secondary)
        "accent-gold": "#f59e0b",
        "accent-gold-light": "#fbbf24",

        // Neon accent for glows
        "accent-neon": "#ff3b3b",

        // Legacy aliases for gradual migration
        "accent-blue": "#dc2626",
        "accent-blue-dark": "#991b1b",
        "accent-blue-light": "#f87171",
        "accent-orange": "#f59e0b",
        "accent-orange-light": "#fbbf24",

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
          '"Inter"',
          '"Outfit"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          '"Roboto"',
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 20px rgba(220, 38, 38, 0.3)",
        "glow-lg": "0 0 40px rgba(220, 38, 38, 0.5)",
        "glow-red": "0 0 30px rgba(239, 68, 68, 0.4)",
        "glow-gold": "0 0 20px rgba(245, 158, 11, 0.3)",
        neon: "0 0 15px rgba(255, 59, 59, 0.5), 0 0 45px rgba(255, 59, 59, 0.2)",
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
        "neon-pulse": "neonPulse 2s ease-in-out infinite",
        shimmer: "shimmer 2s ease-in-out infinite",
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
          "0%, 100%": { boxShadow: "0 0 20px rgba(220, 38, 38, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(220, 38, 38, 0.5)" },
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
        neonPulse: {
          "0%, 100%": {
            boxShadow:
              "0 0 5px rgba(255, 59, 59, 0.4), 0 0 20px rgba(255, 59, 59, 0.2)",
          },
          "50%": {
            boxShadow:
              "0 0 10px rgba(255, 59, 59, 0.6), 0 0 40px rgba(255, 59, 59, 0.3)",
          },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
