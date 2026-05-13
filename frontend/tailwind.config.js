/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        obsidian:  "#080B10",
        vault:     "#0D1117",
        chamber:   "#111827",
        border:    "#1F2937",
        gold:      "#C9A84C",
        "gold-lt": "#E2C97A",
        "gold-dk": "#8B6914",
        platinum:  "#E8E8E8",
        mist:      "#9CA3AF",
        risk: {
          low:  "#22C55E",
          mid:  "#F59E0B",
          high: "#EF4444",
        },
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", "Georgia", "serif"],
        body:    ["'DM Sans'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "gold-gradient":  "linear-gradient(135deg, #C9A84C 0%, #E2C97A 50%, #C9A84C 100%)",
        "vault-gradient": "linear-gradient(180deg, #080B10 0%, #0D1117 100%)",
        "card-gradient":  "linear-gradient(145deg, #111827 0%, #0D1117 100%)",
      },
      animation: {
        "shimmer":       "shimmer 2.5s linear infinite",
        "pulse-gold":    "pulseGold 2s ease-in-out infinite",
        "fade-in-up":    "fadeInUp 0.6s ease forwards",
        "scan":          "scan 3s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(201,168,76,0.4)" },
          "50%":      { boxShadow: "0 0 0 8px rgba(201,168,76,0)" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        scan: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(200%)" },
        },
      },
    },
  },
  plugins: [],
};
