import React, { useEffect, useState, useRef } from "react";
import { Container, Alert } from 'react-bootstrap';
import { FormattedMessage } from "react-intl";
import { useT } from '../hooks/useT';

import login from '../assets/images/imagenes_de_fondo/loginImg.webp';
import logoB from '../assets/images/logos/logo_negro.png';
import { registerWithEmail, isAuthenticated  } from '../services/authService';
import { Link, useNavigate } from 'react-router-dom';
import { getTurnstileSiteKey, getTurnstileToken, resetTurnstileWidget, shouldRequireTurnstileToken } from '../utils/turnstile';

const TURNSTILE_SITE_KEY = getTurnstileSiteKey();

function Register() {

    const t = useT()

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        acceptTerms: false
    });

    const [alert, setAlert] = useState({
        show: false,
        variant: '',
        message: ''
    });

    const [loading, setLoading] = useState(false);
    const [emailChecking, setEmailChecking] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [turnstileReady, setTurnstileReady] = useState(false);
    const turnstileRef = useRef(null);
    const turnstileWidgetId = useRef(null);
    const fieldIds = {
        name: 'register-name',
        email: 'register-email',
        password: 'register-password',
        acceptTerms: 'register-accept-terms'
    };

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
            if (!TURNSTILE_SITE_KEY) return;
            turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
                sitekey: TURNSTILE_SITE_KEY,
                theme: 'light'
            });
        }
    }, [turnstileReady]);

    // Validar email en tiempo real mientras el usuario escribe
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleEmailBlur = async () => {
        const { email } = formData;
        
        if (!email) {
        setEmailError('');
        return;
        }

        if (!validateEmail(email)) {
        setEmailError(t('Por favor, ingresa un correo electrónico válido', 'Please, enter a valid email address'));
        return;
        }

        setEmailChecking(true);
        const result = await checkEmailExists(email);
        setEmailChecking(false);

        if (result.exists) {
        setEmailError(result.message || t('Este correo ya está registrado', 'This email is already registered'));
        } else {
        setEmailError('');
        }
    };

    // Referencia para la alerta
    const alertRef = useRef(null);

    // Efecto para hacer focus en la alerta y auto-cerrar
    useEffect(() => {
        if (alert.show && alertRef.current) {
            /* // Scroll suave hacia la alerta
            alertRef.current.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'center'
            }); */
        
            // Auto-cerrar después de 3 segundos
            const timer = setTimeout(() => {
                setAlert(prev => ({ ...prev, show: false }));
            }, 1500);
            
            // Limpiar timer si el componente se desmonta o la alerta cambia
            return () => clearTimeout(timer);
        }
    }, [alert.show]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
        }));

        // Limpiar error de email cuando el usuario empieza a escribir
        if (name === 'email') {
        setEmailError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
  
        // Validaciones básicas
        if (!formData.name || !formData.email || !formData.password) {
            setAlert({
            show: true,
            variant: 'danger',
            message: t('Todos los campos son obligatorios', 'All fields are required')
            });
            return;
        }

        if (!validateEmail(formData.email)) {
            setAlert({
            show: true,
            variant: 'danger',
            message: t('Por favor, ingresa un correo electrónico válido', 'Please, enter a valid email address')
            });
            return;
        }

        if (!formData.acceptTerms) {
            setAlert({
            show: true,
            variant: 'warning',
            message: t('Debes aceptar los términos y condiciones', 'You must accept the terms and conditions')
            });
            return;
        }

        if (formData.password.length <= 8) {
            setAlert({
            show: true,
            variant: 'danger',
            message: t('La contraseña debe tener al menos 8 caracteres', 'Password must be at least 8 characters long')
            });
            return;
        }

        // Validar Turnstile
        const turnstileToken = getTurnstileToken(turnstileWidgetId.current);
        
        if (!turnstileToken && shouldRequireTurnstileToken()) {
            setAlert({
            show: true,
            variant: 'warning',
            message: t('Por favor, completa la verificación de seguridad', 'Please complete the security verification')
            });
            return;
        }

        setLoading(true);
        
        const userData = {
            name: formData.name,
            email: formData.email,
            password: formData.password
        };

        const result = await registerWithEmail(userData, turnstileToken);
        
        if (result.success) {
            // Resetear Turnstile
            resetTurnstileWidget(turnstileWidgetId.current);

            setAlert({
            show: true,
            variant: 'success',
            message: result.message || t('¡Registro exitoso! Redirigiendo al login...', 'Registration successful! Redirecting to login...')
            });
            
            setFormData({
            name: '',
            email: '',
            password: '',
            acceptTerms: false
            });
            
            setTimeout(() => {
            navigate('/login');
            }, 2000);
        } else {
            // Resetear Turnstile en caso de error también
            resetTurnstileWidget(turnstileWidgetId.current);

            // Si el error es específicamente por email duplicado
            if (result.emailExists) {
            setAlert({
                show: true,
                variant: 'warning',
                message: t('Este correo ya está registrado.', 'This email is already registered.')
            });
            
            // Opcional: Mostrar un botón para ir al login
           /*  setTimeout(() => {
                if (window.confirm('Correo ya registrado. ¿Deseas ir a la página de login?')) {
                navigate('/login');
                }
            }, 1000); */
            } else {
            setAlert({
                show: true,
                variant: 'danger',
                message: result.error || t('Error en el registro. Intenta nuevamente.', 'Registration error. Please try again.')
            });
            }
        }
        
        setLoading(false);
    };

    useEffect(() => {
        // Verificar autenticación y obtener usuario
        const checkAuth = () => {
            const authStatus = isAuthenticated();
            //setIsAuth(authStatus);
            if(authStatus)
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
                <div className="col-lg-5 pt-4 px-3 px-lg-5">
                    <div className='text-center m-auto'>
                        <div className='fs-2'><FormattedMessage id="register.text1" /></div>
                        <div className='lh-sm mt-2'><FormattedMessage id="register.text2" /></div>

                        {/* Alerts de Bootstrap */}
                        {alert.show && (
                            <Alert variant={alert.variant} onClose={() => setAlert({...alert, show: false})} dismissible className="mt-3" style={{ fontSize: '16px' }}>
                                {alert.message}
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className='d-flex flex-column text-start gap-1 mt-5'>
                                <div className="form-group">
                                    <label htmlFor={fieldIds.name} className="form-label" style={{ fontSize: 'clamp(16px, 3vw, 18px)' }}><FormattedMessage id="register.text3" />*</label>
                                    <input type="text" name="name" id={fieldIds.name} className="form-control rounded-1" style={{ minHeight: '50px' }} value={formData.name} onChange={handleChange} disabled={loading} autoComplete="name" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor={fieldIds.email} className="form-label" style={{ fontSize: 'clamp(16px, 3vw, 18px)' }}><FormattedMessage id="register.text5" />*</label>
                                    <input type="text" name="email" id={fieldIds.email} className="form-control rounded-1" style={{ minHeight: '50px' }} value={formData.email} onChange={handleChange} disabled={loading} autoComplete="email" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor={fieldIds.password} className="form-label" style={{ fontSize: 'clamp(16px, 3vw, 18px)' }}><FormattedMessage id="register.text6" />*</label>
                                    <div className="position-relative">
                                        <input type={showPassword ? "text" : "password"} name="password" id={fieldIds.password} className="form-control rounded-1 pe-5" style={{ minHeight: '50px' }} value={formData.password} onChange={handleChange} disabled={loading} autoComplete="new-password" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t('Ocultar contraseña', 'Hide password') : t('Mostrar contraseña', 'Show password')} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 5, fontSize: '18px', border: 'none', background: 'transparent', padding: 0, color: '#6c757d' }}>
                                            <i className={`fa-regular fa-eye${showPassword ? '-slash' : ''}`}></i>
                                        </button>
                                    </div>
                                </div>
                                <div className="form-check text-muted mt-3" style={{ fontSize: '14px' }}>
                                    <input className="form-check-input" type="checkbox" id={fieldIds.acceptTerms} name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange} disabled={loading} />
                                    <label className="form-check-label" htmlFor={fieldIds.acceptTerms}>
                                        <FormattedMessage id="register.text7" />
                                    </label>
                                </div>
                                {/* Turnstile Widget */}
                                <div className="mt-3 d-flex justify-content-center">
                                    <div ref={turnstileRef}></div>
                                </div>
                                <button type="submit" className='py-2 rounded-1 mt-3 bg-black text-white' disabled={loading}><FormattedMessage id="register.text8" /></button>
                            </div>
                        </form>
                        <div className="mt-4 text-center" style={{ fontSize: 'clamp(16px, 3vw, 18px)' }}><FormattedMessage id="register.text9" /> <Link to='/login' className='text-black fw-bold'><FormattedMessage id="register.text10" /></Link></div>
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default Register;
