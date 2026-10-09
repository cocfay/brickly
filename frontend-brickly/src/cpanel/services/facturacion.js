import { API_URL, getToken } from '../../services/authService';

/**
 * Estados legibles de los cobros.
 */
export const CHARGE_STATUS = {
  SUCCEEDED: { label: 'Pagado', variant: 'success' },
  FAILED: { label: 'Fallido', variant: 'danger' },
  PENDING: { label: 'Pendiente', variant: 'warning' },
};

/**
 * Obtiene el catálogo de planes de suscripción y paquetes destacados.
 * El backend es la única fuente de verdad (nombre, período, precio, agentes).
 */
export const getPlansCatalog = async () => {
  const res = await fetch(`${API_URL}/payments/plans`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status}`);
  }

  return res.json();
};

/**
 * Obtiene el historial de cobros del usuario autenticado.
 */
export const getCharges = async () => {
  const token = getToken();
  if (!token) throw new Error('No hay sesión activa');

  const res = await fetch(`${API_URL}/billing/charges`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status}`);
  }

  return res.json();
};

/**
 * Inicia el pago de un paquete destacado (Recurrente).
 * @param {'user'|'property'} type
 * @param {string} id  userId (type=user) o propertyId (type=property)
 * @param {string} plan clave de AllPlanType (ej. AGENT_SIGNATURE)
 * @returns {Promise<{ checkout_url?: string, url?: string }>}
 */
export const startFeaturedCheckout = async (type, id, plan) => {
  const token = getToken();
  if (!token) throw new Error('No hay sesión activa');

  const res = await fetch(`${API_URL}/payments/featured`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, id, plan }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status}`);
  }

  return res.json();
};
