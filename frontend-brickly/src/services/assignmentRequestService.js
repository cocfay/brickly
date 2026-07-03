import { API_URL, getToken } from './authService';

const headers = () => ({
  'Authorization': `Bearer ${getToken()}`,
  'Content-Type': 'application/json',
});

export const checkAssignmentEligibility = async (propertyId) => {
  try {
    const res = await fetch(`${API_URL}/assignment-requests/eligibility/${propertyId}`, {
      headers: headers(),
    });
    if (!res.ok) return { eligible: false };
    return await res.json();
  } catch {
    return { eligible: false };
  }
};

export const createAssignmentRequest = async (propertyId) => {
  try {
    const res = await fetch(`${API_URL}/assignment-requests`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ propertyId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al crear solicitud');
    }
    return await res.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAgencyAssignmentRequests = async () => {
  try {
    const res = await fetch(`${API_URL}/assignment-requests/agency`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error('Error al cargar solicitudes');
    return await res.json();
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export const approveAssignmentRequest = async (requestId) => {
  try {
    const res = await fetch(`${API_URL}/assignment-requests/${requestId}/approve`, {
      method: 'PUT',
      headers: headers(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al aprobar');
    }
    return await res.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const rejectAssignmentRequest = async (requestId, reason = '') => {
  try {
    const res = await fetch(`${API_URL}/assignment-requests/${requestId}/reject`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al rechazar');
    }
    return await res.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
};
