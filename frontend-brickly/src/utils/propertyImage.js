import sinPropiedad from '../cpanel/assets/images/iconos/sinPropiedad.png';

export const PROPERTY_PLACEHOLDER = sinPropiedad;

export const handlePropertyImageError = (e) => {
  const img = e.currentTarget;
  if (!img.dataset.fallback) {
    img.dataset.fallback = 'true';
    img.src = sinPropiedad;
  }
};