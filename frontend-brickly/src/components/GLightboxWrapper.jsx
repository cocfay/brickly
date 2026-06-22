import { useEffect, useRef } from 'react';
import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.min.css';

const useGLightbox = (options = {}) => {
const lightboxRef = useRef(null);

useEffect(() => {
    // Configuración por defecto
    const defaultOptions = {
      touchNavigation: true,
      loop: true,
      autoplayVideos: true,
      moreLength: 0,
      ...options
    };

    // Inicializar GLightbox
    lightboxRef.current = GLightbox(defaultOptions);

    // Limpiar al desmontar
    return () => {
      if (lightboxRef.current) {
        lightboxRef.current.destroy();
      }
    };
  }, [options]);

  return lightboxRef;
};

export default useGLightbox;