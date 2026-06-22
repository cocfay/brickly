import { useEffect, useRef } from 'react';
import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.min.css';

// deps: array de valores que cuando cambian reinicializan el lightbox
const useGLightbox = (options = {}, deps = []) => {
  const lightboxRef = useRef(null);

  useEffect(() => {
    const init = () => {
      if (lightboxRef.current) {
        lightboxRef.current.destroy();
        lightboxRef.current = null;
      }
      lightboxRef.current = GLightbox({
        touchNavigation: true,
        loop: true,
        autoplayVideos: false,
        moreLength: 0,
        openEffect: 'zoom',
        closeEffect: 'fade',
        ...options,
      });
    };

    // Delay para asegurar que el DOM esté actualizado
    const timer = setTimeout(init, 150);

    return () => {
      clearTimeout(timer);
      if (lightboxRef.current) {
        lightboxRef.current.destroy();
        lightboxRef.current = null;
      }
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return lightboxRef;
};

export default useGLightbox;
