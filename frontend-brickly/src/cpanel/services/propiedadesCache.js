/**
 * Caché en memoria para propiedades del cpanel.
 *
 * Estrategia "stale-while-revalidate":
 *  - Si hay datos en caché, los devuelve de inmediato (sin esperar red).
 *  - En paralelo lanza un refresco en background.
 *  - El componente recibe los datos cacheados primero y luego los actualizados.
 *
 * El caché se invalida automáticamente tras operaciones de escritura
 * (update, delete) para garantizar consistencia.
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos — ajustar según necesidad

const cache = {
  data: null,        // Array de propiedades
  timestamp: null,   // Cuándo se guardó
  userId: null,      // Para invalidar si cambia el usuario
  fetching: false,   // Evitar peticiones paralelas duplicadas
  listeners: [],     // Callbacks para notificar actualizaciones en background
};

/** Suscribirse a actualizaciones en background */
export const onCacheUpdate = (cb) => {
  cache.listeners.push(cb);
  return () => {
    cache.listeners = cache.listeners.filter(l => l !== cb);
  };
};

const notifyListeners = (data) => {
  cache.listeners.forEach(cb => {
    try { cb(data); } catch { /* ignorar */ }
  });
};

/** ¿El caché es válido para este usuario? */
const isValid = (userId) =>
  cache.data !== null &&
  cache.userId === userId &&
  cache.timestamp !== null &&
  Date.now() - cache.timestamp < CACHE_TTL_MS;

/** Invalidar caché (llamar tras write/delete) */
export const invalidateCache = () => {
  cache.data = null;
  cache.timestamp = null;
};

/**
 * Obtener propiedades con caché.
 *
 * @param {Function} fetchFn   - La función original que trae datos de la API (getPropiedades)
 * @param {string}   userId    - ID del usuario actual
 * @param {object}   params    - Parámetros para la petición (ej: { status: 'pre-published' })
 * @param {Function} onUpdate  - Callback opcional cuando llegan datos frescos en background
 * @returns {Promise<object>}  - { success, data, fromCache }
 */
export const getPropiedadesConCache = async (fetchFn, userId, params = {}, onUpdate = null) => {
  // 1. Si hay caché válido, devolverlo inmediatamente
  if (isValid(userId)) {
    // Lanzar refresco en background sin bloquear
    if (!cache.fetching) {
      cache.fetching = true;
      fetchFn(params)
        .then(result => {
          if (result.success) {
            cache.data = result.data;
            cache.timestamp = Date.now();
            cache.userId = userId;
            notifyListeners(result.data);
            if (onUpdate) onUpdate(result.data);
          }
        })
        .catch(() => { /* silencioso */ })
        .finally(() => { cache.fetching = false; });
    }

    return { success: true, data: cache.data, fromCache: true };
  }

  // 2. Sin caché válido: esperar la petición real
  if (cache.fetching) {
    // Otra petición ya está en curso — esperar con polling ligero
    await new Promise(resolve => {
      const interval = setInterval(() => {
        if (!cache.fetching) { clearInterval(interval); resolve(); }
      }, 80);
    });
    if (isValid(userId)) {
      return { success: true, data: cache.data, fromCache: true };
    }
  }

  cache.fetching = true;
  try {
    const result = await fetchFn(params);
    if (result.success) {
      cache.data = result.data;
      cache.timestamp = Date.now();
      cache.userId = userId;
    }
    return { ...result, fromCache: false };
  } finally {
    cache.fetching = false;
  }
};
