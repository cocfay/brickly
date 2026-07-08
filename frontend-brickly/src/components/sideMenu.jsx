import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Nav, Offcanvas } from 'react-bootstrap';
import { FormattedMessage } from 'react-intl';

import logoW from '../assets/images/logos/logo_blanco.png';
import logoB from '../assets/images/logos/logo_negro.png';

import NPhoto from '../assets/images/logos/notPhoto.png';

import { getCurrentUser, logout, isAuthenticated, processGoogleToken, API_URL, AUTH_EVENT_KEY } from '../services/authService';
import SelectLanguage from './selectLanguage';
import SelectCurrency from './selectCurrency';

function sideMenu() {
    const [showOffcanvas, setShowOffcanvas] = useState(false);
    const [user, setUser] = useState(null);
    const [isAuth, setIsAuth] = useState(false);
    const navigate = useNavigate();

    const handleShow = () => setShowOffcanvas(true)    
    const handleClose = () => setShowOffcanvas(false);

    // Efecto para autenticación
    useEffect(() => {
        const initAuth = async () => {
        // Procesar token de Google si viene en la URL
        await processGoogleToken();
        
        // Actualizar estado con los datos del usuario
        const authStatus = isAuthenticated();
        const userData = getCurrentUser();
        
        setIsAuth(authStatus);
        setUser(userData);
        
        };

        initAuth();

        // Escuchar cambios en localStorage (para múltiples pestañas)
        const handleStorageChange = (e) => {
            if (e?.key && e.key !== AUTH_EVENT_KEY) return;
            setIsAuth(isAuthenticated());
            setUser(getCurrentUser());
        };

        const handleUserUpdated = () => {
            setIsAuth(isAuthenticated());
            setUser(getCurrentUser());
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('auth:changed', handleStorageChange);
        window.addEventListener('userUpdated', handleUserUpdated);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('auth:changed', handleStorageChange);
            window.removeEventListener('userUpdated', handleUserUpdated);
        };
    }, []);

    const handleLogout = () => {
        logout();
        setIsAuth(false);
        setUser(null);
        navigate('/');
    };

    const location = useLocation();

    // Verificar si estamos en la página principal (funciona en cualquier entorno)
    // useLocation().pathname es relativo al basename del BrowserRouter
    const isHomePage = [
        '/',
        '/home'
    ].includes(location.pathname);

    const colorLogo = isHomePage ? 'text-white' : 'text-dark';

    const whatsappUrl = `https://wa.me/50237649719?text=` + encodeURIComponent('¡Hola! Deseo contactar a un asesor.')
    
  return (
    <>
    <button onClick={handleShow} className={`btn btn-link p-0 border-0 ${colorLogo}`} aria-label="Abrir menú principal">
        <i className="fa-solid fa-bars fs-4" aria-hidden="true"></i>
    </button>

    {/* Offcanvas */}
    <Offcanvas show={showOffcanvas} onHide={handleClose} placement="end" className="bg-dark text-white">
        <Offcanvas.Header closeButton closeVariant="white">
            <Offcanvas.Title>
                <Link to="/" onClick={handleClose}><img src={logoW} alt="Logo" style={{ width: '120px' }} /></Link>
            </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
            <Nav className="flex-column">
                <div className="d-flex justify-content-between align-items-center my-4">
                    <div className='d-flex align-items-center gap-2'>
                      {/* <SelectLanguage /> */}
                      <SelectCurrency />
                    </div>
                    { isAuth && (
                        !user?.showCpanel ?
                        <Nav.Link as={NavLink} to="/perfil" onClick={handleClose} className='py-1 text-white d-flex gap-2'>
                            { user?.avatar ? 
                                <img src={user?.avatar ? API_URL + user.avatar.replace('/uploads', '') : NPhoto} alt="Imagen" style={{ width: '28px', height: '28px' }} className='object-fit-cover rounded-circle' />
                                :
                                <i className="fa-regular fa-circle-user fs-2" title='Not image'></i>
                            }
                            <div className="text-truncate" style={{ maxWidth: '120px' }}>{user?.name}</div>
                        </Nav.Link>
                    :  
                        <div className='d-flex align-items-center gap-2'>
                            { user?.avatar ? 
                                <img src={user?.avatar ? API_URL + user.avatar.replace('/uploads', '') : NPhoto} alt="Imagen" style={{ width: '28px', height: '28px' }} className='object-fit-cover rounded-circle' />
                                :
                                <i className="fa-regular fa-circle-user fs-2" title='Not image'></i>
                            }
                            <div className="text-truncate" style={{ maxWidth: '120px' }}>{user?.name}</div>
                        </div> )
                    }
                </div>
                { isAuth && (
                <>
                    <div className='d-flex flex-column align-items-start lh-sm'>
                        {user?.roles?.includes("cliente") && (
                            <Nav.Link as={NavLink} to="favoritos" onClick={handleClose} className='py-1 text-white d-flex align-items-baseline gap-2'><FormattedMessage id='boxUp.text5' /> <i className="fa-jelly fa-regular fa-heart"></i></Nav.Link>
                        )}
                        {user?.showCpanel && (
                            <Nav.Link as={NavLink} to="/cpanel" className='text-white'><FormattedMessage id='boxUp.text6' /></Nav.Link>
                        )}
                    </div>
                    <hr className='mt-1 mb-0' />
                </>
                ) }
                <Nav.Link as={NavLink} to="/propiedades" className="text-white py-3 border-bottom border-secondary" onClick={handleClose} style={{ fontSize: '14px' }}>
                    <FormattedMessage id='link.text1' />
                </Nav.Link>
                {/* <Nav.Link as={NavLink} to="arquitectos" className="text-white py-3 border-bottom border-secondary" onClick={handleClose} style={{ fontSize: '14px' }}>
                    <FormattedMessage id='link.text2' />
                </Nav.Link> */}
                {/* <Nav.Link as={NavLink} to="/proyectos" className="text-white py-3 border-bottom border-secondary" onClick={handleClose} style={{ fontSize: '14px' }}>
                    <FormattedMessage id='link.text3' />
                </Nav.Link> */}
                <Nav.Link as={NavLink} to="/agentes" className="text-white py-3 border-bottom border-secondary" onClick={handleClose} style={{ fontSize: '14px' }}>
                    <FormattedMessage id='link.text4' />
                </Nav.Link>
                <Nav.Link as={NavLink} to="/asociados" className="text-white py-3 border-bottom border-secondary" onClick={handleClose} style={{ fontSize: '14px' }}>
                    <FormattedMessage id='link.text5' />
                </Nav.Link>
                <Nav.Link as={NavLink} to="/precios" className="text-white py-3 border-bottom border-secondary" onClick={handleClose} style={{ fontSize: '14px' }}>
                    <FormattedMessage id='link.text6' />
                </Nav.Link>
                <Nav.Link as={NavLink} to="/blog" target="_blank" rel="noreferrer" onClick={handleClose} className="text-white py-3 border-bottom border-secondary" style={{ fontSize: '14px' }}>
                    BLOG
                </Nav.Link>
                
                {/* Redes sociales */}
                <div className="d-flex justify-content-center gap-4 mt-4 pt-4">
                <a href="https://www.facebook.com/profile.php?id=61588999228778" target='_blank' rel="noreferrer" className='text-decoration-none text-white' title='Facebook' aria-label="Abrir Facebook de Brickly Homes">
                    <i className="fa-brands fa-facebook fs-4" aria-hidden="true"></i>
                </a>
                <a href={whatsappUrl} className='text-decoration-none text-white' title='Whatsapp' aria-label="Abrir WhatsApp de Brickly Homes">
                    <i className="fa-brands fa-whatsapp fs-4" aria-hidden="true"></i>
                </a>
                <a href="https://www.instagram.com/bricklyoficial/" target='_blank' rel="noreferrer" className='text-decoration-none text-white' title='Instagram' aria-label="Abrir Instagram de Brickly Homes">
                    <i className="fa-brands fa-instagram fs-4" aria-hidden="true"></i>
                </a>
                <a href="https://www.linkedin.com/company/bricklygt/" target='_blank' rel="noreferrer" className='text-decoration-none text-white' title='Linkedin' aria-label="Abrir LinkedIn de Brickly Homes">
                    <i className="fa-brands fa-linkedin fs-4" aria-hidden="true"></i>
                </a>
                <a href="https://www.tiktok.com/@bricklyhomes?_r=1&_t=ZP-95NIrCBiYAQ" target='_blank' rel="noreferrer" className='text-decoration-none text-white' title='Tiktok' aria-label="Abrir TikTok de Brickly Homes">
                    <i className="fa-brands fa-tiktok fs-4" aria-hidden="true"></i>
                </a>
                </div>
                
                {/* Botón de inicio de sesión */}
                <div className="mt-4">
                { isAuth ? (
                    <Link onClick={handleLogout} className="btn btn-outline-light w-100 py-3">
                    <FormattedMessage id='boxUp.text3' />
                    <i className="fa-solid fa-right-from-bracket ms-2"></i>
                    </Link>
                ) : (
                    <Link to="login" onClick={handleClose} className="btn btn-outline-light w-100 py-3">
                    <i className="fa-solid fa-user me-2"></i> 
                    <FormattedMessage id='boxUp.text2' />
                    </Link>
                )}
                </div>
            </Nav>
        </Offcanvas.Body>
    </Offcanvas>
    </>
  );
}

export default sideMenu;