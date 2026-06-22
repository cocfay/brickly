import { API_URL, getToken } from './authService';
import { fetchAllPages } from '../utils/fetchAll';

// Crear una reseña para un agente
// Body: { agentId, comment, rating (1-5) }
export const createReview = async ({ agentId, comment, rating }) => {
    try {
        const token = getToken();
        if (!token) throw new Error('No hay sesión activa');

        const response = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ agentId, comment, rating })
        });

        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { message: text }; }

        if (!response.ok) {
            throw new Error(data.message || `Error ${response.status}`);
        }

        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Actualizar una reseña existente
export const updateReview = async ({ agentId, comment, rating }) => {
    try {
        const token = getToken();
        if (!token) throw new Error('No hay sesión activa');

        const response = await fetch(`${API_URL}/reviews/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ agentId, comment, rating })
        });

        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { message: text }; }

        if (!response.ok) {
            throw new Error(data.message || `Error ${response.status}`);
        }

        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Eliminar la reseña del usuario actual para un agente
// Body: { agentId }
export const deleteReview = async (agentId) => {
    try {
        const token = getToken();
        if (!token) throw new Error('No hay sesión activa');

        const response = await fetch(`${API_URL}/reviews/${agentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            //body: JSON.stringify({ agentId })
        });

        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { message: text }; }

        if (!response.ok) {
            throw new Error(data.message || `Error ${response.status}`);
        }

        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Obtener reseñas de un agente por su ID
export const getReviewsByAgent = async (agentId) => {
    try {
        // Cargar reseñas y lista de usuarios en paralelo
        const [reviewsRes, usersArr] = await Promise.all([
            fetch(`${API_URL}/reviews/agent/${agentId}`),
            fetchAllPages(`${API_URL}/users/list-user`)
        ]);

        const reviewsText = await reviewsRes.text();
        let data;
        try { data = JSON.parse(reviewsText); } catch { data = { message: reviewsText }; }

        if (!reviewsRes.ok) {
            throw new Error(data.message || `Error ${reviewsRes.status}`);
        }

        // Construir mapa de avatares por userId
        let usersMap = {};
        usersArr.forEach(u => { usersMap[u._id] = u; });

        const reviews = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);

        const visibleReviews = reviews.filter(r => r.isVisible !== false);

        // Construir URL del avatar cruzando con la lista de usuarios
        // reviewerId puede llegar como objeto populado { _id, name, avatar } o como string ID
        const processed = visibleReviews.map(r => {

            const isPopulated = r.reviewerId && typeof r.reviewerId === 'object';
            const userId = isPopulated ? r.reviewerId._id : r.reviewerId;
            const userFromList = userId ? usersMap[userId] : null;

            const name = userFromList?.name || (isPopulated ? r.reviewerId.name : null);
            const avatarPath = userFromList?.avatar || (isPopulated ? r.reviewerId.avatar : null);

            return {
                ...r,
                reviewerId: {
                    _id: userId,
                    name: name || null,
                    avatar: avatarPath || null,
                    avatarUrl: avatarPath
                        ? API_URL + avatarPath.replace('/uploads', '')
                        : null
                }
            };
        });

        return { success: true, data: processed };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
