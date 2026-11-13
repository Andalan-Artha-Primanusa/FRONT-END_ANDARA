import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["app-logo.png", "powered-by.png"],
      manifest: {
        name: "ANDARA — Andalan Digital Human Resource Application",
        short_name: "ANDARA",
        description: "Portal Human Resource Andalan",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f8faf9",
        theme_color: "#087c43",
        lang: "id-ID",
        icons: [
          { src: "/app-logo.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: "NetworkOnly",
            method: "GET",
          },
        ],
      },
    }),
  ],

  build: {
    outDir: "dist",

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("react") || id.includes("scheduler")) {
            return "vendor-react";
          }

          if (id.includes("react-router")) {
            return "vendor-router";
          }

          if (id.includes("recharts") || id.includes("d3-")) {
            return "vendor-charts";
          }

          if (id.includes("axios")) {
            return "vendor-network";
          }

          if (id.includes("zustand")) {
            return "vendor-state";
          }

          if (id.includes("lucide-react") || id.includes("clsx")) {
            return "vendor-ui";
          }

          return "vendor-misc";
        },
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    host: true,
    port: 4173,
  },
});
