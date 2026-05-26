import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "LibraFlow",
        short_name: "LibraFlow",
        description: "Système de gestion de bibliothèque intelligent",
        theme_color: "#0F172A",
        icons: [
          { src: "vite.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "vite.svg", sizes: "512x512", type: "image/svg+xml" },
        ],
      },
      // Ne pas précacher la vidéo (trop lourde)
      workbox: {
        globIgnores: ["**/*.mp4", "**/*.webm"],
      },
    }),
  ],

  build: {
    // Avertissement Rollup pour les chunks > 800 kB (plutôt que 500 kB par défaut)
    chunkSizeWarningLimit: 800,

    rollupOptions: {
      output: {
        /**
         * Séparation manuelle des gros vendeurs en chunks distincts :
         * - Chaque chunk est mis en cache séparément par le navigateur
         * - Si on ne change que notre code, les chunks vendeurs restent en cache
         */
        manualChunks(id) {
          // React + React-DOM + React-Router → 1 chunk (toujours chargé ensemble)
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router")) {
            return "vendor-react";
          }
          // Socket.IO → chargé seulement pour les pages authentifiées
          if (id.includes("node_modules/socket.io-client") || id.includes("node_modules/engine.io-client")) {
            return "vendor-socket";
          }
          // jsPDF + html2canvas → chargé seulement quand on génère un PDF
          if (id.includes("node_modules/jspdf") || id.includes("node_modules/html2canvas")) {
            return "vendor-pdf";
          }
          // html5-qrcode → chargé seulement dans le scanner
          if (id.includes("node_modules/html5-qrcode")) {
            return "vendor-qr";
          }
          // Axios + DOMPurify → utilitaires légers, regroupés
          if (id.includes("node_modules/axios") || id.includes("node_modules/dompurify")) {
            return "vendor-utils";
          }
          // Lucide React → icônes, déjà bien tree-shaked par Vite (1 fichier/icône)
          // Pas besoin de manualChunks, Vite fait déjà le travail
        },
      },
    },
  },
});
