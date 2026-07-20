import { Outlet, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Menu from '../components/menu';
import Navbar from '../components/navbar';
import { isAuthenticated, getCurrentUser, getFullUser, getToken, AUTH_EVENT_KEY, handleAuthError } from './../../services/authService';
import { isProfileComplete, requiresExtendedProfile } from '../../utils/profileUtils';
import GoogleAnalytics from '../../components/GoogleAnalytics';
import './../../cpanel/assets/css/site.css'
import header from './../../cpanel/assets/css/header.module.css'

const API_URL = import.meta.env.VITE_API_URL;

// Refresca el perfil y cierra sesión si el backend indica que el token ya no es válido.
const refreshProfile = async () => {
    try {
        const token = getToken();
        if (!token) return false;
        const res = await fetch(`${API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (res.status === 401) {
            handleAuthError();
            return false;
        }
        if (!res.ok) return false;
        const data = await res.json();
        // Guardar datos completos en sessionStorage
        try {
            sessionStorage.setItem('userFull', JSON.stringify(data));
        } catch {
            // Ignorar errores de almacenamiento local/sessionStorage.
        }
        return true;
    } catch {
        return false;
    }
};

function CpanelLayout() {
    const [ready, setReady] = useState(false);   // true cuando la init terminó OK
    const [authed, setAuthed] = useState(false);  // true cuando hay sesión válida
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Cerrar menú al cambiar de ruta
    useEffect(() => {
        const timeoutId = setTimeout(() => setOpen(false), 0);
        return () => clearTimeout(timeoutId);
    }, [location.pathname]);

    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            // 1. Verificar token en cookie
            if (!isAuthenticated()) {
                navigate('/', { replace: true });
                return;
            }

            // 2. Refrescar perfil completo desde el backend (sin destruir sesión si falla)
            await refreshProfile();
            if (cancelled) return;

            // 3. Leer usuario (cookie mínima)
            const user = getCurrentUser();
            if (!user) {
                navigate('/', { replace: true });
                return;
            }

            // 4. Verificar acceso al cpanel por rol
            const cpanelRoles = ['admin', 'agente', 'agencia', 'arquitecto', 'desarrolladora'];
            if (!user?.roles?.some(r => cpanelRoles.includes(r))) {
                navigate('/', { replace: true });
                return;
            }

            if (cancelled) return;

            setAuthed(true);
            setReady(true);

            // 5. Validar perfil completo (solo una vez por sesión)
            if (!sessionStorage.getItem('profileAlertShown') && location.pathname !== '/cpanel/config') {
                const fullUser = getFullUser();
                if (requiresExtendedProfile(fullUser) && !isProfileComplete(fullUser)) {
                    sessionStorage.setItem('profileAlertShown', 'true');
                    sessionStorage.setItem('showIncompleteAlert', 'true');
                    navigate('/cpanel/config', { replace: true });
                }
            }
        };

        init();

        // Detectar logout en otra pestaña (solo localStorage, no sessionStorage)
        const handleStorage = (e) => {
            if (e?.storageArea === sessionStorage) return;
            if (e?.key && e.key !== AUTH_EVENT_KEY) return;
            if (!isAuthenticated()) {
                setAuthed(false);
                navigate('/', { replace: true });
            }
        };

        // Refrescar perfil cada 5 minutos silenciosamente
        const intervalId = setInterval(refreshProfile, 5 * 60 * 1000);

        window.addEventListener('storage', handleStorage);
        window.addEventListener('auth:changed', handleStorage);
        window.addEventListener('logout', handleStorage);
        return () => {
            cancelled = true;
            clearInterval(intervalId);
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('auth:changed', handleStorage);
            window.removeEventListener('logout', handleStorage);
        };
    }, []);

    // Mientras init no termina, no renderizar nada
    if (!ready || !authed) return null;

    // Guard: si el usuario tiene acceso bloqueado por pago no procesado,
    // redirigir a la página de reintento (excepto si ya está en ella)
    const fullUser = getFullUser();
    if (fullUser?.accessBlocked && location.pathname !== '/cpanel/retry-payment') {
        return <Navigate to="/cpanel/retry-payment" replace />;
    }

    // Guard: bloquear rutas específicas si perfil incompleto
    const blockedPaths = ['/cpanel/propiedades', '/cpanel/agentes', '/cpanel/proyectos'];
    if (fullUser && requiresExtendedProfile(fullUser) && !isProfileComplete(fullUser)) {
        if (blockedPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))) {
            return <Navigate to="/cpanel/" replace />;
        }
    }

    return (
        <div className="cpanel-layout">
            <GoogleAnalytics />
            <Navbar toggle={() => setOpen(!open)} />
            <Menu open={open} />
            <div className={`${header.main} mt-3 mb-5`}>
                <Outlet />
            </div>
        </div>
    );
}

export default CpanelLayout;
