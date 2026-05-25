import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Tokens semânticos (CSS variables) ───────────────────────────────
        // Uso: bg-theme-bg, text-theme-primary, border-theme-base, etc.
        theme: {
          bg:            'rgb(var(--t-bg)      / <alpha-value>)', // canvas principal
          card:          'rgb(var(--t-card)    / <alpha-value>)', // painéis, cards
          surface:       'rgb(var(--t-surface) / <alpha-value>)', // inputs, botões, elevation
          raised:        'rgb(var(--t-raised)  / <alpha-value>)', // mais elevado
          border:        'rgb(var(--t-border)  / <alpha-value>)', // borda padrão
          'border-strong':'rgb(var(--t-border-strong) / <alpha-value>)',
          primary:       'rgb(var(--t-primary) / <alpha-value>)', // texto principal
          secondary:     'rgb(var(--t-secondary)/ <alpha-value>)',// texto secundário
          muted:         'rgb(var(--t-muted)   / <alpha-value>)', // texto apagado
        },
        background: "var(--background)",
        foreground:  "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
