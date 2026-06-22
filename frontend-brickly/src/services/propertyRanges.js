/**
 * Servicio para obtener rangos de propiedades desde la API optimizada.
 * Endpoint: {API_URL}/properties/var-ranges
 * 
 * Devuelve los valores mínimos y máximos de precio y tamaño
 * sin necesidad de descargar todas las propiedades.
 */

import { API_URL } from './authService';

const VAR_RANGES_URL = `${API_URL}/properties/var-ranges`;

/**
 * Obtiene los rangos de precio y tamaño de todas las propiedades.
 * @returns {Promise<{success: boolean, data?: {price: {minPrice, maxPrice, minPriceUSD, maxPriceUSD}, size: {minSizeLandM2, maxSizeLandM2, minSizeConstructionM2, maxSizeConstructionM2, minSizeStorageM2, maxSizeStorageM2}}, error?: string}>}
 */
export const getPropertyRanges = async () => {
  try {
    const response = await fetch(VAR_RANGES_URL);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status} al obtener rangos`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data: {
        price: {
          minPrice: data.price?.minPrice ?? 0,
          maxPrice: data.price?.maxPrice ?? 10000000,
          minPriceUSD: data.price?.minPriceUSD ?? 0,
          maxPriceUSD: data.price?.maxPriceUSD ?? 250000000,
        },
        size: {
          minSizeLandM2: data.size?.minSizeLandM2 ?? 0,
          maxSizeLandM2: data.size?.maxSizeLandM2 ?? 10000000,
          minSizeConstructionM2: data.size?.minSizeConstructionM2 ?? 0,
          maxSizeConstructionM2: data.size?.maxSizeConstructionM2 ?? 100000,
          minSizeStorageM2: data.size?.minSizeStorageM2 ?? 1,
          maxSizeStorageM2: data.size?.maxSizeStorageM2 ?? 30,
        }
      }
    };
  } catch (error) {
    console.error('Error en getPropertyRanges:', error);
    return { 
      success: false, 
      error: error.message,
      // Valores por defecto en caso de error
      data: {
        price: { minPrice: 0, maxPrice: 10000000, minPriceUSD: 0, maxPriceUSD: 250000000 },
        size: { minSizeLandM2: 0, maxSizeLandM2: 10000000, minSizeConstructionM2: 0, maxSizeConstructionM2: 100000, minSizeStorageM2: 1, maxSizeStorageM2: 30 }
      }
    };
  }
};
