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
      workbox: {
        // Ne pas précacher les vidéos
        globIgnores: ["**/*.mp4", "**/*.webm"],

        // ── Stratégies runtime ──
        runtimeCaching: [
          // API LibraFlow — NetworkFirst : essaie le réseau, bascule sur cache si offline
          {
            urlPattern: /\/api\/(books|loans|stats|auth\/me|notifications)/,
            handler: "NetworkFirst",
            options: {
              cacheName: "libraflow-api",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 2, // 2 jours
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // Images de couvertures URL externes (Google Books, etc.)
          // CacheFirst : charge depuis le cache, rafraîchit en arrière-plan
          {
            urlPattern: /\.(jpg|jpeg|png|webp|gif|svg)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "libraflow-images",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 jours
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // Images Google Books / Open Library (cross-origin)
          {
            urlPattern: /^https:\/\/(books\.google\.com|covers\.openlibrary\.org|images-na\.ssl-images-amazon\.com)/,
            handler: "CacheFirst",
            options: {
              cacheName: "libraflow-external-images",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],

        // Page de fallback quand navigation impossible et aucun cache
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
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
