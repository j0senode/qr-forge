import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const siteUrl = (process.env.VITE_SITE_URL ?? "https://qrcode-bycj.vercel.app").replace(/\/$/, "");

export default defineConfig({
  plugins: [
    react(),
    {
      name: "html-site-url",
      transformIndexHtml(html) {
        return html.replaceAll("%SITE_URL%", siteUrl);
      },
    },
  ],
});
