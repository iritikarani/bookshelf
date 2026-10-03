import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Gloock"', '"DM Serif Display"', "Georgia", "serif"],
        sans: ['"Libre Franklin"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        wall: "rgb(var(--wall) / <alpha-value>)",
        "wall-deep": "rgb(var(--wall-deep) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-soft": "rgb(var(--ink-soft) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-ink": "rgb(var(--accent-ink) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
      },
      keyframes: {
        "drop-in": {
          "0%": { transform: "translateY(-60px) rotate(-6deg)", opacity: "0" },
          "60%": { transform: "translateY(6px) rotate(1deg)", opacity: "1" },
          "100%": { transform: "translateY(0) rotate(0)", opacity: "1" },
        },
        "sheet-up": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        "panel-in": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "book-open": {
          from: { opacity: "0", transform: "translate(-50%, -48%) perspective(1200px) rotateX(8deg) scale(0.94)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) perspective(1200px) rotateX(0) scale(1)" },
        },
      },
      animation: {
        "drop-in": "drop-in 700ms cubic-bezier(.2,.9,.3,1.2) both",
        "sheet-up": "sheet-up 260ms cubic-bezier(.2,.8,.2,1) both",
        "panel-in": "panel-in 260ms cubic-bezier(.2,.8,.2,1) both",
        "fade-in": "fade-in 200ms ease-out both",
        "book-open": "book-open 320ms cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
