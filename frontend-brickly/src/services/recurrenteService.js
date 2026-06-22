import { API_URL, getToken } from './authService';

/**
 * Inicia el proceso de suscripción para un plan.
 * @param {'INMOBILIARIA'|'AGENCIA'|'ARQUITECTO'|'AGENTE_BASICO'} plan
 * @returns {{ checkout_url: string }} URL de pago de Recurrente
 */
export const subscribeToPlan = async (plan) => {
    const token = getToken();

    const response = await fetch(`${API_URL}/payments/subscribe`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Error ${response.status}`);
    }

    return response.json(); // { id, checkout_url }
};
