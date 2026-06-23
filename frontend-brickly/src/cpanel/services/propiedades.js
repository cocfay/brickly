import { API_URL, getToken, handleAuthError } from './../../services/authService';
import { fetchAllPages } from '../../utils/fetchAll';

// Headers de autenticación opcionales (no lanza error si no hay token)
const getOptionalAuthHeaders = () => {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const formatoGTQ = (valor) =>{
    return new Intl.NumberFormat('es-GT', {
        /* style: 'currency', */
        currency: 'GTQ',
       /*  currencyDisplay: 'narrowSymbol', */
        minimumFractionDigits: 0
    }).format(valor || 0);
}

const formatoUSD = (valor) =>{
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
    }).format(valor || 0);
}

// Función auxiliar para manejar respuestas
const handleResponse = async (response) => {
  if (!response.ok) {
    // Si el token expiró o no está autorizado, limpiar sesión y redirigir
    if (response.status === 401) {
      handleAuthError();
      throw new Error('Sesión expirada');
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Error ${response.status}`);
  }
  return response.json();
};

// Obtener token con validación
const getAuthHeaders = () => {
  const token = getToken();
  if (!token) throw new Error('No hay sesión activa');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// ========== CRUD DE PROPIEDADES ==========

// Obtener propiedades paginadas (UNA página a la vez, SIN fetchAllPages)
export const getPropiedadesPaginadas = async (params = {}) => {
  try {
    const queryParams = {};
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;
    if (params.status) queryParams.status = params.status;
    if (params.mode) queryParams['market.mode'] = params.mode;
    if (params.type) queryParams['market.type'] = params.type;
    if (params.department) queryParams['location.department'] = params.department;
    if (params.municipality) queryParams['location.municipality'] = params.municipality;
    if (params.zone) queryParams['location.zone'] = params.zone;
    if (params.priceUSDMin != null) queryParams.priceUSDMin = params.priceUSDMin;
    if (params.priceUSDMax != null) queryParams.priceUSDMax = params.priceUSDMax;
    if (params.priceMin != null) queryParams.priceMin = params.priceMin;
    if (params.priceMax != null) queryParams.priceMax = params.priceMax;
    if (params.userId) queryParams.userId = params.userId;
    if (params.agents) queryParams.agents = params.agents;
    if (params.search) queryParams.search = params.search;

    const queryString = new URLSearchParams(queryParams).toString();
    const url = `${API_URL}/properties${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, { headers: getOptionalAuthHeaders() });
    const data = await handleResponse(response);

    const formatCount = (n) => {
      const num = parseInt(n) || 0;
      if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
      return String(num);
    };

    // Si es una respuesta paginada
    if (!Array.isArray(data) && data?.data && Array.isArray(data.data)) {
      const formattedData = data.data.map(propiedad => ({
        ...propiedad,
        visitCounter: formatCount(propiedad.visitCounter),
        market: {
          ...propiedad.market,
          priceRaw: propiedad.market?.price || 0,
          priceUSDRaw: propiedad.market?.priceUSD || 0,
          price: propiedad.market?.price || 0,
          priceUSD: propiedad.market?.priceUSD || 0
        }
      }));

      return {
        success: true,
        data: {
          data: formattedData,
          total: data.total,
          page: data.page,
          limit: data.limit,
          totalPages: data.totalPages,
        }
      };
    }

    // Si es un array normal (sin paginación)
    const formattedData = data.map(propiedad => ({
      ...propiedad,
      visitCounter: formatCount(propiedad.visitCounter),
      market: {
        ...propiedad.market,
        priceRaw: propiedad.market?.price || 0,
        priceUSDRaw: propiedad.market?.priceUSD || 0,
        price: propiedad.market?.price || 0,
        priceUSD: propiedad.market?.priceUSD || 0
      }
    }));

    return { success: true, data: { data: formattedData, total: formattedData.length, page: 1, limit: formattedData.length, totalPages: 1 } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Obtener todas las propiedades
export const getPropiedades = async (params = {}) => {
  try {
    // Si se especifican parámetros de paginación explícitamente, usar fetch directo
    if (params.page || params.limit) {
      const queryString = new URLSearchParams(params).toString();
      const url = `${API_URL}/properties${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url, { headers: getOptionalAuthHeaders() });
      const data = await handleResponse(response);

      const formatCount = (n) => {
        const num = parseInt(n) || 0;
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(num);
      };

      // Si es una respuesta paginada (objeto con { data: [], total, page, ... })
      if (!Array.isArray(data) && data?.data && Array.isArray(data.data)) {
        const formattedData = data.data.map(propiedad => ({
          ...propiedad,
          visitCounter: formatCount(propiedad.visitCounter),
          market: {
            ...propiedad.market,
            priceRaw: propiedad.market?.price || 0,
            priceUSDRaw: propiedad.market?.priceUSD || 0,
            price: propiedad.market?.price || 0,
            priceUSD: propiedad.market?.priceUSD || 0
          }
        }));

        const countByRange = (min, max) => {
          return data.data.filter(item => {
            const price = item.market?.price || 0
            return price >= min && price <= max && item.status == 'published'
          }).length;
        };

        return {
          success: true,
          data: {
            data: formattedData,
            total: data.total,
            page: data.page,
            limit: data.limit,
            totalPages: data.totalPages,
          },
          contD: countByRange(2000000, 90000000000),
          contP: countByRange(1000000, 2000000),
          contG: countByRange(500000, 1000000),
        };
      }

      // Si es un array normal (sin paginación)
      const newData = data.map(propiedad => ({
        ...propiedad,
        visitCounter: formatCount(propiedad.visitCounter),
        market: {
          ...propiedad.market,
          priceRaw: propiedad.market?.price || 0,
          priceUSDRaw: propiedad.market?.priceUSD || 0,
          price: propiedad.market?.price || 0,
          priceUSD: propiedad.market?.priceUSD || 0
        }
      }));

      const countByRange = (min, max) => {
        return data.filter(item => {
          const price = item.market?.price || 0
          return price >= min && price <= max && item.status == 'published'
        }).length;
      };

      return { success: true, data: newData, contD: countByRange(2000000, 90000000000), contP: countByRange(1000000, 2000000), contG: countByRange(500000, 1000000), };
    }

    // Sin parámetros de paginación: obtener TODAS las propiedades usando fetchAllPages
    // Construir query string con todos los params que no sean de paginación
    const queryParams = Object.entries(params)
      .filter(([key]) => key !== 'page' && key !== 'limit')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    const queryString = queryParams ? `?${queryParams}` : '';
    const allData = await fetchAllPages(`${API_URL}/properties${queryString}`, 100, {
      headers: getOptionalAuthHeaders()
    });


    const formatCount = (n) => {
      const num = parseInt(n) || 0;
      if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
      return String(num);
    };

    const formattedData = allData.map(propiedad => ({
      ...propiedad,
      visitCounter: formatCount(propiedad.visitCounter),
      market: {
        ...propiedad.market,
        priceRaw: propiedad.market?.price || 0,
        priceUSDRaw: propiedad.market?.priceUSD || 0,
        price: propiedad.market?.price || 0,
        priceUSD: propiedad.market?.priceUSD || 0
      }
    }));

    const countByRange = (min, max) => {
      return allData.filter(item => {
        const price = item.market?.price || 0
        return price >= min && price <= max && item.status == 'published'
      }).length;
    };

    return {
      success: true,
      data: formattedData,
      contD: countByRange(2000000, 90000000000),
      contP: countByRange(1000000, 2000000),
      contG: countByRange(500000, 1000000),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Obtener una propiedad por ID o slug
export const getPropiedadById = async (id) => {
  try {
    const response = await fetch(`${API_URL}/properties/${id}`);
    
    const data = await handleResponse(response);

    if (data && data.market) {
      return {
        success: true,
        data: {
          ...data,
          market: {
            ...data.market,
            priceRaw: data.market?.price || 0,
            priceUSDRaw: data.market?.priceUSD || 0,
            price: data.market?.price || 0,
            priceUSD: data.market?.priceUSD || 0,
            pricePerM2: data.market?.pricePerM2 || 0,
            priceM2USD: data.market?.priceM2USD || 0,
          }
        }
      };
    }
    
    //return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Crear nueva propiedad (con soporte para imágenes)
export const createPropiedad = async (propiedadData) => {
  try {
    console.log('Creando propiedad:', propiedadData);
    
    // Verificar si estamos enviando archivos (FormData) o datos normales
    const isFormData = propiedadData instanceof FormData;
    
    // Preparar headers según el tipo de datos
    const headers = {
      'Authorization': `Bearer ${getToken()}`
    };
    
    // Solo agregar Content-Type si NO es FormData
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(`${API_URL}/properties`, {
      method: 'POST',
      headers: headers,
      body: isFormData ? propiedadData : JSON.stringify(propiedadData)
    });
    
    const data = await handleResponse(response);
    return { success: true, data };
  } catch (error) {
    console.error('Error createPropiedad:', error);
    return { success: false, error: error.message };
  }
};

// Subir archivo temporal (imagen, video, doc o tour)
export const uploadTempFile = async (file, fileType) => {
  try {
    console.log(`📤 Subiendo ${fileType}:`, file.name);
    
    const formData = new FormData();
    formData.append(fileType, file);
    
    const response = await fetch(`${API_URL}/fileuploads/temp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', response.status, errorText);
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('📦 Respuesta completa:', data);
    
    // Extraer SOLO el string del path
    let pathString = null;
    
    if (data.files && data.files.image && data.files.image[0]) {
      // Usar usepath si existe (es el que necesitas: "temp/...")
      pathString = data.files.image[0].usepath || data.files.image[0].path;
      console.log('✅ Path string extraído:', pathString);
    }
    
    if (!pathString) {
      console.error('❌ No se pudo extraer path de la respuesta:', data);
      throw new Error('No se recibió el path del archivo');
    }
    
    return { success: true, path: pathString }; // 👈 Devuelve SOLO el string
    
  } catch (error) {
    console.error('❌ Error en uploadTempFile:', error);
    return { success: false, error: error.message };
  }
};

// Subir múltiples archivos en paralelo (cada uno por separado)
export const uploadMultipleTempFilesParallel = async (files, fileType = 'image') => {
  try {
    console.log(`📤 Subiendo ${files.length} archivos en paralelo`);
    
    // Crear un array de promesas
    const uploadPromises = files.map(file => {
      const formData = new FormData();
      formData.append(fileType, file);
      
      return fetch(`${API_URL}/fileuploads/temp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      }).then(async response => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText}`);
        }
        return response.json();
      });
    });
    
    // Ejecutar todas las promesas en paralelo
    const results = await Promise.all(uploadPromises);
    console.log('📦 Respuestas:', results);
    
    // Extraer todos los paths
    const paths = [];
    results.forEach(data => {
      if (data.files && data.files.image && data.files.image[0]) {
        const pathString = data.files.image[0].usepath || data.files.image[0].path;
        if (pathString) paths.push(pathString);
      }
    });
    
    console.log('✅ Paths extraídos:', paths);
    return { success: true, paths };
    
  } catch (error) {
    console.error('❌ Error en uploadMultipleTempFilesParallel:', error);
    return { success: false, error: error.message };
  }
};

// Actualizar propiedad
export const updatePropiedad = async (id, propiedadData) => {
  try {
    console.log('Actualizando propiedad:', id, propiedadData);
    
    const response = await fetch(`${API_URL}/properties/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(propiedadData)
    });
    
    const data = await handleResponse(response);
    return { success: true, data };
  } catch (error) {
    console.error('Error updatePropiedad:', error);
    return { success: false, error: error.message };
  }
};

// Eliminar propiedad
export const deletePropiedad = async (idOrIds) => {
  try {
    // Si es un array, eliminar múltiples
    if (Array.isArray(idOrIds)) {
      const results = await Promise.allSettled(
        idOrIds.map(id => 
          fetch(`${API_URL}/properties/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          }).then(handleResponse)
        )
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return { 
        success: true, 
        message: `${successful} eliminadas, ${failed} fallaron`,
        details: results 
      };
    } 
    // Si es un string, eliminar uno
    else {
      const response = await fetch(`${API_URL}/properties/${idOrIds}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      await handleResponse(response);
      return { success: true, message: 'Propiedad eliminada correctamente' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Publicar propiedad
export const publicarPropiedad = async (id) => {
  try {
    const response = await fetch(`${API_URL}/propiedades/${id}/publicar`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    
    const data = await handleResponse(response);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Asignar agentes a una propiedad (usa el endpoint PUT /properties/:id)
export const assignAgents = async (propertyId, agentIds) => {
  return updatePropiedad(propertyId, { agents: agentIds });
};

// ========== FUNCIONES PARA DESACTIVACIÓN DE AGENTES / AGENCIAS ==========

/**
 * Remueve un agente de todas las propiedades donde esté asignado (array agents)
 * y desactiva las propiedades donde sea el creador (userId).
 * @param {string} agentId - ID del agente a desactivar
 */
export const removeAgentFromProperties = async (agentId) => {
  try {
    // Obtener todas las propiedades
    const allData = await fetchAllPages(`${API_URL}/properties`, 100);
    
    // Separar propiedades donde el agente es creador vs donde está asignado
    const propsAsCreator = allData.filter(p => p.userId === agentId);
    const propsAsAssigned = allData.filter(p => 
      Array.isArray(p.agents) && p.agents.includes(agentId) && p.userId !== agentId
    );
    
    const results = { disabled: 0, removed: 0, errors: 0 };

    // 1. Desactivar propiedades donde es creador
    if (propsAsCreator.length > 0) {
      const disableResults = await Promise.allSettled(
        propsAsCreator.map(p => 
          updatePropiedad(p._id, { status: 'disabled' })
        )
      );
      results.disabled = disableResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
      results.errors += disableResults.filter(r => r.status === 'rejected' || !r.value.success).length;
    }

    // 2. Remover agente de propiedades donde solo está asignado
    if (propsAsAssigned.length > 0) {
      const removeResults = await Promise.allSettled(
        propsAsAssigned.map(p => {
          const newAgents = p.agents.filter(a => a !== agentId);
          return updatePropiedad(p._id, { agents: newAgents });
        })
      );
      results.removed = removeResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
      results.errors += removeResults.filter(r => r.status === 'rejected' || !r.value.success).length;
    }

    return { 
      success: true, 
      data: results,
      message: `${results.disabled} propiedad(es) desactivada(s), ${results.removed} agente(s) removido(s)`
    };
  } catch (error) {
    console.error('Error removeAgentFromProperties:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Desactiva todas las propiedades de una agencia (por userId)
 * @param {string} agencyId - ID de la agencia a desactivar
 */
export const disableAgencyProperties = async (agencyId) => {
  try {
    // Obtener todas las propiedades
    const allData = await fetchAllPages(`${API_URL}/properties`, 100);
    
    // Filtrar propiedades de la agencia (donde es creadora)
    const agencyProps = allData.filter(p => p.userId === agencyId);
    
    if (agencyProps.length === 0) {
      return { success: true, data: { disabled: 0 }, message: 'No se encontraron propiedades de esta agencia' };
    }

    // Desactivar todas
    const results = await Promise.allSettled(
      agencyProps.map(p => updatePropiedad(p._id, { status: 'disabled' }))
    );

    const disabled = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const errors = results.filter(r => r.status === 'rejected' || !r.value.success).length;

    return { 
      success: true, 
      data: { disabled, errors },
      message: `${disabled} propiedad(es) desactivada(s)${errors ? `, ${errors} error(es)` : ''}`
    };
  } catch (error) {
    console.error('Error disableAgencyProperties:', error);
    return { success: false, error: error.message };
  }
};
