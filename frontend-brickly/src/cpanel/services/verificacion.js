import { API_URL, getToken, clearSession } from '../../services/authService';

const parseErrorResponse = async (response) => {
    if (response.status === 401) {
        clearSession();
        throw new Error('Sesion expirada');
    }

    const text = await response.text();
    let message = `Error ${response.status}`;
    try {
        message = JSON.parse(text)?.message || message;
    } catch {
        message = text || message;
    }
    throw new Error(message);
};

/**
 * Obtiene las agencias que cumplen los requisitos de verificacion GPI.
 * El backend calcula perfil completo, propiedades publicadas y agentes verificables
 * para evitar descargar todos los usuarios y propiedades en el navegador.
 */
export const getAgenciesForVerification = async () => {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/verification/agencies`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            await parseErrorResponse(response);
        }

        const result = await response.json();
        const agencies = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
        const data = agencies.map(agency => ({
            ...agency,
            avatarUrl: agency.avatar
                ? API_URL + agency.avatar.replace('/uploads', '')
                : null
        }));

        return { success: true, data };
    } catch (error) {
        console.error('Error al obtener agencias para verificacion:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Actualiza el estado de verificacion de una agencia y de los agentes que aplican.
 * El backend usa $set sobre agentInfo.verified para preservar el resto de agentInfo.
 */
export const updateAgencyVerification = async (id, verified) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/verification/agencies/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ verified })
        });

        if (!response.ok) {
            await parseErrorResponse(response);
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
