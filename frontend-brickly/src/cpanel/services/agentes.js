import { API_URL, getToken, handleAuthError } from '../../services/authService';
import { fetchAllPages } from '../../utils/fetchAll';

export const createAgente = async (data) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/auth/create-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            if (response.status === 401) { handleAuthError(); throw new Error('Sesión expirada'); }
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || `Error ${response.status}`);
        }

        const result = await response.json();
        return { success: true, data: result };

    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const getAgentLimit = async () => {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/me/agent-limit`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            if (response.status === 401) { handleAuthError(); throw new Error('Sesión expirada'); }
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || `Error ${response.status}`);
        }
        return { success: true, data: await response.json() };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const getAgentes = async () => {
    try {
        const token = getToken();
        const data = await fetchAllPages(`${API_URL}/users/list-user-me`, 100, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message, data: [] };
    }
};

export const getAgenteById = async (id) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            if (response.status === 401) { handleAuthError(); throw new Error('Sesión expirada'); }
            throw new Error(`Error ${response.status}`);
        }
        return { success: true, data: await response.json() };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const updateAgente = async (id, data) => {
    try {
        const token = getToken();
        const body = JSON.stringify(data);
        console.log('updateAgente - id:', id, 'body:', body);
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body
        });
        if (!response.ok) {
            if (response.status === 401) { handleAuthError(); throw new Error('Sesión expirada'); }
            const text = await response.text();
            let msg = `Error ${response.status}`;
            try { msg = JSON.parse(text)?.message || msg; } catch { msg = text || msg; }
            console.error('updateAgente error:', response.status, text);
            throw new Error(msg);
        }
        return { success: true, data: await response.json() };
    } catch (error) {
        console.error('updateAgente catch:', error.message);
        return { success: false, error: error.message };
    }
};

export const deleteAgente = async (id) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            if (response.status === 401) { handleAuthError(); throw new Error('Sesión expirada'); }
            throw new Error(`Error ${response.status}`);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
