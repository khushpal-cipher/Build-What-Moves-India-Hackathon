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
        gov: {
          navy: "#0D062D",    // Primary
          orange: "#F49931",  // Secondary Alert
          cream: "#FFF4EA",   // Secondary Background
          blue: "#C8E0FF",    // Tertiary Highlight
          gray: "#F5F5F5",    // Tertiary Background
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;