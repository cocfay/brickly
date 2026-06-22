import { useEffect, useLayoutEffect  } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    // Si es navegación hacia atrás (POP), no hacer scroll al tope
    // para mantener la posición donde estaba el usuario
    if (navigationType === 'POP') {
      return;
    }
    
    /* window.scrollTo(0, 0);  */
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // 'instant' es más rápido que 'auto' en algunos navegadores
    });
    
    // Doble aseguramiento para el body y html
    document.body.scrollTop = 0; // Para Safari
    document.documentElement.scrollTop = 0; // Para Chrome, Firefox, IE
  }, [pathname, navigationType]); // Se ejecuta cada vez que cambia la ruta

  return null; // No renderiza nada
}

export default ScrollToTop;
