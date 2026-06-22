import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUser } from '../services/authService';
import { getFavoriteIds, toggleFavorite } from '../services/favoritesService';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const navigate = useNavigate();

  const currentUser = getCurrentUser();
  const canFavorite = isAuthenticated() && Array.isArray(currentUser?.roles) && currentUser.roles.includes('cliente');

  useEffect(() => {
    if (!canFavorite) return;
    getFavoriteIds().then(ids => setFavoriteIds(new Set(ids)));
  }, [canFavorite]);

  const isFavorite = (propertyId) => favoriteIds.has(propertyId);

  const toggle = async (propertyId) => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    if (!canFavorite) return;
    const result = await toggleFavorite(propertyId);
    if (result === null) return;
    setFavoriteIds(prev => {
      const next = new Set(prev);
      result.favorite ? next.add(propertyId) : next.delete(propertyId);
      return next;
    });
  };

  return { isFavorite, toggle, canFavorite };
}
