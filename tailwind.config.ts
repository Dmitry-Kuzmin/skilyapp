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
  // ОПТИМИЗАЦИЯ: Safelist для динамических классов, которые могут не попадать в purge
  // Это классы, используемые через переменные или template literals
  safelist: [
    // Arbitrary values для размеров текста (используются в Dashboard)
    'text-[8px]', 'text-[9px]', 'text-[10px]', 'text-[11px]',
    // Arbitrary values для цветов фона (используются в Dashboard и Landing)
    'bg-[#0f172a]', 'bg-[#f5f6fb]',
    // Arbitrary values для grid (используются в TestSession)
    'grid-cols-[1fr_380px]', 'grid-cols-[1fr_420px]', 'grid-cols-[320px_1fr]', 'grid-cols-[350px_1fr]',
    // Arbitrary values для высоты (используются в админке)
    'h-[400px]', 'max-h-[400px]',
    // Arbitrary values для ширины (используются в админке)
    'w-[200px]', 'w-[100px]', 'w-[120px]', 'w-[150px]', 'w-[80px]',
    'max-w-[200px]', 'max-w-[250px]', 'max-w-[300px]', 'max-w-[120px]',
    // Arbitrary values для opacity (используются в Dashboard)
    'opacity-[0.15]', 'opacity-[0.12]',
    // Классы для chart компонента
    'rounded-[2px]', 'border-[--color-border]', 'bg-[--color-bg]',
  ],
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
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
