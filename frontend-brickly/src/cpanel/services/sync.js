import { API_URL, getToken, handleAuthError } from './../../services/authService';

// Guardar API Key de EasyBroker
export const saveEasyBrokerApiKey = async (apiKey) => {
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/users/easybroker/apikey`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ apiKey }),
    });

    if (!response.ok) {
      if (response.status === 401) { handleAuthError(); throw new Error('Sesión expirada'); }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al guardar API Key de EasyBroker:', error);
    return { success: false, error: error.message };
  }
};

// Sincronizar propiedades con EasyBroker
export const syncEasyBroker = async (userId) => {
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/easybroker/sync/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) { handleAuthError(); throw new Error('Sesión expirada'); }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al sincronizar con EasyBroker:', error);
    return { success: false, error: error.message };
  }
};
