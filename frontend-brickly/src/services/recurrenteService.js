import { API_URL, getToken } from './authService';

/**
 * Inicia el proceso de suscripción para un plan.
 * @param {'BROKER_MENSUAL'|'BROKER_ANUAL'|'AGENCIA_SILVER'|'AGENCIA_GOLD'|'AGENCIA_DIAMOND'|'AGENCIA_SILVER_A'|'AGENCIA_GOLD_A'|'AGENCIA_DIAMOND_A'} plan
 * @returns {Promise<{ id: string, checkout_url: string }>} URL de pago de Recurrente
 */
export const subscribeToPlan = async (plan) => {
    const token = getToken();
    if (!token) {
        throw new Error('No hay sesión activa');
    }

    const response = await fetch(`${API_URL}/payments/subscribe`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Error ${response.status}`);
    }

    return response.json(); // { id, checkout_url }
};
