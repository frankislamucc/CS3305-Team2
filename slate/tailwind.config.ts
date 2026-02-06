module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#5865F2", // The main indigo button color
          dark: "#1A1C21", // Deep charcoal for headings/logo
          muted: "#6B7280", // Gray for secondary links
          soft: "#F3F4FF", // Lavender tint for backgrounds/hovers
          accent: "#4752C4", // Darker indigo for hover states
        },
      },
    },
  },
  plugins: [],
};
