import axios from "axios";
import { saveToCache, readFromCache } from "../utils/offlineDB";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`,
  timeout: 12000, // 12s max — évite les freezes TCP infinis en offline
});

// Endpoints GET mis en cache pour le mode offline
const CACHEABLE = ["/books", "/loans", "/stats", "/auth/me", "/notifications"];

function isCacheable(url = "", method = "get") {
  if ((method || "get").toLowerCase() !== "get") return false;
  const excluded = ["/loans/", "/books/isbn", "/ai/", "/conversations"];
  if (excluded.some((ex) => url.includes(ex))) return false;
  return CACHEABLE.some((path) => url.includes(path));
}

/* ──────────────────────────────────────────────────────────────────
   REQUEST INTERCEPTOR
   Si hors-ligne + GET cacheable → remplacer l'adapter par le cache
   immédiatement (0ms, sans toucher au réseau).
   ────────────────────────────────────────────────────────────────── */
api.interceptors.request.use(async (config) => {
  // 1. Injecter le token JWT
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = "Bearer " + token;

  // 2. Si hors-ligne + URL cacheable → adapter = cache direct
  const method = (config.method || "get").toLowerCase();
  if (!navigator.onLine && method === "get" && isCacheable(config.url, method)) {
    const cached = await readFromCache(config.url);

    if (cached) {
      // Remplace l'adapter HTTP par une promesse résolue instantanément
      config.adapter = () =>
        Promise.resolve({
          data:        cached.data,
          status:      200,
          statusText:  "OK (Cache)",
          headers:     {},
          config,
          isFromCache: true,
          cachedAt:    cached.savedAt,
          stale:       cached.stale,
        });
    }
    // Pas de cache → la requête part quand même,
    // mais le timeout de 12s limitera l'attente
  }

  return config;
});

/* ──────────────────────────────────────────────────────────────────
   RESPONSE SUCCESS INTERCEPTOR
   Sauvegarder en IndexedDB si réponse fraîche (pas depuis le cache).
   ────────────────────────────────────────────────────────────────── */
api.interceptors.response.use(
  async (response) => {
    // Ne pas ré-enregistrer une réponse déjà issue du cache
    if (response.isFromCache) return response;

    const { url = "", method = "get" } = response.config;
    if (isCacheable(url, method)) {
      await saveToCache(url, response.data);
    }
    return response;
  },

  /* ──────────────────────────────────────────────────────────────────
     RESPONSE ERROR INTERCEPTOR
     Dernier recours si la requête est partie malgré tout (pas de cache
     en request interceptor) → essayer le cache IndexedDB.
     ────────────────────────────────────────────────────────────────── */
  async (error) => {
    const config = error.config;

    // Erreur réseau = pas de réponse du serveur (timeout, ECONNREFUSED, offline)
    const isNetworkError =
      !error.response &&
      error.code !== "ERR_CANCELED" &&
      error.code !== "ERR_OFFLINE_NO_CACHE";

    if (isNetworkError && config && isCacheable(config.url, config.method || "get")) {
      const cached = await readFromCache(config.url);
      if (cached) {
        console.warn(`[LibraFlow offline] Fallback cache pour : ${config.url}`);
        return Promise.resolve({
          data:        cached.data,
          status:      200,
          statusText:  "OK (Cache)",
          headers:     {},
          config,
          isFromCache: true,
          cachedAt:    cached.savedAt,
          stale:       cached.stale,
        });
      }
    }

    // 401 → déconnexion uniquement si on a bien reçu une réponse du serveur
    // (pas sur une erreur réseau pure)
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (
        !window.location.pathname.includes("/login") &&
        window.location.pathname !== "/"
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
