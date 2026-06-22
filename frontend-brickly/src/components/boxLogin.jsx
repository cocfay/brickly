
import { useState, useEffect } from 'react';
import { NavDropdown } from 'react-bootstrap';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, isAuthenticated, processGoogleToken, API_URL, AUTH_EVENT_KEY } from '../services/authService';
import { FormattedMessage } from 'react-intl';

import SelectLanguage from './selectLanguage';
import SelectCurrency from './selectCurrency';

import NPhoto from '../assets/images/logos/notPhoto.png';

function boxLogin() {
    const [user, setUser] = useState(null);
    const [isAuth, setIsAuth] = useState(false);
    const navigate = useNavigate();

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

  return (
    <>
    <NavDropdown id="nav-dropdown-dark-example" className='fs-4 no-arrow' title={<i className="fa-solid fa-bars"></i>} menuVariant="light" drop="down-centered">
        <div className='d-flex justify-content-between align-items-center'>
            {/* <FormattedMessage id='boxUp.text1' /> */}
            <div className='d-flex align-items-center gap-2'>
              {/* <SelectLanguage /> */}
              <SelectCurrency />
            </div>
        </div>
        <NavDropdown.Divider className='my-3' />
        {isAuth && user ? (
            <>
            <div className='lh-sm'>
                <div className="d-flex align-items-center gap-2 mb-2">
                    { user?.avatar ? 
                        <img src={user?.avatar ? API_URL + user.avatar.replace('/uploads', '') : NPhoto} alt="Imagen" style={{ width: '28px', height: '28px' }} className='object-fit-cover rounded-circle' />
                        :
                        <i className="fa-regular fa-circle-user fs-2" title='Not image'></i>
                    }
                    {user.name}
                </div>
                {user.showCpanel && (
                    <NavDropdown.Item as={Link} to="/cpanel" className='text-start px-0 mb-1'><FormattedMessage id='boxUp.text6' /></NavDropdown.Item>
                )}
                { user.roles?.includes("cliente") &&
                    <NavDropdown.Item as={Link} to="/perfil" className='text-start px-0 mb-1'><FormattedMessage id='boxUp.text4' /></NavDropdown.Item>
                }
                { user?.roles?.includes("cliente") && (
                    <NavDropdown.Item as={Link} to="/favoritos" className='text-start px-0 d-flex align-items-baseline gap-1'><FormattedMessage id='boxUp.text5' /><i className="fa-jelly fa-regular fa-heart"></i></NavDropdown.Item>
                )}
            </div>
            <NavDropdown.Divider className='mt-2 mb-3' />
            <NavDropdown.Item onClick={handleLogout} className='text-center rounded-1' style={{fontSize: '13px', border: '1px solid gray'}}>
            <FormattedMessage id='boxUp.text3' />
            </NavDropdown.Item>
        </>
    ) : (
        <NavDropdown.Item as={Link} to="/login" className='text-center rounded-1' style={{fontSize: '13px', border: '1px solid gray'}}>
            <FormattedMessage id='boxUp.text2' />
        </NavDropdown.Item> 
    )}
    </NavDropdown>
    </>
  );
}

export default boxLogin;