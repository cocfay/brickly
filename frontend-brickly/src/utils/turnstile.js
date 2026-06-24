const LOCAL_TEST_SITE_KEY = '1x00000000000000000000AA';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export const isLocalTurnstileEnvironment = () => {
  if (typeof window === 'undefined') return false;
  return import.meta.env.DEV && LOCAL_HOSTS.has(window.location.hostname);
};

export const getTurnstileSiteKey = () => {
  if (isLocalTurnstileEnvironment()) {
    return import.meta.env.VITE_TURNSTILE_LOCAL_SITE_KEY || LOCAL_TEST_SITE_KEY;
  }

  return import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
};

export const shouldRequireTurnstileToken = () => !isLocalTurnstileEnvironment();

export const getTurnstileToken = (widgetId) => {
  if (!widgetId || !window.turnstile) return null;
  return window.turnstile.getResponse(widgetId);
};

export const resetTurnstileWidget = (widgetId) => {
  if (widgetId && window.turnstile) {
    window.turnstile.reset(widgetId);
  }
};
