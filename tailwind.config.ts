import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  // ОПТИМИЗАЦИЯ: Оптимизированные content paths (убраны дубликаты)
  // src/**/*.{ts,tsx} уже включает pages и components
  content: [
    "./src/**/*.{ts,tsx}",
    "./index.html",
    "!./node_modules/**/*",
  ],
  prefix: "",
  // safelist очищен: ранее использовался широкий паттерн, который ничего не матчил и засорял логи
  safelist: [],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      screens: {
        "xs": "475px",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Telegram Safe Area Utilities
      padding: {
        "safe-top": "var(--tg-content-safe-area-inset-top, 0px)",
        "safe-bottom": "var(--tg-content-safe-area-inset-bottom, 0px)",
        "safe-left": "var(--tg-content-safe-area-inset-left, 0px)",
        "safe-right": "var(--tg-content-safe-area-inset-right, 0px)",
      },
      height: {
        "tg-screen": "var(--tg-viewport-stable-height, 100vh)",
      },
      minHeight: {
        "tg-screen": "var(--tg-viewport-stable-height, 100vh)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(40px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        shake: {
          "10%, 90%": { transform: "translate3d(-1px, 0, 0)" },
          "20%, 80%": { transform: "translate3d(2px, 0, 0)" },
          "30%, 50%, 70%": { transform: "translate3d(-4px, 0, 0)" },
          "40%, 60%": { transform: "translate3d(4px, 0, 0)" },
        },
        scan: {
          "0%, 100%": { top: "0%" },
          "50%": { top: "100%" },
        },
        "scan-vertical": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        meshMove: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "premium-glow": {
          "0%, 100%": {
            boxShadow: "0 0 20px rgba(234, 179, 8, 0.4), 0 0 40px rgba(249, 115, 22, 0.2), 0 0 0 3px rgba(234, 179, 8, 0.5)"
          },
          "50%": {
            boxShadow: "0 0 30px rgba(234, 179, 8, 0.6), 0 0 60px rgba(249, 115, 22, 0.4), 0 0 0 4px rgba(234, 179, 8, 0.7)"
          },
        },
        "premium-rotate": {
          "0%": {
            transform: "rotate(0deg)",
            backgroundPosition: "0% 50%"
          },
          "100%": {
            transform: "rotate(360deg)",
            backgroundPosition: "200% 50%"
          },
        },
        "crown-bounce": {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-2px) scale(1.05)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
        "premium-glow": "premium-glow 3s ease-in-out infinite",
        "premium-rotate": "premium-rotate 8s linear infinite",
        "crown-bounce": "crown-bounce 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        "spin-slow": "spin-slow 12s linear infinite",
        shake: "shake 0.5s cubic-bezier(.36,.07,.19,.97) both infinite",
        "scan-vertical": "scan-vertical 3s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
