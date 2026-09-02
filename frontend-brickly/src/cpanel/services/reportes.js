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

/**
 * Reporte de agentes inmobiliarios (solo admin).
 * KPIs globales + listado de agentes con sus propiedades, leads y actividad.
 */
export const getAgentsReport = async () => {
  const token = getToken();
  if (!token) throw new Error('No hay sesión activa');

  const res = await fetch(`${API_URL}/users/report/agents`, {
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
 * Reporte de agencias (solo admin).
 * KPIs globales + listado de agencias con sus métricas
 * (propiedades, agentes, proyectos, leads, suscripción).
 */
export const getAgenciesReport = async () => {
  const token = getToken();
  if (!token) throw new Error('No hay sesión activa');

  const res = await fetch(`${API_URL}/users/report/agencies`, {
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
 * Reporte de proyectos por desarrolladora (solo admin).
 * Agrupa los proyectos (colección Project) por `desarrolladora.nombre`.
 */
export const getProjectsByDeveloperReport = async () => {
  const token = getToken();
  if (!token) throw new Error('No hay sesión activa');

  const res = await fetch(`${API_URL}/projects/report/by-developer`, {
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
