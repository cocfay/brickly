import { API_URL, getToken } from './authService';

const getHeaders = () => ({
  'Authorization': `Bearer ${getToken()}`,
  'Content-Type': 'application/json',
});

// Toggle favorito — devuelve { favorite: true/false }
export const toggleFavorite = async (propertyId) => {
  try {
    const res = await fetch(`${API_URL}/users/favorites/${propertyId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('toggleFavorite:', e);
    return null;
  }
};

// Obtener IDs de propiedades favoritas del usuario actual
export const getFavoriteIds = async () => {
  try {
    const res = await fetch(`${API_URL}/users/favorites`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    return (data.favorites || []).map(p => p._id);
  } catch (e) {
    console.error('getFavoriteIds:', e);
    return [];
  }
};

// Obtener propiedades favoritas completas
export const getFavorites = async () => {
  try {
    const res = await fetch(`${API_URL}/users/favorites`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    /* console.log(data.favorites); */
    const favData = Array.isArray(data.favorites) ? data.favorites : []
    
    return favData;
  } catch (e) {
    console.error('getFavorites:', e);
    return [];
  }
};
