/**
 * useNetworkStatus — détecte l'état réseau en temps réel.
 *
 * Retourne :
 *   isOnline   {boolean} — true si connecté maintenant
 *   wasOffline {boolean} — true si on vient de revenir en ligne (pour afficher "connexion rétablie")
 */

import { useEffect, useState } from "react";

export function useNetworkStatus() {
  const [isOnline,   setIsOnline]   = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      // Effacer le message "connexion rétablie" après 4s
      setTimeout(() => setWasOffline(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
    };

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
