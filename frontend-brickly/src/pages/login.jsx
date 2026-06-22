import React, { useState, useEffect, useRef } from "react";
import { Container, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FormattedMessage } from "react-intl";
import { useT } from '../hooks/useT';

import login from '../assets/images/imagenes_de_fondo/loginImg.webp';
import logoB from '../assets/images/logos/logo_negro.png';
import google from '../assets/images/logos/google.png';
import { loginWithEmail, isAuthenticated, getCurrentUser, fetchUserProfile, getFullUser } from '../services/authService';
import { isProfileComplete, requiresExtendedProfile } from '../utils/profileUtils';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

function Login() {

    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [alert, setAlert] = useState({ show: false, variant: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const alertContainerRef = useRef(null);
    const isLoggingIn = useRef(false); // evita que checkAuth interfiera durante el login
    const [turnstileReady, setTurnstileReady] = useState(false);
    const turnstileRef = useRef(null);
    const turnstileWidgetId = useRef(null);
    const emailInputId = 'login-email';
    const passwordInputId = 'login-password';

    const t = useT()

    // Inicializar Turnstile cuando el script cargue
    useEffect(() => {
        const checkTurnstile = () => {
            if (window.turnstile) {
                setTurnstileReady(true);
            } else {
                setTimeout(checkTurnstile, 300);
            }
        };
        checkTurnstile();
    }, []);

    // Renderizar widget Turnstile
    useEffect(() => {
        if (turnstileReady && turnstileRef.current && !turnstileWidgetId.current) {
            turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
                sitekey: TURNSTILE_SITE_KEY,
                theme: 'light'
            });
        }
    }, [turnstileReady]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            setAlert({ show: true, variant: 'danger', message: t('Correo y contraseña son obligatorios', 'Email and password are required') });
            return;
        }

        // Validar Turnstile
        const turnstileToken = turnstileWidgetId.current
            ? window.turnstile.getResponse(turnstileWidgetId.current)
            : null;
        
        if (!turnstileToken) {
            setAlert({ show: true, variant: 'warning', message: t('Por favor, completa la verificación de seguridad', 'Please complete the security verification') });
            return;
        }

        setLoading(true);
        isLoggingIn.current = true;
        const result = await loginWithEmail(formData, turnstileToken);

        if (result.success) {
            // Resetear Turnstile
            if (turnstileWidgetId.current) {
                window.turnstile.reset(turnstileWidgetId.current);
            }

            setAlert({ show: true, variant: 'success', message: t('¡Login exitoso! Redirigiendo...', 'Login successful! Redirecting...') });
            // Notificar a boxLogin y otros componentes que el usuario cambió
            window.dispatchEvent(new Event('userUpdated'));
            setTimeout(async () => {
                if (!getCurrentUser()?.roles?.includes('cliente')) {
                    // Refrescar perfil desde backend para asegurar agentInfo actualizado
                    await fetchUserProfile();
                    const user = getFullUser();
                    console.warn('[LoginCheck]', JSON.stringify({ roles: user?.roles, agentInfo: user?.agentInfo, avatar: user?.avatar, name: user?.name, phone: user?.phone }));
                    const needsProfile = requiresExtendedProfile(user);
                    if (needsProfile) {
                        navigate(!isProfileComplete(user) ? '/cpanel/config' : '/cpanel');
                    } else {
                        navigate('/cpanel');
                    }
                } else {
                    navigate('/')
                }
            }, 1500);
        } else {
            // Resetear Turnstile en caso de error
            if (turnstileWidgetId.current) {
                window.turnstile.reset(turnstileWidgetId.current);
            }
            setAlert({ show: true, variant: 'danger', message: result.error || t('Error al iniciar sesión', 'Error logging in') });
        }
        setLoading(false);
    };

    // Scroll y auto-cierre de alerta
    useEffect(() => {
        if (alert.show && alertContainerRef.current) {
        alertContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const timer = setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
        return () => clearTimeout(timer);
        }
    }, [alert.show]);

    //const [isAuth, setIsAuth] = useState(false);

    useEffect(() => {
        // Verificar autenticación y obtener usuario
        const checkAuth = () => {
            const authStatus = isAuthenticated();
            if(authStatus && !isLoggingIn.current)
                navigate('/');
        }
        
        checkAuth();
    }, [navigate])

    return (
        <Container className='mt-5' style={{ fontSize: 'clamp(16px, 3vw, 24px)', marginBottom: 'clamp(5rem, 10vw, 9rem)' }}>
            <div className="row" style={{ background: '#FAFAFA' }}>
                <div className="col-lg-7 d-none d-lg-block">
                    <img src={login} className='w-100' alt="image" />
                </div>
                <div className="col-lg-5 py-5 px-3 px-lg-5">
                    <div className='text-center m-auto'>
                        <img src={logoB} style={{ width: '200px' }} alt="Logo" />
                        <div className='lh-sm mt-3 mt-lg-5'><FormattedMessage id="login.text1" /></div>

                        {/* Alerts de Bootstrap */}
                        {alert.show && (
                            <Alert variant={alert.variant} onClose={() => setAlert({...alert, show: false})} dismissible className="mt-3" style={{ fontSize: '16px' }}>
                                {alert.message}
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className='d-flex flex-column gap-3 mt-5'>
                                <label htmlFor={emailInputId} className="visually-hidden">{t('Correo', 'Email')}</label>
                                <input type="text" name="email" id={emailInputId} className="form-control rounded-1" style={{ minHeight: '50px' }} placeholder={t('Correo', 'Email')} value={formData.email} onChange={handleChange} disabled={loading} autoComplete="email" />
                                <div className="position-relative">
                                    <label htmlFor={passwordInputId} className="visually-hidden">{t('Contraseña', 'Password')}</label>
                                    <input type={showPassword ? "text" : "password"} name="password" id={passwordInputId} className="form-control rounded-1 pe-5" style={{ minHeight: '50px' }} placeholder={t('Contraseña', 'Password')} value={formData.password} onChange={handleChange} disabled={loading} autoComplete="current-password" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t('Ocultar contraseña', 'Hide password') : t('Mostrar contraseña', 'Show password')} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 5, fontSize: '18px', border: 'none', background: 'transparent', padding: 0, color: '#6c757d' }}>
                                        <i className={`fa-regular fa-eye${showPassword ? '-slash' : ''}`}></i>
                                    </button>
                                </div>
                                <div className='d-flex justify-content-end text-muted' style={{ fontSize: '14px' }}><Link to="/recuperar-contrasena" className="text-muted"><FormattedMessage id="login.text2" /></Link></div>
                                {/* Turnstile Widget */}
                                <div className="d-flex justify-content-center">
                                    <div ref={turnstileRef}></div>
                                </div>
                                <button type="submit" className='py-2 rounded-1 mt-3 bg-black text-white' disabled={loading}><FormattedMessage id="login.text3" /></button>
                            </div>
                        </form>
                        <Link to={`${import.meta.env.VITE_API_URL}/auth/google?app=panel`} className="d-flex gap-1 justify-content-center align-items-center w-100 text-dark py-2 fw-bold mt-4" style={{ fontSize: '16px', backgroundColor: '#e1e1e1'}} aria-label={t('Continuar con Google', 'Continue with Google')}> <img src={google} style={{ width: '26px' }} alt="Google" /> <FormattedMessage id="login.text4" /></Link>
                        <div className="mt-3" style={{ fontSize: '14px' }}><FormattedMessage id="login.text7" /> <Link to="/terms/details" className="text-body text-decoration-underline"><FormattedMessage id="login.text8" /></Link> </div>
                        <div className="my-5 text-center" style={{ fontSize: 'clamp(16px, 3vw, 18px)' }}><FormattedMessage id="login.text5" /> <Link to='/registro' className='text-black fw-bold'><FormattedMessage id="login.text6" /></Link></div>
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default Login;
