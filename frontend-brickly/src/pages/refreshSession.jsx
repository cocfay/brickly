import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchUserProfile, isAuthenticated } from '../services/authService';

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 6; // ~9s de espera máxima en total

/**
 * Ruta de retorno tras un pago exitoso en Recurrente.
 * Hace polling corto sobre el perfil del usuario esperando a que el
 * webhook termine de asignar el rol/plan (subscriptionStatus === 'ACTIVE'
 * Y subscriptionPlan === el plan que se acaba de comprar, recibido por
 * query param), y luego redirige al home. Así el usuario no tiene que
 * cerrar y volver a iniciar sesión para ver su rol actualizado.
 *
 * Comparar también el plan (no solo el status) es necesario para el caso
 * de un upgrade/downgrade entre planes (ej. Silver -> Gold): el usuario
 * ya tenía subscriptionStatus === 'ACTIVE' desde antes, así que solo
 * revisar el status terminaría el polling de inmediato sin esperar a que
 * el webhook actualice el plan nuevo.
 */
function RefreshSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const expectedPlan = searchParams.get('plan');
  const [message, setMessage] = useState('Confirmando tu pago...');

  useEffect(() => {
    let isMounted = true;
    let attempt = 0;

    const finish = () => {
      if (isMounted) navigate('/', { replace: true });
    };

    const poll = async () => {
      if (!isAuthenticated()) {
        finish();
        return;
      }

      attempt += 1;

      const result = await fetchUserProfile();

      if (!isMounted) return;

      const info = result?.info;
      const isActive = result.success && info?.subscriptionStatus === 'ACTIVE';
      const planMatches = expectedPlan ? info?.subscriptionPlan === expectedPlan : true;

      if (isActive && planMatches) {
        // El webhook ya asignó el rol/plan esperado -> listo, redirigir
        finish();
        return;
      }

      if (attempt >= MAX_ATTEMPTS) {
        // Se acabaron los intentos: el webhook puede seguir tardando por
        // su cuenta; igual redirigimos, el perfil se sincronizará solo
        // en la próxima carga.
        finish();
        return;
      }

      setMessage('Estamos confirmando tu suscripción, un momento...');
      setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();

    return () => { isMounted = false; };
  }, [navigate, expectedPlan]);

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="text-center">
        <div className="spinner-border text-dark" role="status">
          <span className="visually-hidden">Actualizando tu sesión...</span>
        </div>
        <p className="mt-3 text-muted">{message}</p>
      </div>
    </div>
  );
}

export default RefreshSession;
