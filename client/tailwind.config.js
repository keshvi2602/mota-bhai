/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#050914",
        midnight: "#0b1224",
        champagne: "#f7e7b2",
        sovereign: "#d4af37",
        emeraldTrust: "#10b981",
        whatsapp: "#25D366"
      },
      boxShadow: {
        premium: "0 30px 90px rgba(0, 0, 0, 0.45)",
        gold: "0 18px 55px rgba(212, 175, 55, 0.22)"
      }
    }
  },
  plugins: []
};
