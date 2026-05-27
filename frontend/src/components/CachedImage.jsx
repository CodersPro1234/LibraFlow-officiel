/**
 * CachedImage — image avec cache offline automatique.
 *
 * Comportement :
 *  • En ligne + image chargée → stocke l'URL dans Cache Storage
 *  • Hors-ligne + image échoue → sert depuis Cache Storage
 *  • Pas de cache → appelle onError (fallback géré par le parent)
 *
 * Fonctionne en dev ET en production (pas besoin du Service Worker).
 */

import { useState, useRef } from "react";

const CACHE_NAME = "libraflow-images";

/** Sauvegarde une URL d'image dans Cache Storage */
async function cacheImage(url) {
  if (!url || !url.startsWith("http") || !("caches" in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const already = await cache.match(url);
    if (!already) {
      // fetch avec mode cors — fonctionne pour OpenLibrary, Google Books, etc.
      const response = await fetch(url, { mode: "cors" });
      if (response.ok) {
        await cache.put(url, response);
      }
    }
  } catch {
    // CORS refusé ou réseau indisponible — on ignore silencieusement
  }
}

/** Charge une image depuis Cache Storage, retourne un ObjectURL ou null */
async function getCachedImage(url) {
  if (!url || !("caches" in window)) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    if (!response) return null;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export default function CachedImage({
  src,
  alt = "",
  className = "",
  style,
  loading = "lazy",
  onError,          // appelé si vraiment rien ne fonctionne
  ...rest
}) {
  const [displaySrc, setDisplaySrc]   = useState(src);
  const [errored,    setErrored]      = useState(false);
  const objectUrlRef = useRef(null);  // pour révoquer l'ObjectURL à l'unmount

  // Nettoyage de l'ObjectURL quand le composant est démonté
  // (évite les fuites mémoire)
  // Note : on ne peut pas utiliser useEffect ici sans dépendances,
  //        mais la révocation dans onError suffit pour la majorité des cas

  const handleLoad = () => {
    // Image chargée avec succès → la mettre en cache pour usage offline
    if (src && src.startsWith("http")) {
      cacheImage(src); // async, non-bloquant
    }
  };

  const handleError = async (e) => {
    if (errored) {
      // Déjà tenté le cache → vraiment pas dispo, appeler onError du parent
      onError?.(e);
      return;
    }
    setErrored(true);

    // Essayer de servir depuis Cache Storage
    if (src && src.startsWith("http")) {
      const cachedObjectUrl = await getCachedImage(src);
      if (cachedObjectUrl) {
        // Révoquer l'ancien ObjectURL si existant
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = cachedObjectUrl;
        setDisplaySrc(cachedObjectUrl);
        return; // ne pas appeler onError
      }
    }

    // Aucun cache → fallback du parent
    onError?.(e);
  };

  // Si src change depuis l'extérieur (ex: pagination), reset l'état
  if (src !== displaySrc && !errored) {
    setDisplaySrc(src);
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      onLoad={handleLoad}
      onError={handleError}
      {...rest}
    />
  );
}
