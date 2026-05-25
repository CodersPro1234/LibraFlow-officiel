import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`,
});

// Configuration du cache pour le mode hors-ligne
const CACHEABLE_URLS = ["/books", "/stats", "/loans"];

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});

api.interceptors.response.use(
  (response) => {
    // 1. En cas de SUCCÈS : On enregistre les données dans le localStorage
    const url = response.config.url || "";
    const isGet = response.config.method === "get";
    const cacheKey = CACHEABLE_URLS.find((path) => url.includes(path));

    if (isGet && cacheKey) {
      const storageKey = `libraflow_cache_${cacheKey.replace("/", "")}`;
      localStorage.setItem(storageKey, JSON.stringify(response.data));
      localStorage.setItem(`${storageKey}_time`, Date.now().toString());
    }
    return response;
  },
  (error) => {
    // 2. En cas d'ERREUR (ex: pas d'Internet) : On cherche une version en cache
    const config = error.config;
    // Détecter si c'est une erreur réseau (pas de réponse du serveur)
    const isNetworkError = !error.response && error.code !== "ERR_CANCELED";

    if (isNetworkError && config && config.method === "get") {
      const url = config.url || "";
      const cacheKey = CACHEABLE_URLS.find((path) => url.includes(path));

      if (cacheKey) {
        const storageKey = `libraflow_cache_${cacheKey.replace("/", "")}`;
        const cachedData = localStorage.getItem(storageKey);

        if (cachedData) {
          console.warn(`[LibraFlow Offline] Bascule sur le cache pour : ${cacheKey}`);
          // On renvoie une "fausse" réussite avec les anciennes données
          return Promise.resolve({
            data: JSON.parse(cachedData),
            status: 200,
            statusText: "OK (From Cache)",
            headers: {},
            config,
            isFromCache: true,
          });
        }
      }
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // On redirige seulement si on n'est pas déjà sur la page de login
      if (!window.location.pathname.includes('/login') && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;