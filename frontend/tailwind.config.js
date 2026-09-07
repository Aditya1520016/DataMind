/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        primary: { DEFAULT: "#3B82F6", dark: "#2563EB", light: "#60A5FA" },
        surface: { dark: "#0D1117", light: "#FFFFFF" },
        card: { dark: "#111827", light: "#F8FAFF" },
        ink: { dark: "#07090F", light: "#F0F4FF" },
      },
      animation: {
        "fade-in": "fadeIn .25s ease forwards",
        "slide-up": "slideUp .3s ease forwards",
        "pulse-dot": "pulseDot 1s ease infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "none" } },
        slideUp: { from: { opacity: 0, transform: "translateY(20px)" }, to: { opacity: 1, transform: "none" } },
        pulseDot: { "0%,100%": { opacity: .3, transform: "scale(.8)" }, "50%": { opacity: 1, transform: "scale(1.1)" } },
      }
    }
  },
  plugins: []
}
