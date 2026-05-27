import axios from "axios";
import { saveToCache, readFromCache } from "../utils/offlineDB";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`,
});

// Endpoints GET mis en cache pour le mode offline
const CACHEABLE = ["/books", "/loans", "/stats", "/auth/me", "/notifications"];

function isCacheable(url = "", method = "") {
  if (method.toLowerCase() !== "get") return false;
  // Exclure les endpoints dynamiques non pertinents offline
  const excluded = ["/loans/", "/books/isbn", "/ai/", "/conversations"];
  if (excluded.some((ex) => url.includes(ex))) return false;
  return CACHEABLE.some((path) => url.includes(path));
}

// ── Injecter le token JWT dans chaque requête ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});

// ── Réponse : sauvegarder en cache IndexedDB si GET réussi ──
api.interceptors.response.use(
  async (response) => {
    const { url = "", method = "" } = response.config;
    if (isCacheable(url, method)) {
      await saveToCache(url, response.data);
    }
    return response;
  },

  // ── Erreur réseau : basculer sur le cache IndexedDB ──
  async (error) => {
    const config = error.config;
    const isNetworkError = !error.response && error.code !== "ERR_CANCELED";

    if (isNetworkError && config && isCacheable(config.url, config.method)) {
      const cached = await readFromCache(config.url);
      if (cached) {
        console.warn(`[LibraFlow offline] Cache utilisé pour : ${config.url}`);
        return Promise.resolve({
          data:       cached.data,
          status:     200,
          statusText: "OK (From Cache)",
          headers:    {},
          config,
          isFromCache: true,
          cachedAt:    cached.savedAt,
          stale:       cached.stale,
        });
      }
    }

    // 401 → déconnexion et redirection login
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
