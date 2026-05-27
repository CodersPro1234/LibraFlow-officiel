/**
 * offlineDB.js — Couche IndexedDB pour LibraFlow
 *
 * Remplace le cache localStorage (limité à 5 MB, bloquant).
 * IndexedDB : capacité illimitée, asynchrone, survit aux 7 jours iOS.
 *
 * Stores :
 *   • apiCache  → réponses GET de l'API (books, loans, stats, user)
 *   • metadata  → timestamps TTL
 */

import { openDB } from "idb";

const DB_NAME    = "libraflow-offline";
const DB_VERSION = 1;

// TTL en millisecondes par endpoint
const TTL = {
  books:       2  * 60 * 60 * 1000,  // 2h
  loans:       30 * 60 * 1000,        // 30 min
  stats:       1  * 60 * 60 * 1000,  // 1h
  user:        24 * 60 * 60 * 1000,  // 24h
  default:     1  * 60 * 60 * 1000,  // 1h fallback
};

// Singleton connexion DB
let _db = null;

async function getDB() {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("apiCache")) {
        db.createObjectStore("apiCache", { keyPath: "key" });
      }
    },
  });
  return _db;
}

/**
 * Dérive la clé de store depuis l'URL de l'API.
 * Ex: "/books?page=1&limit=24" → "books"
 *     "/loans" → "loans"
 *     "/stats" → "stats"
 */
function urlToKey(url = "") {
  const clean = url.split("?")[0].replace(/^\//, "");
  // Normaliser : /books/isbn/xxx → books, /loans/xxx → loans
  const base = clean.split("/")[0];
  return base || "misc";
}

/**
 * Détermine le TTL à utiliser en fonction de la clé.
 */
function getTTL(key) {
  for (const [k, ms] of Object.entries(TTL)) {
    if (key.includes(k)) return ms;
  }
  return TTL.default;
}

/**
 * Sauvegarder une réponse API dans IndexedDB.
 * @param {string} url     URL complète de la requête (avec query params)
 * @param {any}    data    Données à stocker
 */
export async function saveToCache(url, data) {
  try {
    const db  = await getDB();
    const key = url; // on garde l'URL complète comme clé pour la pagination
    await db.put("apiCache", {
      key,
      data,
      savedAt:   Date.now(),
      storeKey:  urlToKey(url),
    });
  } catch (err) {
    console.warn("[LibraFlow offline] saveToCache error:", err);
  }
}

/**
 * Lire depuis IndexedDB si les données existent et ne sont pas expirées.
 * @param {string} url
 * @returns {{ data: any, savedAt: number } | null}
 */
export async function readFromCache(url) {
  try {
    const db    = await getDB();
    const entry = await db.get("apiCache", url);
    if (!entry) return null;

    const ttl     = getTTL(entry.storeKey);
    const elapsed = Date.now() - entry.savedAt;
    if (elapsed > ttl) {
      // Expiré — on supprime mais on renvoie quand même (utile si offline)
      // (on ne supprime pas : mieux vaut des données périmées qu'une page blanche)
      return { data: entry.data, savedAt: entry.savedAt, stale: true };
    }
    return { data: entry.data, savedAt: entry.savedAt, stale: false };
  } catch (err) {
    console.warn("[LibraFlow offline] readFromCache error:", err);
    return null;
  }
}

/**
 * Vider tout le cache (utile au logout).
 */
export async function clearCache() {
  try {
    const db = await getDB();
    await db.clear("apiCache");
  } catch (err) {
    console.warn("[LibraFlow offline] clearCache error:", err);
  }
}

/**
 * Supprimer les entrées d'un endpoint précis.
 * Ex: clearEndpoint("loans") après un retour de livre.
 */
export async function invalidateEndpoint(endpoint) {
  try {
    const db      = await getDB();
    const all     = await db.getAll("apiCache");
    const toDelete = all.filter((e) => e.storeKey === endpoint).map((e) => e.key);
    await Promise.all(toDelete.map((k) => db.delete("apiCache", k)));
  } catch (err) {
    console.warn("[LibraFlow offline] invalidateEndpoint error:", err);
  }
}
