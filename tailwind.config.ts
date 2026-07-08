import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        ash: "#6b6b6b",
        ghost: "#f7f7f5",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "Cambria", "'Times New Roman'", "Times", "serif"],
        mono: ["'Courier New'", "Courier", "monospace"],
        poppins: ["Poppins", "sans-serif"],
      },
      fontSize: {
        caption: ["13px", { lineHeight: "1.43", letterSpacing: "0.01em" }],
        body: ["16px", { lineHeight: "1.5" }],
        subheading: ["18px", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "heading-sm": ["23px", { lineHeight: "1.2", letterSpacing: "-0.03em" }],
        heading: ["27px", { lineHeight: "1.15", letterSpacing: "-0.03em" }],
        "heading-lg": ["34px", { lineHeight: "1.05", letterSpacing: "-0.035em" }],
        display: ["52px", { lineHeight: "1", letterSpacing: "-0.04em" }],
        "display-xl": ["78px", { lineHeight: "0.92", letterSpacing: "-0.05em" }],
      },
      borderRadius: {
        badge: "4.5px",
      },
    },
  },
  plugins: [],
};
export default config;
