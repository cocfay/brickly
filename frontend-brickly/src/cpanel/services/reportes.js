import { API_URL, getToken } from '../../services/authService';

/**
 * Reporte de ventas de suscripciones (solo admin), basado en BillingCharge.
 * Devuelve KPIs, desglose por plan, por mes y el detalle de cada cargo.
 */
export const getSalesReport = async ({ from, to } = {}) => {
  const token = getToken();
  if (!token) throw new Error('No hay sesión activa');

  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();

  const res = await fetch(`${API_URL}/billing/report/sales${qs ? `?${qs}` : ''}`, {
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
