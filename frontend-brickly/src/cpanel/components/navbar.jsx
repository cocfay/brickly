import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from './../../assets/images/logos/logo_blanco.png';
import NPhoto from './../../assets/images/logos/notPhoto.png';

import { getCurrentUser, processGoogleToken, API_URL, AUTH_EVENT_KEY } from './../../services/authService';

function Navbar({ toggle }) {
    const [user, setUser] = useState(null);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        const initAuth = async () => {
            await processGoogleToken();
            const userData = getCurrentUser();
            setUser(userData);
        };

        initAuth();

        const handleStorageChange = (e) => {
            if (e?.key && e.key !== AUTH_EVENT_KEY) return;
            setUser(getCurrentUser());
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('auth:changed', handleStorageChange);
        window.addEventListener('userUpdated', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('auth:changed', handleStorageChange);
            window.removeEventListener('userUpdated', handleStorageChange);
        };
    }, []);

     // Si no hay usuario, no renderizar nada
    if (!user) return null;

    return (
        <div className="bg-dark position-sticky top-0" style={{ zIndex: '999' }}>
            <div className="py-3 px-4 text-white d-flex justify-content-between align-items-center">
                <Link to="/"><img src={Logo} alt="Logo" style={{ width: '120px' }} /></Link>
                <div className='d-none d-lg-flex gap-2 align-items-center'>
                    { user?.avatar ? 
                        <img src={user?.avatar ? API_URL + user.avatar.replace('/uploads', '') : NPhoto} alt="Imagen" style={{ width: '28px', height: '28px' }} className='object-fit-cover rounded-circle' />
                        :
                        <i className="fa-regular fa-circle-user fs-3" title='Not image'></i>
                    }
                    <span>{user.name}</span>
                </div>
                <div className='d-flex d-lg-none'>
                    <i className="fa-solid fa-bars" onClick={toggle}></i>
                </div>
            </div>
        </div>
    );
}

export default Navbar;