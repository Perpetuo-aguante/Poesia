import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Georgia", "Cambria", "'Times New Roman'", "Times", "serif"],
        mono: ["'Courier New'", "Courier", "monospace"],
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
