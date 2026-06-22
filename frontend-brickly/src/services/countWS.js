import { API_URL } from './authService';

/**
 * Registrar un click en WhatsApp para un usuario (agente/agencia).
 * Solo se cuenta una vez por dispositivo usando localStorage.
 * @param {string} userId - ID del usuario (agente o agencia)
 */
export const registerWSClick = async (userId) => {
  if (!userId) return false;
  
  const key = `wsClicked_${userId}`;
  if (localStorage.getItem(key)) {
    // Ya se contó este click para este usuario en este dispositivo
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/users/${userId}/click-ws`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      localStorage.setItem(key, '1');
      console.log(`✅ Click WS registrado para usuario ${userId}`);
      return true;
    } else {
      console.warn(`⚠️ Click WS falló para usuario ${userId}: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error registrando click WS:', error);
    return false;
  }
};
