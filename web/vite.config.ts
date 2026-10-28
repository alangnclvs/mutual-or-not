import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/",
  plugins: [
    // Installable and offline: the app shell and the fonts are precached. Nothing is fetched from
    // another origin (ADR 0001), so there is no runtime caching.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        name: "Mutual or Not",
        short_name: "Mutual",
        description: "Quem segue de volta no Instagram, lido no próprio aparelho.",
        lang: "pt-BR",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f5f2ea",
        theme_color: "#f5f2ea",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "/index.html",
      },
    }),
  ],
  test: { include: ["src/**/*.test.ts"] },
});
