import { useEffect } from 'react';
import { getCurrentUser } from '../services/authService';

const GA_ID = 'G-MVWQ5JJY0Y';

/**
 * Google Analytics component.
 * Only loads in production, and only loads for non-admin users.
 * Works on both the public portal and the cpanel.
 */
function GoogleAnalytics() {
  useEffect(() => {
    // Solo en producción
    if (!import.meta.env.PROD) return;

    // Si el usuario autenticado es admin, no cargar analytics
    const user = getCurrentUser();
    if (user?.roles?.includes('admin')) return;

    // Evitar inyectar el script más de una vez
    if (document.querySelector(`script[data-ga-id="${GA_ID}"]`)) return;

    // Inyectar gtag script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.async = true;
    script.setAttribute('data-ga-id', GA_ID);
    document.head.appendChild(script);

    // Inyectar la configuración de gtag
    const inlineScript = document.createElement('script');
    inlineScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_ID}');
    `;
    document.head.appendChild(inlineScript);

    // Cleanup opcional: si se desmonta el componente, no removemos los scripts
    // porque ya se cargaron y seguirían funcionando. Pero si quieres limpiarlos
    // puedes descomentar lo siguiente:
    // return () => {
    //   document.head.removeChild(script);
    //   document.head.removeChild(inlineScript);
    // };
  }, []);

  // Este componente no renderiza nada visual
  return null;
}

export default GoogleAnalytics;