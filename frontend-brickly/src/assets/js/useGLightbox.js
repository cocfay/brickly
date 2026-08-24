import { useEffect, useRef } from 'react';
import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.min.css';

// deps: array de valores que cuando cambian reinicializan el lightbox
const useGLightbox = (options = {}, deps = []) => {
  const lightboxRef = useRef(null);

  useEffect(() => {
    // Quitar el foco del trigger antes de abrir el lightbox:
    // GLightbox marca #root con aria-hidden y el navegador bloquea la
    // aplicación si un elemento enfocado queda dentro (advertencia a11y).
    const blurTrigger = (e) => {
      const trigger = e.target && e.target.closest ? e.target.closest('a.glightbox') : null;
      if (trigger && typeof trigger.blur === 'function') {
        trigger.blur();
      }
    };
    document.addEventListener('click', blurTrigger, true);

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
      document.removeEventListener('click', blurTrigger, true);
      if (lightboxRef.current) {
        lightboxRef.current.destroy();
        lightboxRef.current = null;
      }
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return lightboxRef;
};

export default useGLightbox;
