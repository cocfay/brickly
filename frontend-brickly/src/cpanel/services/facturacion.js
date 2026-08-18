import { API_URL, getToken } from '../../services/authService';

/**
 * Metadata de los planes para mostrarla en la suscripción actual
 * (nombre, color de la vista de precios, periodo, agentes incluidos y precio).
 */
export const PLAN_DETAILS = {
  BROKER_MENSUAL: { name: 'AGENTE INDIVIDUAL', color: '#F29500', period: 'Mensual', agents: 1, price: 420 },
  BROKER_ANUAL: { name: 'AGENTE INDIVIDUAL', color: '#F29500', period: 'Anual', agents: 1, price: 4200 },
  AGENCIA_SILVER: { name: 'AGENCIA SILVER', color: 'rgb(180 180 180)', period: 'Mensual', agents: 1, price: 420 },
  AGENCIA_SILVER_A: { name: 'AGENCIA SILVER', color: 'rgb(180 180 180)', period: 'Anual', agents: 1, price: 4200 },
  AGENCIA_GOLD: { name: 'AGENCIA GOLD', color: 'rgb(200 165 14)', period: 'Mensual', agents: 5, price: 650 },
  AGENCIA_GOLD6: { name: 'AGENCIA GOLD', color: 'rgb(200 165 14)', period: 'Mensual', agents: 6, price: 725 },
  AGENCIA_GOLD7: { name: 'AGENCIA GOLD', color: 'rgb(200 165 14)', period: 'Mensual', agents: 7, price: 800 },
  AGENCIA_GOLD8: { name: 'AGENCIA GOLD', color: 'rgb(200 165 14)', period: 'Mensual', agents: 8, price: 875 },
  AGENCIA_GOLD9: { name: 'AGENCIA GOLD', color: 'rgb(200 165 14)', period: 'Mensual', agents: 9, price: 950 },
  AGENCIA_GOLD_A: { name: 'AGENCIA GOLD', color: 'rgb(200 165 14)', period: 'Anual', agents: 5, price: 6500 },
  AGENCIA_GOLD6_A: { name: 'AGENCIA GOLD', color: 'rgb(200 165 14)', period: 'Anual', agents: 6, price: 6575 },
  AGENCIA_GOLD7_A: { name: 'AGENCIA GOLD', color: 'rgb(200 165 14)', period: 'Anual', agents: 7, price: 6650 },
  AGENCIA_GOLD8_A: { name: 'AGENCIA GOLD', color: 'rgb(200 165 14)', period: 'Anual', agents: 8, price: 6725 },
  AGENCIA_GOLD9_A: { name: 'AGENCIA GOLD', color: 'rgb(200 165 14)', period: 'Anual', agents: 9, price: 6800 },
  AGENCIA_DIAMOND: { name: 'AGENCIA DIAMOND', color: 'rgb(0 154 241)', period: 'Mensual', agents: 10, price: 1050 },
  AGENCIA_DIAMOND_A: { name: 'AGENCIA DIAMOND', color: 'rgb(0 154 241)', period: 'Anual', agents: 10, price: 10500 },
};

// Estados legibles de los cobros
export const CHARGE_STATUS = {
  SUCCEEDED: { label: 'Pagado', variant: 'success' },
  FAILED: { label: 'Fallido', variant: 'danger' },
  PENDING: { label: 'Pendiente', variant: 'warning' },
};

export const getPlanDetails = (planKey) => {
  if (PLAN_DETAILS[planKey]) return PLAN_DETAILS[planKey];
  if (!planKey) return null;
  // Planes no mapeados (test/manual): intentar derivar el periodo
  const period = planKey === 'BROKER_ANUAL' || String(planKey).endsWith('_A') ? 'Anual' : 'Mensual';
  return { name: planKey, color: '#000', period, agents: null, price: null };
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