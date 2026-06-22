/**
 * Obtiene TODOS los registros de un endpoint paginado.
 * Hace peticiones consecutivas hasta obtener la página total.
 * 
 * @param {string} url - URL base del endpoint (sin parámetros de paginación)
 * @param {number} pageSize - Cantidad de registros por página (default 500)
 * @param {object} options - Opciones adicionales para fetch (headers, etc.)
 * @returns {Promise<Array>} - Array con todos los registros
 */
export const fetchAllPages = async (url, pageSize = 500, options = {}) => {
    let page = 1;
    let allData = [];
    let totalPages = 1;

    while (page <= totalPages) {
        const separator = url.includes('?') ? '&' : '?';
        const response = await fetch(`${url}${separator}page=${page}&limit=${pageSize}`, options);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status} al obtener datos`);
        }

        const result = await response.json();
        const data = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
        
        allData = [...allData, ...data];
        totalPages = result?.totalPages || 1;
        page++;
    }

    return allData;
};

/**
 * Obtiene propiedades filtradas por rango de precio desde la API.
 * Usa priceUSDMin/priceUSDMax para USD o priceMin/priceMax para GTQ.
 * 
 * @param {string} baseUrl - URL base de la API
 * @param {object} priceFilter - { min: number, max: number|null, currency?: 'USD'|'GTQ' }
 * @param {number} pageSize - Cantidad de registros por página
 * @returns {Promise<Array>} - Array con las propiedades filtradas
 */
export const fetchPropertiesByPriceRange = async (baseUrl, priceFilter, pageSize = 500) => {
    let url = `${baseUrl}/properties?status=published`;
    
    const isGTQ = priceFilter.currency === 'GTQ';
    
    if (priceFilter.min != null) {
        url += isGTQ ? `&priceMin=${priceFilter.min}` : `&priceUSDMin=${priceFilter.min}`;
    }
    if (priceFilter.max != null) {
        url += isGTQ ? `&priceMax=${priceFilter.max}` : `&priceUSDMax=${priceFilter.max}`;
    }
    
    return await fetchAllPages(url, pageSize);
};

/**
 * Obtiene propiedades filtradas por ubicación desde la API.
 * Usa filtros como location.department, location.municipality, location.zone.
 * 
 * @param {string} baseUrl - URL base de la API
 * @param {object} locationFilter - { department?: string, municipality?: string, zone?: string }
 * @param {number} pageSize - Cantidad de registros por página
 * @returns {Promise<Array>} - Array con las propiedades filtradas
 */
export const fetchPropertiesByLocation = async (baseUrl, locationFilter, pageSize = 500) => {
    let url = `${baseUrl}/properties?status=published`;
    
    if (locationFilter.department) {
        url += `&location.department=${encodeURIComponent(locationFilter.department)}`;
    }
    if (locationFilter.municipality) {
        url += `&location.municipality=${encodeURIComponent(locationFilter.municipality)}`;
    }
    if (locationFilter.zone) {
        url += `&location.zone=${encodeURIComponent(locationFilter.zone)}`;
    }
    
    return await fetchAllPages(url, pageSize);
};

/**
 * Obtiene una página específica de propiedades con paginación controlada.
 * No recorre todas las páginas, solo devuelve la página solicitada.
 * 
 * @param {string} url - URL base del endpoint (sin parámetros de paginación)
 * @param {number} page - Número de página a obtener (default 1)
 * @param {number} limit - Cantidad de registros por página (default 21)
 * @param {object} options - Opciones adicionales para fetch (headers, etc.)
 * @returns {Promise<{data: Array, totalPages: number, currentPage: number, total: number}>}
 */
export const fetchPropertiesPage = async (url, page = 1, limit = 21, options = {}) => {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}page=${page}&limit=${limit}`, options);

    if (!response.ok) {
        throw new Error(`Error ${response.status} al obtener datos`);
    }

    const result = await response.json();
    const data = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];

    return {
        data,
        totalPages: result?.totalPages || 1,
        currentPage: result?.page || page,
        total: result?.total || data.length,
    };
};
