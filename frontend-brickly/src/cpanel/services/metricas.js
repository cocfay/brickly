import { API_URL, getToken, handleAuthError } from '../../services/authService';

/**
 * Obtiene el conteo de leads (totales, mensuales, crecimiento) para un usuario (agencia o agente).
 * Endpoint: GET {API_URL}/contact/total-leads-count/{userId}
 * @param {string} userId - ID del usuario (agencia o agente)
 * @returns {Promise<{success: boolean, data?: {totalLeads, currentMonthLeads, previousMonthLeads, growthPercentage}, error?: string}>}
 */
export const getTotalLeads = async (userId) => {
  try {
    const token = getToken();
    if (!token) throw new Error('No hay sesión activa');
    
    const response = await fetch(`${API_URL}/contact/total-leads-count/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleAuthError();
        throw new Error('Sesión expirada');
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };

  } catch (error) {
    console.error('Error obteniendo leads:', error);
    return { success: false, error: error.message };
  }
};

export const getTopAgencyLeads = async () => {
  try {
    const token = getToken();
    if (!token) throw new Error('No hay sesión activa');

    const response = await fetch(`${API_URL}/contact/agency/top-leads`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleAuthError();
        throw new Error('Sesión expirada');
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };

  } catch (error) {
    console.error('Error obteniendo top leads agencias:', error);
    return { success: false, error: error.message };
  }
};

export const getTopAgencyClicksWs = async () => {
  try {
    const token = getToken();
    if (!token) throw new Error('No hay sesión activa');

    const response = await fetch(`${API_URL}/contact/agency/top-clickws`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleAuthError();
        throw new Error('Sesión expirada');
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };

  } catch (error) {
    console.error('Error obteniendo top clics WS agencias:', error);
    return { success: false, error: error.message };
  }
};

export const getMetricasAgency = async () => {
  try {
    const token = getToken();
    if (!token) throw new Error('No hay sesión activa');

    const response = await fetch(`${API_URL}/properties/metricas`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleAuthError();
        throw new Error('Sesión expirada');
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };

  } catch (error) {
    console.error('Error obteniendo métricas:', error);
    return { success: false, error: error.message };
  }
};

export const getNextExpiring = async (limit = 8) => {
  try {
    const token = getToken();
    if (!token) throw new Error('No hay sesión activa');

    const response = await fetch(`${API_URL}/partners/next-expiring?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleAuthError();
        throw new Error('Sesión expirada');
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };

  } catch (error) {
    console.error('Error obteniendo agencias por vencer:', error);
    return { success: false, error: error.message };
  }
};

export const getMetricasAdmin = async () => {
  try {
    const token = getToken();
    if (!token) throw new Error('No hay sesión activa');

    const response = await fetch(`${API_URL}/properties/metricas-adm`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleAuthError();
        throw new Error('Sesión expirada');
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };

  } catch (error) {
    console.error('Error obteniendo métricas del admin:', error);
    return { success: false, error: error.message };
  }
};

export const getTotalExclusiveProperties = async () => {
  try {
    const response = await fetch(`${API_URL}/properties?exclusive=true&status=published`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data: { total: data.total } };

  } catch (error) {
    console.error('Error obteniendo propiedades exclusivas:', error);
    return { success: false, error: error.message };
  }
};

export const getTotalLeadsPublic = async () => {
  try {
    const response = await fetch(`${API_URL}/contact/agency/top-leads`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data: { totalLeads: data.totalLeads } };

  } catch (error) {
    console.error('Error obteniendo leads totales:', error);
    return { success: false, error: error.message };
  }
};

export const getMetricasAgente = async (userId) => {
  try {
    const token = getToken();
    if (!token) throw new Error('No hay sesión activa');

    const response = await fetch(`${API_URL}/properties/metricas-agente/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleAuthError();
        throw new Error('Sesión expirada');
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };

  } catch (error) {
    console.error('Error obteniendo métricas del agente:', error);
    return { success: false, error: error.message };
  }
};
