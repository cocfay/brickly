import { API_URL } from './authService';

const profileCache = new Map();

export const getPublicProfile = async (identifier) => {
  const key = String(identifier || '').trim();

  if (!key) {
    throw new Error('Perfil no especificado');
  }

  if (profileCache.has(key)) {
    return profileCache.get(key);
  }

  const response = await fetch(`${API_URL}/users/profile/${encodeURIComponent(key)}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Error ${response.status} al cargar perfil`);
  }

  const data = await response.json();
  profileCache.set(key, data);

  if (data?._id) profileCache.set(data._id, data);
  if (data?.profileSlug) profileCache.set(data.profileSlug, data);

  return data;
};
