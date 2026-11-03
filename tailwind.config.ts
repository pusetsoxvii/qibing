import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#1A7F37", dark: "#14532D", light: "#DCFCE7" },
        accent: { DEFAULT: "#8B5E3C" },
        ink: "#1F2937",
        card: "#F3F4F6",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: { DEFAULT: "8px" },
    },
  },
  plugins: [],
};

export default config;
