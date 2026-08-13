import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUser } from '../services/authService';
import { getFavoriteProjectIds, toggleFavoriteProject } from '../services/favoritesService';

export function useFavoriteProjects() {
  const [favoriteProjectIds, setFavoriteProjectIds] = useState(new Set());
  const navigate = useNavigate();

  const currentUser = getCurrentUser();
  const canFavorite = isAuthenticated() && Array.isArray(currentUser?.roles) && currentUser.roles.includes('cliente');

  useEffect(() => {
    if (!canFavorite) return;
    getFavoriteProjectIds().then(ids => setFavoriteProjectIds(new Set(ids)));
  }, [canFavorite]);

  const isFavorite = (projectId) => favoriteProjectIds.has(projectId);

  const toggle = async (projectId) => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    if (!canFavorite) return;
    const result = await toggleFavoriteProject(projectId);
    if (result === null) return;
    setFavoriteProjectIds(prev => {
      const next = new Set(prev);
      result.favorite ? next.add(projectId) : next.delete(projectId);
      return next;
    });
  };

  return { isFavorite, toggle, canFavorite };
}
