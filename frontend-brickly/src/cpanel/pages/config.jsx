import React, { useState, useEffect, useRef } from 'react';
import { Container, Alert, Spinner, Row, Col, Button, Modal, Form } from 'react-bootstrap';
import { API_URL, getCurrentUser, isAuthenticated, updateUserProfile, uploadAvatar, updatePassword, logout } from '../../services/authService'; 
import { useNavigate, useLocation } from 'react-router-dom';
import nPhoto from '../../assets/images/logos/notPhoto.png';
import Select from 'react-select';
import arrow from '../../assets/images/iconos/arrow.png'
import { uploadAgencyLogo, getLogoUrl } from '../../services/logoService';
import Cookies from 'js-cookie';
import { useT } from '../../hooks/useT';
import { getTurnstileSiteKey, resetTurnstileWidget } from '../../utils/turnstile';

const TURNSTILE_SITE_KEY = getTurnstileSiteKey();

function Confi() {
    const t = useT();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', shortDescription: '', description: '', specialization: '',

        expe: '', address: '', website: '', instagram: '',
        linkedin: '', tiktok: '',
        languages: [],
        signTitle: '',
        premios: '',
        categoria: [],
        proyectosDesarrollados: '',
        unidadesVendidas: ''
    });

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [alert, setAlert] = useState({ show: false, variant: '', message: '' });
    const [previewImage, setPreviewImage] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [selectedLogoFile, setSelectedLogoFile] = useState(null);
    const [logoUploading, setLogoUploading] = useState(false);

    // Turnstile - modo invisible
    const [turnstileReady, setTurnstileReady] = useState(false);
    const turnstileWidgetId = useRef(null);
    const turnstileContainerRef = useRef(null);

    // Inicializar Turnstile y crear widget invisible
    useEffect(() => {
        const initTurnstile = () => {
            if (!window.turnstile) {
                setTimeout(initTurnstile, 300);
                return;
            }
            setTurnstileReady(true);
            
            // Crear widget invisible
            if (turnstileContainerRef.current && !turnstileWidgetId.current) {
                if (!TURNSTILE_SITE_KEY) return;
                turnstileWidgetId.current = window.turnstile.render(turnstileContainerRef.current, {
                    sitekey: TURNSTILE_SITE_KEY,
                    callback: (token) => {
                        // Token obtenido
                    }
                });
                // Ejecutar challenge para obtener token inicial
                try {
                    window.turnstile.execute(turnstileContainerRef.current);
                } catch (e) {
                    console.warn('Error executing turnstile:', e);
                }
            }
        };
        
        initTurnstile();
    }, []);

    // Estado para el modal de cambio de contraseña

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    const [passwordError, setPasswordError] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const isAgentOrArch = (u) => {
        if (!u) return false;
        const roles = Array.isArray(u.roles) ? u.roles : [u.roles];
        return roles.includes('agente') || roles.includes('arquitecto') || roles.includes('agencia') || roles.includes('desarrolladora');
    };


    const isAgencia = (u) => {
        if (!u) return false;
        const roles = Array.isArray(u.roles) ? u.roles : [u.roles];
        return roles.includes('agencia');
    };

    const isArquitecto = (u) => {
        if (!u) return false;
        const roles = Array.isArray(u.roles) ? u.roles : [u.roles];
        return roles.includes('arquitecto');
    };

    const isDesarrolladora = (u) => {
        if (!u) return false;
        const roles = Array.isArray(u.roles) ? u.roles : [u.roles];
        return roles.includes('desarrolladora');
    };


    useEffect(() => {
        let cancelled = false;

        const loadProfile = async () => {
            try {
                const token = isAuthenticated();
                if (!token) {
                    navigate('/login');
                    return;
                }

                // Obtener datos completos desde sessionStorage (guardados por fetchUserProfile)
                let userData = null;
                const fullDataStr = sessionStorage.getItem('userFull');
                if (fullDataStr) {
                    try {
                        const fullData = JSON.parse(fullDataStr);
                        const cookieData = getCurrentUser();
                        userData = { ...(cookieData || {}), ...fullData };
                    } catch (e) {
                        userData = getCurrentUser();
                    }
                } else {
                    userData = getCurrentUser();
                }

                if (cancelled) return;

                if (!userData) {
                    setLoadError('No se pudieron cargar los datos del usuario.');
                    setInitialLoading(false);
                    return;
                }

                setUser(userData);

                setFormData({
                    name: userData.name || '',
                    email: userData.email || '',
                    phone: userData.phone || '',
                    shortDescription: userData.agentInfo?.shortDescription || '',
                    description: userData.agentInfo?.description || '',

                    specialization: userData.agentInfo?.specialization || '',
                    expe: userData.agentInfo?.expe || '',
                    address: userData.agentInfo?.address || '',
                    website: userData.agentInfo?.wesite || '',
                    instagram: userData.agentInfo?.instagram || '',
                    linkedin: userData.agentInfo?.linkedin || '',
                    tiktok: userData.agentInfo?.tiktok || '',
                    languages: (userData.agentInfo?.languages || []).map(l => ({ value: l, label: l })),
                    signTitle: userData.agentInfo?.signTitle || userData.agentInfo?.firmName || '',
                    premios: userData.agentInfo?.premios || '',
                    categoria: (userData.agentInfo?.categoria || []).map(c => ({ value: c, label: c })),
                    proyectosDesarrollados: userData.agentInfo?.proyectosDesarrollados || '',
                    unidadesVendidas: userData.agentInfo?.unidadesVendidas || ''
                });

                if (userData.avatar) {
                    const avatar = userData.avatar.replace('/uploads', '');
                    setPreviewImage(`${API_URL}${avatar}`);
                }

                // Cargar logo existente
                if (userData.agentInfo?.logo) {
                    setLogoPreview(getLogoUrl(userData.agentInfo.logo));
                }
            } catch (error) {
                setLoadError(error.message || 'Error al cargar los datos del perfil.');
            } finally {
                if (!cancelled) setInitialLoading(false);
            }
        };

        loadProfile();

        return () => { cancelled = true; };
    }, [navigate, location.state]);

    // Detectar redirección por perfil incompleto
    useEffect(() => {
        if (sessionStorage.getItem('showIncompleteAlert')) {
            setAlert({ show: true, variant: 'warning', message: 'Tu perfil está incompleto. Completa tus datos para continuar.' })
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            sessionStorage.removeItem('showIncompleteAlert')
        }
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const formatGTPhone = (val) => {
        const digits = val.replace(/\D/g, '').replace(/^502/, '');
        if (!digits) return '';
        const part1 = digits.slice(0, 4);
        const part2 = digits.slice(4, 8);
        return part2 ? `+502 ${part1}-${part2}` : `+502 ${part1}`;
    };

    const handlePhoneChange = (e) => {
        const formatted = formatGTPhone(e.target.value);
        setFormData(prev => ({ ...prev, phone: formatted }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const MAX_SIZE = 2 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            setAlert({ show: true, variant: 'warning', message: t('La imagen es muy grande. Máximo 2MB', 'Image is too large. Maximum 2MB') });
            e.target.value = '';
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            return;
        }

        if (previewImage?.startsWith('blob:')) URL.revokeObjectURL(previewImage);
        setPreviewImage(URL.createObjectURL(file));
        setSelectedFile(file);
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar que sea imagen
        if (!file.type.startsWith('image/')) {
            setAlert({ show: true, variant: 'warning', message: t('Solo se permiten imágenes', 'Only images are allowed') });
            e.target.value = '';
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            return;
        }

        // Validar tamaño máximo 2MB
        const MAX_SIZE = 2 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            setAlert({ show: true, variant: 'warning', message: t('La imagen es muy grande. Máximo 2MB', 'Image is too large. Maximum 2MB') });
            e.target.value = '';
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            return;
        }

        // Mostrar preview
        if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
        setLogoPreview(URL.createObjectURL(file));
        setSelectedLogoFile(file);
    };

    const getTurnstileToken = () => {
        return new Promise((resolve) => {
            if (!turnstileWidgetId.current || !window.turnstile) {
                resolve(null);
                return;
            }

            // Primero intentar obtener un token existente
            const existingToken = window.turnstile.getResponse(turnstileWidgetId.current);
            if (existingToken) {
                resolve(existingToken);
                return;
            }

            // Si no hay token, resetear y ejecutar el challenge
            try {
                // Resetear el widget primero para evitar el warning
                resetTurnstileWidget(turnstileWidgetId.current);
                
                // Configurar callback para cuando se obtenga el token
                window.turnstile.render(turnstileContainerRef.current, {
                    sitekey: TURNSTILE_SITE_KEY,
                    callback: (token) => {
                        resolve(token);
                    }
                });
                
                // Ejecutar el challenge
                window.turnstile.execute(turnstileContainerRef.current);
                
                // Timeout de seguridad después de 8 segundos
                setTimeout(() => {
                    const token = window.turnstile.getResponse(turnstileWidgetId.current);
                    resolve(token || null);
                }, 8000);
            } catch (e) {
                console.warn('Error executing turnstile:', e);
                resolve(null);
            }
        });
    };

    const resetTurnstile = () => {
        resetTurnstileWidget(turnstileWidgetId.current);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.name || !formData.email) {
            setAlert({ show: true, variant: 'danger', message: t('Nombre y correo son obligatorios', 'Name and email are required') });
            setLoading(false);
            return;
        }

        // Obtener token Turnstile para las subidas de archivos
        const turnstileToken = await getTurnstileToken();

        try {

            const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
            const payload = { name: formData.name, phone: formData.phone, roles };

            if (isAgentOrArch(user)) {
                // Hacer merge con agentInfo existente para no perder campos que no están en el formulario
                payload.agentInfo = {
                    ...(user?.agentInfo || {}),
                    description: formData.description,
                    specialization: formData.specialization,
                    expe: formData.expe !== '' && formData.expe !== undefined && formData.expe !== null ? parseInt(formData.expe) : undefined,
                    address: formData.address,
                    wesite: setearUrl(formData.website),
                    instagram: setearUrl(formData.instagram),
                    linkedin: setearUrl(formData.linkedin),
                    tiktok: setearUrl(formData.tiktok),
                    languages: formData.languages.map(l => l.value),
                    // Si se va a subir un logo nuevo, no enviar el logo en el payload del perfil
                    // para evitar que se sobrescriba con el valor antiguo. El logo se actualizará
                    // después en uploadAgencyLogo.
                    ...(selectedLogoFile ? {} : { logo: user?.agentInfo?.logo }),
                    // Conservar favoriteProject para que no se pierda al guardar el perfil
                    favoriteProject: user?.agentInfo?.favoriteProject || undefined
                };

                // Arquitecto: enviar signTitle, premios, categoria, shortDescription e idiomas
                if (isArquitecto(user)) {
                    payload.agentInfo.signTitle = formData.signTitle;
                    payload.agentInfo.premios = formData.premios;
                    payload.agentInfo.categoria = formData.categoria.map(c => c.value);
                    payload.agentInfo.shortDescription = formData.shortDescription;
                    delete payload.agentInfo.specialization;
                }

                // Agencia no tiene especialización ni idiomas
                if (isAgencia(user)) {
                    delete payload.agentInfo.specialization;
                    delete payload.agentInfo.languages;
                }

                // Desarrolladora: enviar proyectosDesarrollados y unidadesVendidas
                if (isDesarrolladora(user)) {
                    payload.agentInfo.proyectosDesarrollados = formData.proyectosDesarrollados !== '' && formData.proyectosDesarrollados !== undefined ? parseInt(formData.proyectosDesarrollados) : undefined;
                    payload.agentInfo.unidadesVendidas = formData.unidadesVendidas !== '' && formData.unidadesVendidas !== undefined ? parseInt(formData.unidadesVendidas) : undefined;
                    delete payload.agentInfo.specialization;
                    delete payload.agentInfo.languages;
                }

            }


            // Subir logo de agencia PRIMERO si se seleccionó uno nuevo
            // Esto asegura que el logo se guarde en el servidor antes de actualizar el perfil
            let logoWasUploaded = false;
            let logoResult = null;
            if (selectedLogoFile) {
                setLogoUploading(true);
                logoResult = await uploadAgencyLogo(selectedLogoFile, turnstileToken);
                setLogoUploading(false);
                if (!logoResult.success) throw new Error(logoResult.error);
                setSelectedLogoFile(null);
                logoWasUploaded = true;
                
                // Si el logo se subió correctamente, actualizar el payload con la nueva ruta
                // para que se guarde junto con el perfil en una sola llamada
                if (payload.agentInfo) {
                    payload.agentInfo.logo = logoResult.url;
                }
            }

            const profileResult = await updateUserProfile(payload);
            if (!profileResult.success) throw new Error(profileResult.error);

            // Restaurar el logo en la cookie si se subió uno nuevo, porque
            // updateUserProfile -> fetchUserProfile() sobrescribe la cookie
            // con los datos del servidor, y el servidor puede no tener el campo logo
            if (logoWasUploaded && logoResult?.url) {
                const currentUser = getCurrentUser();
                if (currentUser) {
                    if (!currentUser.agentInfo) currentUser.agentInfo = {};
                    currentUser.agentInfo.logo = logoResult.url;
                    const timestamp = Date.now();
                    currentUser.agentInfo.logoUpdatedAt = timestamp;
                    Cookies.set('user', JSON.stringify(currentUser));
                    try {
                        localStorage.setItem('logoUpdatedAt', String(timestamp));
                    } catch (_) {}
                }
            }

            if (selectedFile) {
                const avatarResult = await uploadAvatar(selectedFile, turnstileToken);
                if (!avatarResult.success) throw new Error(avatarResult.error);
            }

            setAlert({ show: true, variant: 'success', message: t('Perfil actualizado exitosamente', 'Profile updated successfully') });

            const updatedUser = getCurrentUser();
            setUser(updatedUser);
            setSelectedFile(null);

            // Refrescar preview del logo si se subió uno nuevo
            if (logoWasUploaded && logoResult?.url) {
                setLogoPreview(getLogoUrl(logoResult.url));
            }

            // Forzar actualización del menú lateral para que muestre/oculte opciones según perfil completo
            window.dispatchEvent(new CustomEvent('userUpdated'));


            // Sincronizar formData con los valores normalizados guardados
            setFormData(prev => ({
                ...prev,
                instagram: setearUrl(prev.instagram),
                linkedin:  setearUrl(prev.linkedin),
                tiktok:    setearUrl(prev.tiktok),
                website:   setearUrl(prev.website),
            }));
        } catch (error) {
            setAlert({ show: true, variant: 'danger', message: error.message || t('Error al guardar los cambios', 'Error saving changes') });
        }

        setLoading(false);
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
    };

    useEffect(() => () => {
        if (previewImage?.startsWith('blob:')) URL.revokeObjectURL(previewImage);
    }, [previewImage]);

    const idiomasOpciones = [
        { value: 'español', label: 'Español' },
        { value: 'inglés', label: 'Inglés' },
        { value: 'alemán', label: 'Alemán' },
        { value: 'francés', label: 'Francés' },
        { value: 'portugués', label: 'Portugués' },
        { value: 'coreano', label: 'Coreano' },
    ];

    const especializacionOpciones = [
        { value: 'viviendas ', label: 'Viviendas ' },
        { value: 'condominios ', label: 'Condominios ' },
        { value: 'apartamentos en torres', label: 'Apartamentos en torres' },
        { value: 'edificios de oficinas', label: 'Edificios de oficinas' },
        { value: 'propiedades comerciales', label: 'Propiedades comerciales' },
        { value: 'terrenos y lote', label: 'Terrenos y lote' },
        { value: 'viviendas vacacionale', label: 'Viviendas vacacionale' },
        { value: 'naves industriales y bodega', label: 'Naves industriales y bodega' },
        { value: 'propiedades en prevent', label: 'Propiedades en prevent' },
        { value: 'fincas agrícolas o ganaderas', label: 'Fincas agrícolas o ganaderas' },
    ];

    const categoriaOpciones = [
        { value: 'Clásico', label: 'Clásico' },
        { value: 'Gótico', label: 'Gótico' },
        { value: 'Barroco', label: 'Barroco' },
        { value: 'Neoclásico', label: 'Neoclásico' },
        { value: 'Moderno', label: 'Moderno' },
        { value: 'Contemporáneo', label: 'Contemporáneo' },
        { value: 'Brutalista', label: 'Brutalista' },
        { value: 'Minimalista', label: 'Minimalista' },
        { value: 'Paramétrico', label: 'Paramétrico' },
        { value: 'Vernáculo', label: 'Vernáculo' },
    ];

    // Verificar si el perfil está completo basado en formData (valores actuales del formulario)
    const isPerfilCompleto = () => {
        if (!user) return false;
        if (!formData.name || !formData.email) return false;
        if (isAgentOrArch(user)) {
            const baseOk = !!(formData.name && formData.description && formData.address && previewImage);
            if (!baseOk) return false;
            if (isAgencia(user)) {
                return !!formData.expe && !!logoPreview;
            }
            if (isArquitecto(user)) {
                return !!(
                    formData.signTitle &&
                    formData.shortDescription &&
                    formData.expe &&
                    Array.isArray(formData.categoria) &&
                    formData.categoria.length > 0 &&
                    logoPreview
                );
            }

            if (isDesarrolladora(user)) {
                return !!(
                    formData.expe &&
                    formData.proyectosDesarrollados &&
                    formData.unidadesVendidas &&
                    logoPreview
                );
            }

            return !!(
                formData.specialization &&
                formData.expe &&
                Array.isArray(formData.languages) &&
                formData.languages.length > 0
            );

        }
        return !!(formData.name);
    };





    const setearUrl = (url) => {
        url = url.trim();
        if (!url) return '';
        // Si no tiene protocolo, agregar https://
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        let [protocol, resto] = url.split('://');
        let [host, ...pathParts] = resto.split('/');
        let path = pathParts.length ? '/' + pathParts.join('/') : '';
        if (!host.startsWith('www.') && !/^\d+\.\d+\.\d+\.\d+$/.test(host) && host !== 'localhost') {
            host = 'www.' + host;
        }
        return `${protocol}://${host}${path}`;
    };

    // ===== LÓGICA DE CAMBIO DE CONTRASEÑA =====
    const isNotAdmin = user && !user?.roles?.includes('admin');

    const validatePassword = (pass) => {
        // Mínimo 8 caracteres, alfanumérico
        if (pass.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
        if (!/[a-zA-Z]/.test(pass)) return 'La contraseña debe contener al menos una letra';
        if (!/[0-9]/.test(pass)) return 'La contraseña debe contener al menos un número';
        return '';
    };

    const handlePasswordInputChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        setPasswordError('');
    };

    const handlePasswordSubmit = async () => {
        setPasswordError('');

        // Validar campos vacíos
        if (!passwordData.newPassword || !passwordData.confirmPassword) {
            setPasswordError('Ambos campos son obligatorios');
            return;
        }

        // Validar que coincidan
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('Las contraseñas no coinciden');
            return;
        }

        // Validar requisitos
        const validationError = validatePassword(passwordData.newPassword);
        if (validationError) {
            setPasswordError(validationError);
            return;
        }

        setPasswordLoading(true);
        const result = await updatePassword(passwordData.newPassword);
        setPasswordLoading(false);

        if (result.success) {
            setPasswordSuccess(true);
            setTimeout(() => {
                logout();
                navigate('/', { replace: true });
            }, 1500);
        } else {
            setPasswordError(result.error || 'Error al cambiar la contraseña');
        }
    };

    const handleClosePasswordModal = () => {
        setShowPasswordModal(false);
        setPasswordData({ newPassword: '', confirmPassword: '' });
        setPasswordError('');
    };

    return (
        <Container>
            {/* Widget Turnstile oculto para verificar las subidas de archivos ante Cloudflare */}
            <div ref={turnstileContainerRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0 }}></div>
            <div className='mt-2'>
                {alert.show && (
                    <Alert variant={alert.variant} onClose={() => setAlert({...alert, show: false})} dismissible className="position-fixed bottom-0 end-0 m-3 shadow-sm" style={{ zIndex: '999' }}>
                        <div className="d-flex align-items-center gap-2">
                            <i className={`fa-solid ${alert.variant === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                            <span>{alert.message}</span>
                        </div>

                    </Alert>
                )}

                {initialLoading && (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="dark" />
                        <p className="mt-3 text-muted">Cargando perfil...</p>
                    </div>
                )}

                {loadError && !initialLoading && (
                    <div className="text-center py-5">
                        <i className="fa-solid fa-circle-exclamation text-danger fa-3x mb-3"></i>
                        <p className="text-danger">{loadError}</p>
                        <button className="btn btn-dark rounded-1 mt-2" onClick={() => window.location.reload()}>
                            Reintentar
                        </button>
                    </div>
                )}

                {!initialLoading && !loadError && (
                <>
                <div style={{ fontSize: 'clamp(24px, 3vw, 40px)' }}>Mi perfil</div>
                {!isPerfilCompleto() && (
                    <div className="text-danger mt-1 mb-2">
                        Perfil incompleto. Complete su perfil para acceder a todas las funciones.
                    </div>
                )}
                {isAgentOrArch(user) ?
                    <form onSubmit={handleSubmit}>
                        <Row>
                            <Col md={4}>
                                <div className="position-relative rounded-2 overflow-hidden" style={{ backgroundColor: '#E1E1E1', aspectRatio: '4 / 3', cursor: 'pointer' }}>
                                    {previewImage ?
                                        <>
                                            <img src={previewImage} alt="image" className='w-100 h-100 object-fit-cover' />
                                            <span className="position-absolute" style={{ top: '6px', right: '10px', color: 'red', fontSize: '22px', fontWeight: 'bold', textShadow: '0 0 3px white' }}>*</span>
                                        </>
                                        :
                                        <div className="position-absolute top-50 w-100 start-50 translate-middle text-center">
                                            <div><i className="fa-solid fa-cloud-arrow-up fs-1"></i></div>
                                            <div>Haga clic para subir una foto</div>
                                        </div>
                                    }
                                    <input type="file" accept='image/*' onChange={handleImageChange} className='position-absolute top-0 start-0 w-100 h-100 opacity-0' style={{ cursor: 'pointer' }} disabled={loading} />
                                </div>

                                <div className='border rounded-2 p-3 mt-4 form-config'>
                                    <div className='mb-2'>Contacta tu agente</div>
                                    <div className="d-flex flex-column gap-2">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className='d-flex align-items-baseline gap-1' style={{ width: '101.64px' }}>
                                                <i className="fa-brands fa-whatsapp"></i> WhatsApp: <span className="text-danger">*</span>
                                            </div>
                                            <div className="flex-grow-1">
                                                <input type="tel" name="phone" value={formData.phone} onChange={handlePhoneChange} className='form-control py-0 px-1 noRounded' placeholder="+502" disabled={loading} />
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className='d-flex align-items-baseline gap-1' style={{ width: '101.64px' }}>
                                                <i className="fa-solid fa-envelope"></i> Correo: <span className="text-danger">*</span>
                                            </div>
                                            <div className="flex-grow-1">
                                                <input type="email" name="email" value={formData.email} className='form-control py-0 px-1 noRounded bg-light' readOnly disabled />
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className='d-flex align-items-baseline gap-1' style={{ width: '101.64px' }}>
                                                <i className="fa-solid fa-location-dot"></i> Dirección: <span className="text-danger">*</span>
                                            </div>
                                            <div className="flex-grow-1">
                                                <input type="text" name="address" value={formData.address} onChange={handleChange} className='form-control py-0 px-1 noRounded' />
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className='d-flex align-items-baseline gap-1' style={{ width: '101.64px' }}>
                                                <i className="fa-solid fa-globe"></i>
                                                Web: <span className="text-danger">*</span>
                                            </div>
                                            <div className="flex-grow-1">
                                                <input type="text" name='website' value={formData.website} onChange={handleChange} className='form-control py-0 px-1 noRounded' />
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className='d-flex align-items-baseline gap-1' style={{ width: '101.64px' }}>
                                                <i className="fa-brands fa-instagram"></i> Instagram:
                                            </div>
                                            <div className="flex-grow-1">
                                                <input type="tel" name="instagram" value={formData.instagram} onChange={handleChange} className='form-control py-0 px-1 noRounded' disabled={loading} />
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className='d-flex align-items-baseline gap-1' style={{ width: '101.64px' }}>
                                                <i className="fa-brands fa-linkedin"></i> Linkedin:
                                            </div>
                                            <div className="flex-grow-1">
                                                <input type="tel" name="linkedin" value={formData.linkedin} onChange={handleChange} className='form-control py-0 px-1 noRounded' disabled={loading} />
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className='d-flex align-items-baseline gap-1' style={{ width: '101.64px' }}>
                                                <i className="fa-brands fa-tiktok"></i> Tiktok:
                                            </div>
                                            <div className="flex-grow-1">
                                                <input type="tel" name="tiktok" value={formData.tiktok} onChange={handleChange} className='form-control py-0 px-1 noRounded' disabled={loading} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                            <Col md={8} className='mt-5 mt-md-0'>
                                <Row className='g-3 align-items-end'>
                                    <Col md={6}>
                                        <div className="d-flex align-items-start gap-3">
                                            {/* Logo circular de la agencia o firma de arquitecto */}
                                            {(isAgencia(user) || isArquitecto(user) || isDesarrolladora(user)) && (

                                                <div className="position-relative flex-shrink-0" style={{ width: '70px', height: '70px', cursor: 'pointer' }}>
                                                    <div
                                                        className="rounded-circle overflow-hidden border d-flex align-items-center justify-content-center"
                                                        style={{ width: '70px', height: '70px', backgroundColor: '#f0f0f0' }}
                                                        title={t('Haz clic para subir el logo de tu firma', 'Click to upload your firm logo')}
                                                    >
                                                        {logoPreview ? (
                                                            <img src={logoPreview} alt="Logo" className="w-100 h-100 object-fit-cover" />
                                                        ) : (
                                                            <i className="fa-solid fa-building" style={{ fontSize: '24px', color: '#999' }}></i>
                                                        )}
                                                        <span className="position-absolute" style={{ top: '2px', right: '-4px', color: 'red', fontSize: '16px', fontWeight: 'bold', textShadow: '0 0 3px white' }}>*</span>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleLogoChange}
                                                        className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
                                                        style={{ cursor: 'pointer' }}
                                                        disabled={loading || logoUploading}
                                                    />
                                                    {logoUploading && (
                                                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75 rounded-circle">
                                                            <Spinner animation="border" size="sm" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="d-flex flex-column flex-grow-1 gap-1">
                                                {isArquitecto(user) && (
                                                    <div className="form-group">
                                                        <label className="form-label">Nombre de la firma / estudio <span className="text-danger">*</span></label>
                                                        <input type="text" name="signTitle" value={formData.signTitle} onChange={handleChange} className="form-control noRounded" placeholder="Ej: MONZÓN + ASOCIADOS" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Col>
                                    <Col sm={12}>
                                        <div className="form-group">
                                            <label className="form-label">
                                                {isAgencia(user) ? 'Nombre de la agencia' : 'Nombre y apellido'} <span className="text-danger">*</span>
                                            </label>
                                            <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-control noRounded" disabled={loading} />
                                        </div>
                                    </Col>
                                    {isArquitecto(user) && (
                                    <Col sm={12}>
                                        <div className="form-group">
                                            <label htmlFor="" className="form-label d-flex justify-content-between">
                                                <span>Descripción corta <span className="text-danger">*</span></span>
                                                <span className={`small ${formData.shortDescription.length > 45 ? 'text-danger' : 'text-muted'}`}>
                                                    {formData.shortDescription.length}/50
                                                </span>
                                            </label>
                                            <input type="text" name="shortDescription" value={formData.shortDescription} onChange={handleChange} className="form-control noRounded" maxLength={50} placeholder="Breve descripción del arquitecto" />
                                        </div>
                                    </Col>
                                    )}
                                    <Col sm={12}>
                                        <div className="form-group">
                                            <label htmlFor="" className="form-label d-flex justify-content-between">
                                                <span>Breve biografía / descripción <span className="text-danger">*</span></span>
                                                <span className={`small ${formData.description.length > 480 ? 'text-danger' : 'text-muted'}`}>
                                                    {formData.description.length}/500
                                                </span>
                                            </label>
                                            <textarea name="description" value={formData.description} onChange={handleChange} id="" className="form-control noRounded" style={{ minHeight: '140px' }} maxLength={500}></textarea>
                                        </div>
                                    </Col>

                                    {!isAgencia(user) && !isArquitecto(user) && !isDesarrolladora(user) && (
                                    <Col md={5}>
                                        <div className="form-group">
                                            <label htmlFor="" className="form-label">Agente especializado en <span className="text-danger">*</span></label>
                                            <select name="specialization" value={formData.specialization} onChange={handleChange} id="" className="form-select noRounded">
                                                <option value="">Seleccione...</option>
                                                {especializacionOpciones.map(o => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </Col>
                                    )}
                                    {isArquitecto(user) && (
                                        <Col md={5}>
                                            <div className="form-group">
                                                <label htmlFor="" className="form-label">Premios recibidos</label>
                                                <input type="number" name="premios" value={formData.premios} onChange={handleChange} className="form-control noRounded" placeholder="Ej: 15" min="0" />
                                            </div>
                                        </Col>
                                    )}

                                    {isDesarrolladora(user) && (
                                        <>
                                        <Col md={6}>
                                            <div className="form-group">
                                                <label htmlFor="" className="form-label">Proyectos desarrollados <span className="text-danger">*</span></label>
                                                <input type="number" name="proyectosDesarrollados" value={formData.proyectosDesarrollados} onChange={handleChange} className="form-control noRounded" placeholder="Ej: 50" min="0" />
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="form-group">
                                                <label htmlFor="" className="form-label">Unidades vendidas <span className="text-danger">*</span></label>
                                                <input type="number" name="unidadesVendidas" value={formData.unidadesVendidas} onChange={handleChange} className="form-control noRounded" placeholder="Ej: 200" min="0" />
                                            </div>
                                        </Col>
                                        </>
                                    )}

                                    <Col md={4}>

                                        <div className="form-group">
                                            <label htmlFor="" className="form-label">Años de experiencia <span className="text-danger">*</span></label>
                                            <div className="input-group">
                                                <input type="number" name="expe" value={formData.expe} onChange={handleChange} className="form-control noRounded" min="0" />
                                                <span className="input-group-text">Años</span>
                                            </div>
                                        </div>
                                    </Col>
                                    {!isAgencia(user) && !isDesarrolladora(user) && (
                                    <Col md={8}>
                                        <label htmlFor="" className="form-label">Experiencia en idiomas <span className="text-danger">*</span></label>
                                        <Select
                                            isMulti
                                            name="languages"
                                            options={idiomasOpciones}
                                            value={formData.languages}
                                            onChange={(selected) => setFormData(prev => ({ ...prev, languages: selected || [] }))}
                                            className="basic-multi-select"
                                            classNamePrefix="select"
                                            placeholder="Seleccione..."
                                        />
                                    </Col>
                                    )}
                                    {isArquitecto(user) && (
                                    <Col md={8}>
                                        <label htmlFor="" className="form-label">Estilos arquitectónicos <span className="text-danger">*</span></label>
                                        <Select
                                            isMulti
                                            name="categoria"
                                            options={categoriaOpciones}
                                            value={formData.categoria}
                                            onChange={(selected) => {
                                                if (selected && selected.length > 5) return;
                                                setFormData(prev => ({ ...prev, categoria: selected || [] }));
                                            }}
                                            className="basic-multi-select"
                                            classNamePrefix="select"
                                            placeholder="Seleccione... (máx. 5)"
                                        />
                                        <small className="text-muted">{formData.categoria.length}/5 seleccionadas</small>
                                    </Col>
                                    )}

                                    <Col sm={12} className='mt-5'>
                                        <Button type='submit' className='bg-dark border-0 px-4' disabled={ loading }>
                                            {loading ? (
                                                <>
                                                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                                                    {t('Guardando...', 'Saving...')}
                                                </>
                                            ) : t('Guardar cambios', 'Save changes')}
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                    </form>  
                    :
                    <div className="d-flex gap-4 flex-column flex-md-row align-items-start" style={{ width: 'min(600px, 100%)', margin: 'clamp(4rem, 5vw, 8rem) 0 clamp(4rem, 10vw, 16rem)' }}>
                    
                        <div className="position-relative mx-auto">
                            <img src={previewImage || nPhoto} alt="Foto" style={{ width: '180px', height: '180px' }} className='object-fit-cover rounded-circle' />
                            <input type="file" accept='image/*' onChange={handleImageChange} className='position-absolute top-0 start-0 w-100 h-100 opacity-0' style={{ cursor: 'pointer' }} disabled={loading} />
                        </div>

                        <form onSubmit={handleSubmit} className='d-flex flex-column gap-3 w-100'>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className='form-control' placeholder={t('Nombre', 'Name')} disabled={loading} required />
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className='form-control bg-light' placeholder={t('Correo', 'Email')} disabled readOnly />
                            <input type="text" name="phone" value={formData.phone} onChange={handlePhoneChange} className='form-control' placeholder="+502 5555-1234" disabled={loading} />

                            <div className="d-flex gap-2 justify-content-md-end">
                                <button
                                    type="button"
                                    className='btn btn-dark rounded-4'
                                    style={{ fontSize: '16px', width: 'fit-content' }}
                                    onClick={() => setShowPasswordModal(true)}
                                >
                                    <i className="fa-solid fa-key me-1"></i>
                                    Cambiar contraseña
                                </button>
                            </div>
                            
                            <div className="d-flex gap-2 justify-content-md-end mt-3">
                                <button className='btn btn-dark rounded-4' style={{ fontSize: '16px', width: 'fit-content' }} type="submit" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Spinner as="span" animation="border" size="sm" className="me-2" />
                                            {t('Guardando...', 'Saving...')}
                                        </>
                                    ) : t('Guardar cambios', 'Save changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                }
                </>
                )}
            </div>

            {/* Botón flotante "Cambiar Contraseña" - solo para agentes/arquitectos (no admins) */}
            {isNotAdmin && (
                <div
                    onClick={() => setShowPasswordModal(true)}
                    className="position-fixed d-flex align-items-center gap-2 shadow rounded-3 bg-dark text-white px-3 py-2"
                    style={{
                        bottom: '20px',
                        right: '20px',
                        zIndex: 3,
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    <i className="fa-solid fa-key"></i>
                    <span className="d-none d-sm-inline">Cambiar Contraseña</span>
                </div>
            )}

            {/* Modal de cambio de contraseña */}
            <Modal show={showPasswordModal} onHide={handleClosePasswordModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Cambiar Contraseña</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {passwordSuccess ? (
                        <div className="text-center py-3">
                            <i className="fa-solid fa-circle-check text-success" style={{ fontSize: '3rem' }}></i>
                            <p className="mt-3 mb-0 fs-5">¡Contraseña cambiada con éxito!</p>
                            <p className="text-muted small mt-1">Serás redirigido al inicio de sesión...</p>
                        </div>
                    ) : (
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Nueva contraseña</Form.Label>
                                <div className="position-relative">
                                    <Form.Control
                                        type={showNewPassword ? "text" : "password"}
                                        name="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordInputChange}
                                        placeholder="Mín. 8 caracteres, alfanumérico"
                                        isInvalid={!!passwordError}
                                        className="pe-5"
                                    />
                                    <span onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 5, fontSize: '18px' }}>
                                        <i className={`fa-regular fa-eye${showNewPassword ? '-slash' : ''}`}></i>
                                    </span>
                                </div>
                                <Form.Text className="text-muted">
                                    Debe tener al menos 8 caracteres, contener letras y números.
                                </Form.Text>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Repetir contraseña</Form.Label>
                                <div className="position-relative">
                                    <Form.Control
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordInputChange}
                                        placeholder="Repite la nueva contraseña"
                                        isInvalid={!!passwordError}
                                        className="pe-5"
                                    />
                                    <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 5, fontSize: '18px' }}>
                                        <i className={`fa-regular fa-eye${showConfirmPassword ? '-slash' : ''}`}></i>
                                    </span>
                                </div>
                            </Form.Group>
                            {passwordError && (
                                <div className="text-danger small mb-2">
                                    <i className="fa-solid fa-circle-exclamation me-1"></i>
                                    {passwordError}
                                </div>
                            )}
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    {!passwordSuccess && (
                        <>
                            <Button variant="secondary" className={` ${!isArquitecto(user) && !isAgencia(user) ? 'rounded-4' : ''} `} onClick={handleClosePasswordModal} disabled={passwordLoading}>
                                Cancelar
                            </Button>
                            <Button variant="dark" className={` ${!isArquitecto(user) && !isAgencia(user) ? 'rounded-4' : ''} `} onClick={handlePasswordSubmit} disabled={passwordLoading}>
                                {passwordLoading ? (
                                    <>
                                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                                        Cambiando...
                                    </>
                                ) : 'Cambiar contraseña'}
                            </Button>
                        </>
                    )}
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default Confi;
