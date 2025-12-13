/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Satoshi', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "var(--void-black)", // Using brand color
        foreground: "var(--pure-light)", // Using brand color

        // SoulMatch Brand Colors
        soul: {
          cyan: "var(--soul-cyan)",
          void: "var(--void-black)",
          light: "var(--pure-light)",
          indigo: "var(--accent-indigo)",
          violet: "var(--accent-violet)",
          glass: "var(--glass-border)",
        },

        // Archetype Colors (Divine Palette) - Keeping existing ones if needed, but prioritizing new system
        visionary: "var(--visionary)",
        endurance: "var(--endurance)",
        investor: "var(--investor)",
        purist: "var(--purist)",
        longevity: "var(--longevity)",
        devotee: "var(--devotee)",
        curator: "var(--curator)",
        connoisseur: "var(--connoisseur)",
        disciplinarian: "var(--disciplinarian)",
        efficiency: "var(--efficiency)",
        creator: "var(--creator)",
        realist: "var(--realist)",

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
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
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "breathing-glow": {
          "0%, 100%": { filter: "brightness(100%) drop-shadow(0 0 15px rgba(0, 212, 255, 0.3))" },
          "50%": { filter: "brightness(108%) drop-shadow(0 0 25px rgba(0, 212, 255, 0.6))" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "breathing-glow": "breathing-glow 4s ease-in-out infinite",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        "fade-in": "fade-in 0.7s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
