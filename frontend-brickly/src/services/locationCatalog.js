/**
 * Servicio para obtener el árbol de ubicaciones disponibles desde la API.
 * Endpoint: {API_URL}/properties/locations
 *
 * Devuelve SOLO las ubicaciones que tienen al menos 1 propiedad publicada,
 * con sus conteos, en un solo request liviano:
 *
 * [
 *   {
 *     name: 'Guatemala',
 *     count: 120,
 *     municipalities: [
 *       { name: 'Mixco', count: 45, zones: [{ name: 'Zona 4', count: 12 }] }
 *     ]
 *   }
 * ]
 *
 * Incluye caché en memoria y sessionStorage (TTL 15 min) para evitar
 * repetir la consulta en cada navegación.
 */

import { API_URL } from './authService';

const CACHE_KEY = 'brickly_locations_catalog_v1';
const TTL_MS = 15 * 60 * 1000;

let memoryCache = null;

const readSessionCache = () => {
  try {
    const saved = sessionStorage.getItem(CACHE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (
      parsed?.timestamp &&
      Date.now() - parsed.timestamp < TTL_MS &&
      Array.isArray(parsed.data)
    ) {
      return parsed;
    }
    sessionStorage.removeItem(CACHE_KEY);
  } catch { /* ignorar */ }
  return null;
};

/**
 * Obtiene el catálogo de ubicaciones con conteos.
 * @returns {Promise<Array|null>} Árbol de ubicaciones o null si falló (activa fallback en consumidores)
 */
export const getLocationCatalog = async () => {
  try {
    if (memoryCache && Date.now() - memoryCache.timestamp < TTL_MS) {
      return memoryCache.data;
    }

    const session = readSessionCache();
    if (session) {
      memoryCache = session;
      return session.data;
    }

    const response = await fetch(`${API_URL}/properties/locations`);

    if (!response.ok) {
      throw new Error(`Error ${response.status} al obtener ubicaciones`);
    }

    const data = await response.json();
    const catalog = Array.isArray(data) ? data : [];

    memoryCache = { timestamp: Date.now(), data: catalog };
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
    } catch { /* ignorar */ }

    return catalog;
  } catch (error) {
    console.error('Error en getLocationCatalog:', error);
    return null;
  }
};
