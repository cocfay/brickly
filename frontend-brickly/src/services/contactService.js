import { API_URL, getToken } from './authService';

const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Obtener listado de leads (formularios de contacto de agentes)
 * GET /contact/leads
 * @param {Object} params - Filtros opcionales (ej: { agentId, dateFrom, dateTo })
 */
export const getContactLeads = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_URL}/contact/leads${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Obtener listado de leads del sitio (formulario de contacto general)
 * GET /contact/site/forms
 */
export const getContactSiteForms = async () => {
  try {
    const response = await fetch(`${API_URL}/contact/site/forms`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Actualizar status de leads de agentes
 * PUT /contact/leads/status
 * @param {string[]} ids
 * @param {'pendiente'|'revisado'} status
 */
export const updateContactLeadStatus = async (ids = [], status = 'revisado') => {
  try {
    const response = await fetch(`${API_URL}/contact/leads/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids, status })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Actualizar status de leads del sitio
 * PUT /contact/site/forms/status
 * @param {string[]} ids
 * @param {'pendiente'|'revisado'} status
 */
export const updateContactSiteFormStatus = async (ids = [], status = 'revisado') => {
  try {
    const response = await fetch(`${API_URL}/contact/site/forms/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids, status })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Enviar formulario de contacto de un agente
 * POST /contact/agente
 * @param {Object} contactData
 * @param {string} contactData.name
 * @param {string} contactData.lastname
 * @param {string} contactData.phone
 * @param {string} contactData.email
 * @param {string} contactData.message
 * @param {string} contactData.agentId
 * @param {string} contactData.info - Información adicional (ej: nombre de la propiedad)
 * @param {string} contactData.type - Tipo de formulario (ej: "Formulario Agente", "Formulario Propiedad")
 */
export const sendContactAgente = async (contactData, turnstileToken = null) => {
  try {
    const body = { ...contactData };
    if (turnstileToken) {
      body['cf-turnstile-response'] = turnstileToken;
    }

    const response = await fetch(`${API_URL}/contact/agente`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
