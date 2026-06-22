import React, { useState, useEffect } from 'react';
import { Container, Spinner, Modal, Button } from 'react-bootstrap';
import { API_URL, getCurrentUser, isAuthenticated, updateUserProfile, uploadAvatar, updatePassword, logout } from '../services/authService'; 
import { useNavigate } from 'react-router-dom';
import nPhoto from '../assets/images/logos/notPhoto.png';
import { useT } from '../hooks/useT';

function Profile() {
    const t = useT();
    const navigate = useNavigate();
    const fieldIds = {
        avatar: 'profile-avatar-upload',
        name: 'profile-name',
        email: 'profile-email',
        phone: 'profile-phone',
        newPassword: 'profile-new-password',
        confirmPassword: 'profile-confirm-password',
    };
    
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, variant: '', message: '' });
    const [previewImage, setPreviewImage] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    // Estado para cambio de contraseña
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    const [passwordError, setPasswordError] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        const token = isAuthenticated()
        if (!token) return navigate('/login');

        const userData = getCurrentUser();
        if (!userData) return;

        setUser(userData);
        setFormData({
            name: userData.name || '',
            email: userData.email || '',
            phone: userData.phone || ''
        });

        if (userData.avatar) {
            const avatar = userData.avatar.replace('/uploads', '');
            setPreviewImage(`${API_URL}${avatar}`);
        }
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

        // Validar peso máximo 2MB (2 * 1024 * 1024 bytes)
        const MAX_SIZE = 2 * 1024 * 1024; // 2MB en bytes
        
        if (file.size > MAX_SIZE) {
            setAlert({
                show: true,
                variant: 'warning',
                message: t('La imagen es muy grande. Máximo 2MB', 'Image is too large. Maximum 2MB')
            });
            
            // Limpiar el input file
            e.target.value = '';
            
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            /* setLoading(true) */
            return;
        }

        // Limpiar preview anterior
        if (previewImage?.startsWith('blob:')) URL.revokeObjectURL(previewImage);
        
        setPreviewImage(URL.createObjectURL(file));
        setSelectedFile(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.email) {
            setAlert({ show: true, variant: 'danger', message: t('Nombre y correo son obligatorios', 'Name and email are required') });
            setLoading(false);
            return;
        }

        try {
            const profileResult = await updateUserProfile({ name: formData.name, phone: formData.phone });
            if (!profileResult.success) throw new Error(profileResult.error);

            if (selectedFile) {
                const avatarResult = await uploadAvatar(selectedFile);
                if (!avatarResult.success) throw new Error(avatarResult.error);
            }

            setAlert({ show: true, variant: 'success', message: t('Perfil actualizado exitosamente', 'Profile updated successfully') });
            
            // Actualizar estado
            const updatedUser = getCurrentUser(); // Recargar datos actualizados
            setUser(updatedUser);
            setFormData({ name: updatedUser.name, email: updatedUser.email, phone: updatedUser.phone });
            setSelectedFile(null);

        } catch (error) {
            setAlert({ show: true, variant: 'danger', message: error.message || t('Error al guardar los cambios', 'Error saving changes') });
        }
        
        setLoading(false);
        setTimeout(() => setAlert({ ...alert, show: false }), 3000);
    };

    // Cleanup de blob URLs
    useEffect(() => () => {
        if (previewImage?.startsWith('blob:')) URL.revokeObjectURL(previewImage);
    }, [previewImage]);

    // ===== LÓGICA DE CAMBIO DE CONTRASEÑA =====
    const handlePasswordInputChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        setPasswordError('');
    };

    const validatePassword = (pass) => {
        if (pass.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
        if (!/[a-zA-Z]/.test(pass)) return 'La contraseña debe contener al menos una letra';
        if (!/[0-9]/.test(pass)) return 'La contraseña debe contener al menos un número';
        return '';
    };

    const handlePasswordSubmit = async () => {
        setPasswordError('');

        if (!passwordData.newPassword || !passwordData.confirmPassword) {
            setPasswordError('Ambos campos son obligatorios');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('Las contraseñas no coinciden');
            return;
        }

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

    // Icono y color según variante
    const toastIcon = {
        success: { icon: 'fa-circle-check', color: '#4caf50' },
        danger:  { icon: 'fa-circle-xmark', color: '#f44336' },
        warning: { icon: 'fa-triangle-exclamation', color: '#ff9800' },
    };

    return (
        <Container>
            {alert.show && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        backgroundColor: '#1a1a1a',
                        color: 'white',
                        padding: '14px 22px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        fontSize: '15px',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        maxWidth: '320px',
                    }}
                >
                    <i
                        className={`fa-regular ${toastIcon[alert.variant]?.icon ?? 'fa-circle-info'}`}
                        style={{ color: toastIcon[alert.variant]?.color ?? 'white', fontSize: '18px', flexShrink: 0 }}
                    ></i>
                    {alert.message}
                </div>
            )}
            
            <div className="d-flex gap-4 flex-column flex-md-row align-items-start" style={{ width: 'min(600px, 100%)', margin: 'clamp(4rem, 5vw, 8rem) 0 clamp(4rem, 10vw, 16rem)' }}>
                
                <div className="position-relative mx-auto">
                    <img src={previewImage || nPhoto} alt="Foto" style={{ width: '180px', height: '180px' }} className='object-fit-cover rounded-circle' />
                    <input id={fieldIds.avatar} type="file" accept='image/*' onChange={handleImageChange} className='position-absolute top-0 start-0 w-100 h-100 opacity-0' style={{ cursor: 'pointer' }} disabled={loading} aria-label={t('Cambiar foto de perfil', 'Change profile photo')} />
                </div>

                <form onSubmit={handleSubmit} className='d-flex flex-column gap-3 w-100'>
                    <label htmlFor={fieldIds.name} className="visually-hidden">{t('Nombre', 'Name')}</label>
                    <input id={fieldIds.name} type="text" name="name" value={formData.name} onChange={handleChange} className='form-control' placeholder={t('Nombre', 'Name')} disabled={loading} required />
                    <label htmlFor={fieldIds.email} className="visually-hidden">{t('Correo', 'Email')}</label>
                    <input id={fieldIds.email} type="email" name="email" value={formData.email} onChange={handleChange} className='form-control bg-light' placeholder={t('Correo', 'Email')} disabled readOnly />
                    <label htmlFor={fieldIds.phone} className="visually-hidden">{t('Teléfono', 'Phone')}</label>
                    <input id={fieldIds.phone} type="text" name="phone" value={formData.phone} onChange={handlePhoneChange} className='form-control' placeholder="+502 5555-1234" disabled={loading} />

                    <div className="d-flex gap-2 justify-content-md-end">
                        <button
                            type="button"
                            className='btn btn-dark'
                            style={{ fontSize: '16px', width: 'fit-content' }}
                            onClick={() => setShowPasswordModal(true)}
                        >
                            <i className="fa-solid fa-key me-1"></i>
                            Cambiar contraseña
                        </button>
                    </div>

                    <div className="d-flex gap-2 justify-content-md-end mt-3">
                        <button className='btn btn-dark' style={{ fontSize: '16px', width: 'fit-content' }} type="submit" disabled={loading}>
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

            {/* Modal de cambio de contraseña */}
            <Modal show={showPasswordModal} onHide={() => { setShowPasswordModal(false); setPasswordSuccess(false); setPasswordError(''); setPasswordData({ newPassword: '', confirmPassword: '' }); }} centered>
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
                        <>
                            <div className="mb-3">
                                <label className="form-label">Nueva contraseña</label>
                                <div className="position-relative">
                                    <input
                                        id={fieldIds.newPassword}
                                        type={showNewPassword ? "text" : "password"}
                                        name="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordInputChange}
                                        className={`form-control pe-5 ${passwordError ? 'is-invalid' : ''}`}
                                        placeholder="Mín. 8 caracteres, alfanumérico"
                                    />
                                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} aria-label={showNewPassword ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 5, fontSize: '18px', border: 'none', background: 'transparent', padding: 0 }}>
                                        <i className={`fa-regular fa-eye${showNewPassword ? '-slash' : ''}`}></i>
                                    </button>
                                </div>
                                <div className="text-muted small mt-1">
                                    Debe tener al menos 8 caracteres, contener letras y números.
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Repetir contraseña</label>
                                <div className="position-relative">
                                    <input
                                        id={fieldIds.confirmPassword}
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordInputChange}
                                        className={`form-control pe-5 ${passwordError ? 'is-invalid' : ''}`}
                                        placeholder="Repite la nueva contraseña"
                                    />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 5, fontSize: '18px', border: 'none', background: 'transparent', padding: 0 }}>
                                        <i className={`fa-regular fa-eye${showConfirmPassword ? '-slash' : ''}`}></i>
                                    </button>
                                </div>
                            </div>
                            {passwordError && (
                                <div className="text-danger small mb-2">
                                    <i className="fa-solid fa-circle-exclamation me-1"></i>
                                    {passwordError}
                                </div>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    {!passwordSuccess && (
                        <>
                            <Button variant="secondary" onClick={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordData({ newPassword: '', confirmPassword: '' }); }} disabled={passwordLoading}>
                                Cancelar
                            </Button>
                            <Button variant="dark" onClick={handlePasswordSubmit} disabled={passwordLoading}>
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

export default Profile;
