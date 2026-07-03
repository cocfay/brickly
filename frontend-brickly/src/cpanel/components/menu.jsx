import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom"
import { logout, API_URL, getToken } from './../../services/authService'
import header from './../../cpanel/assets/css/header.module.css'
import { getFullUser } from './../../services/authService';
import { isProfileComplete, requiresExtendedProfile } from '../../utils/profileUtils';
import HelpModal from './HelpModal';

function Menu({open}){
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState([]);
    const [profileOk, setProfileOk] = useState(true);
    const [prePublishedCount, setPrePublishedCount] = useState({ propiedades: 0, proyectos: 0 });
    const [showHelpModal, setShowHelpModal] = useState(false);

    useEffect(() => {
        const updateProfileState = () => {
            const userData = getFullUser();
            setUser(userData);
            if (userData && requiresExtendedProfile(userData)) {
                setProfileOk(isProfileComplete(userData));
            }


        };

        updateProfileState();

        // Escuchar cambios en el perfil para actualizar el menú en tiempo real
        window.addEventListener('userUpdated', updateProfileState);

        return () => {
            window.removeEventListener('userUpdated', updateProfileState);
        };
    }, []);

    // Cargar conteo de pre-published
    useEffect(() => {
        const loadCounts = async () => {
            try {
                const token = getToken();
                const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

                // Propiedades - obtener solo el total de pre-published (usar limit=1 para minimizar datos)
                const propRes = await fetch(`${API_URL}/properties?status=pre-published&page=1&limit=1`, { headers });
                const propData = await propRes.json();
                const propCount = propData?.total ?? 0;

                // Proyectos
                const proyRes = await fetch(`${API_URL}/projects?status=pre-published&page=1&limit=1`, { headers });
                const proyData = await proyRes.json();
                const proyCount = proyData?.total ?? 0;

                setPrePublishedCount({ propiedades: propCount, proyectos: proyCount });
            } catch (e) {
                // Silencioso
            }
        };

        loadCounts();
    }, []);

    const handleLogout = (e) => {
        e.preventDefault();
        logout();
        navigate('/', { replace: true });
    };

    // Devuelve true si la ruta actual empieza con el path dado
    const isActive = (path) => {
        if (path === '/cpanel/' || path === '/cpanel') {
            return location.pathname === '/cpanel' || location.pathname === '/cpanel/';
        }
        return location.pathname.startsWith(path);
    };

    const ActiveIcon = () => (
        <i className="fa-solid fa-caret-left ms-auto" style={{ fontSize: '14px' }}></i>
    );

    return(
        <div className={`${header.menu} ${open ? header.active : ''} d-flex flex-column py-3 px-4`}>
            <div style={{ minHeight: '60px' }}></div>
            <div className="d-flex flex-column flex-grow-1 mt-4 gap-3">
                <Link to="/cpanel/" className="d-flex gap-2 align-items-center text-body">
                    <i className="fa-solid fa-house"></i> Home
                    {isActive('/cpanel/') && <ActiveIcon />}
                </Link>
                {user?.roles?.includes("admin") && (
                    <Link to="/cpanel/destacados" className="d-flex gap-2 align-items-center text-body">
                        <i className="fa-sharp fa-solid fa-diamond"></i> Destacados
                        {isActive('/cpanel/destacados') && <ActiveIcon />}
                    </Link>
                )}
                {!user?.roles?.includes("arquitecto") && profileOk && (
                    <Link to="/cpanel/propiedades" className="d-flex gap-2 align-items-center text-body">
                        <i className="fa-solid fa-building"></i> Propiedades
                        <div className="d-flex align-items-center ms-auto">
                            {user?.roles?.includes("admin") && prePublishedCount.propiedades > 0 && <span style={{ fontSize: '12px', color: '#000' }}> (+{prePublishedCount.propiedades})</span>}
                            {isActive('/cpanel/propiedades') && <ActiveIcon />}
                        </div>
                    </Link>
                )}
                {user?.roles?.includes("agencia") && profileOk && (
                    <Link to="/cpanel/agentes" className="d-flex gap-2 align-items-center text-body">
                        <i className="fa-solid fa-address-card"></i> Agentes
                        {isActive('/cpanel/agentes') && <ActiveIcon />}
                    </Link>
                )}
                {user?.roles?.includes("agencia") && profileOk && (
                    <Link to="/cpanel/solicitudes" className="d-flex gap-2 align-items-center text-body">
                        <i className="fa-solid fa-user-plus"></i> Solicitudes
                        {isActive('/cpanel/solicitudes') && <ActiveIcon />}
                    </Link>
                )}
                {!user?.roles?.includes("arquitecto") && !user?.roles?.includes("admin") && profileOk && (
                    <Link to="/cpanel/leads" className="d-flex gap-2 align-items-center text-body">
                        <i className="fa-solid fa-message"></i> Leads
                        {isActive('/cpanel/leads') && <ActiveIcon />}
                    </Link>
                )}
                {user?.roles?.includes("admin") && profileOk && (
                    <Link to="/cpanel/leads" className="d-flex gap-2 align-items-center text-body">
                        <i className="fa-solid fa-message"></i> Leads
                        {isActive('/cpanel/leads') && <ActiveIcon />}
                    </Link>
                )}
                {/* {(user?.roles?.includes("arquitecto") || user?.roles?.includes("admin")) && profileOk && (
                    <Link to="/cpanel/proyectos" className="d-flex gap-2 align-items-center text-body">
                        <i className="fa-solid fa-pen-ruler"></i> Proyectos
                        {user?.roles?.includes("admin") && prePublishedCount.proyectos > 0 && <span style={{ fontSize: '12px', color: '#000', marginRight: '6px' }}> (+{prePublishedCount.proyectos})</span>}
                        {isActive('/cpanel/proyectos') && <ActiveIcon />}
                    </Link>
                )} */}

                {user?.roles?.includes("admin") &&
                    <Link to="/cpanel/users" className="d-flex gap-2 align-items-center text-body">
                        <i className="fa-solid fa-users"></i> Usuarios
                        {isActive('/cpanel/users') && <ActiveIcon />}
                    </Link>
                }
                {user?.roles?.includes("admin") &&
                    <Link to="/cpanel/asociados" className="d-flex gap-2 align-items-center text-body">
                        <i className="fa-solid fa-handshake"></i> Asociados
                        {isActive('/cpanel/asociados') && <ActiveIcon />}
                    </Link>
                }
                {user?.roles?.includes("admin") &&
                    <Link to="/cpanel/verificacion" className="d-flex gap-2 align-items-center text-body">
                        <i className="fa-solid fa-check-circle"></i> Verificación
                        {isActive('/cpanel/verificacion') && <ActiveIcon />}
                    </Link>
                }
                {/* <Link to="/cpanel/metricas" className="d-flex gap-2 align-items-center text-body">
                    <i className="fa-solid fa-chart-mixed"></i> Métricas
                    {isActive('/cpanel/metricas') && <ActiveIcon />}
                </Link> */}
                {/* <Link to="/cpanel/integraciones" className="d-flex gap-2 align-items-center text-body">
                    <i className="fa-solid fa-link"></i> Integraciones
                    {isActive('/cpanel/integraciones') && <ActiveIcon />}
                </Link> */}
            </div>
            <div className="mb-5 d-flex flex-column gap-2">
                {user?.roles?.includes("admin") ? (
                    <Link to="/cpanel/ayuda" className="d-flex gap-2 align-items-center text-body">
                        <i className="fa-solid fa-circle-info"></i> Ayuda e información
                        {isActive('/cpanel/ayuda') && <ActiveIcon />}
                    </Link>
                ) : (
                    <span onClick={() => setShowHelpModal(true)} className="d-flex gap-2 align-items-center text-body" style={{ cursor: 'pointer' }}>
                        <i className="fa-solid fa-circle-info"></i> Ayuda e información
                    </span>
                )}
                <Link to="/cpanel/config" className="d-flex gap-2 align-items-center text-body">
                    <i className="fa-solid fa-sliders"></i> Ajustes
                    {isActive('/cpanel/config') && <ActiveIcon />}
                </Link>
                <hr />
                <Link to="#" onClick={handleLogout} className="d-flex gap-2 align-items-center text-body">
                    <i className="fa-solid fa-right-from-bracket"></i> Cerrar sesión
                </Link>
            </div>
            <HelpModal show={showHelpModal} onHide={() => setShowHelpModal(false)} />
        </div>
    );
}

export default Menu
