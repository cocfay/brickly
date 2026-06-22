import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import logoB from '../assets/images/logos/logo_negro.png';
import login from '../assets/images/imagenes_de_fondo/loginImg.webp';

// ── Toast flotante ────────────────────────────────────────────
function Toast({ message, color = '#4caf50', icon = 'fa-circle-check' }) {
    return (
        <div style={{
            position: 'fixed', bottom: '24px', right: '24px',
            backgroundColor: '#1a1a1a', color: 'white',
            padding: '14px 22px', borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            fontSize: '15px', zIndex: 9999,
            display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '320px',
        }}>
            <i className={`fa-regular ${icon}`} style={{ color, fontSize: '18px', flexShrink: 0 }} />
            {message}
        </div>
    );
}

// ── Indicador de pasos ────────────────────────────────────────
function StepIndicator({ current }) {
    const steps = ['Correo', 'Nueva contraseña', 'Código'];
    return (
        <div className="d-flex align-items-center justify-content-center gap-2 mb-4">
            {steps.map((label, i) => {
                const num = i + 1;
                const active  = num === current;
                const done    = num < current;
                return (
                    <div key={i} className="d-flex align-items-center gap-2">
                        <div className="d-flex flex-column align-items-center gap-1">
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                backgroundColor: done ? '#1a1a1a' : active ? '#1a1a1a' : '#e0e0e0',
                                color: done || active ? 'white' : '#999',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '13px', fontWeight: 600, transition: 'all 0.3s',
                            }}>
                                {done ? <i className="fa-solid fa-check" style={{ fontSize: '11px' }} /> : num}
                            </div>
                            <span style={{ fontSize: '11px', color: active ? '#1a1a1a' : '#999', whiteSpace: 'nowrap' }}>
                                {label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{
                                width: '40px', height: '2px', marginBottom: '18px',
                                backgroundColor: done ? '#1a1a1a' : '#e0e0e0',
                                transition: 'background-color 0.3s',
                            }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────
function ForgotPassword() {
    const navigate = useNavigate();
    const fieldIds = {
        email: 'forgot-password-email',
        newPassword: 'forgot-password-new-password',
        confirmPassword: 'forgot-password-confirm-password',
        code: 'forgot-password-code',
    };
    const [step, setStep]         = useState(1);
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm]   = useState('');
    const [code, setCode]         = useState('');
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState('');
    const [toast, setToast]       = useState(null);

    const showToast = (message, color = '#4caf50', icon = 'fa-circle-check') => {
        setToast({ message, color, icon });
        setTimeout(() => setToast(null), 2000);
    };

    // Validación contraseña: alfanumérica, mínimo 8 caracteres
    const validatePassword = (pwd) => {
        if (pwd.length < 8) return 'Mínimo 8 caracteres.';
        if (!/[a-zA-Z]/.test(pwd)) return 'Debe contener al menos una letra.';
        if (!/[0-9]/.test(pwd)) return 'Debe contener al menos un número.';
        return '';
    };

    // ── Paso 1: enviar correo ─────────────────────────────────
    // La API devuelve 200 siempre, pero el mensaje cambia:
    //   correo existe    → "Código enviado al correo"
    //   correo no existe → "Si el correo existe, se enviará un código"
    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data?.message || 'Error al procesar la solicitud.');
            } else if (data?.message === 'Código enviado al correo') {
                setStep(2);
            } else {
                setError('El correo ingresado no está registrado.');
            }
        } catch {
            setError('Error de conexión. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    // ── Paso 2: nueva contraseña ──────────────────────────────
    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        setError('');
        const pwdError = validatePassword(password);
        if (pwdError) { setError(pwdError); return; }
        if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
        setStep(3);
    };

    // ── Paso 3: código de verificación ───────────────────────
    const handleCodeSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword: password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data?.message || 'Código incorrecto. Intenta de nuevo.');
            } else {
                showToast('Contraseña reestablecida');
                setTimeout(() => navigate('/login'), 2000);
            }
        } catch {
            setError('Error de conexión. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="mt-5" style={{ fontSize: 'clamp(16px, 3vw, 24px)', marginBottom: 'clamp(5rem, 10vw, 9rem)' }}>
            <div className="row" style={{ background: '#FAFAFA' }}>
                {/* Imagen lateral */}
                <div className="col-lg-7 d-none d-lg-block">
                    <img src={login} className="w-100" alt="background" style={{ objectFit: 'cover', height: '100%' }} />
                </div>

                {/* Panel del wizard */}
                <div className="col-lg-5 py-5 px-3 px-lg-5">
                    <div className="text-center m-auto">
                        <img src={logoB} style={{ width: '200px' }} alt="Logo" />
                        <h5 className="mt-4 mb-4" style={{fontSize: 'clamp(20px, 3vw, 28px)' }}>
                            Recuperar contraseña
                        </h5>

                        <StepIndicator current={step} />

                        {/* Error inline */}
                        {error && (
                            <div className="alert alert-danger py-2 text-start" style={{ fontSize: '14px' }}>
                                <i className="fa-regular fa-circle-xmark me-2" />
                                {error}
                            </div>
                        )}

                        {/* ── Paso 1 ── */}
                        {step === 1 && (
                            <form onSubmit={handleEmailSubmit} className="d-flex flex-column gap-3 mt-3">
                                <p className="text-muted text-start" style={{ fontSize: '14px' }}>
                                    Ingresa tu correo electrónico. Si está registrado, recibirás un código para restablecer tu contraseña.
                                </p>
                                <label htmlFor={fieldIds.email} className="visually-hidden">Correo electrónico</label>
                                <input
                                    id={fieldIds.email}
                                    type="email"
                                    className="form-control rounded-1"
                                    style={{ minHeight: '50px' }}
                                    placeholder="Correo electrónico"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                                <button type="submit" className="py-2 rounded-1 mt-2" disabled={loading}>
                                    {loading
                                        ? <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                                        : null}
                                    Enviar código
                                </button>
                                <Link to="/login" className="text-muted text-center" style={{ fontSize: '14px' }}>
                                    ← Volver al inicio de sesión
                                </Link>
                            </form>
                        )}

                        {/* ── Paso 2 ── */}
                        {step === 2 && (
                            <form onSubmit={handlePasswordSubmit} className="d-flex flex-column gap-3 mt-3">
                                <p className="text-muted text-start" style={{ fontSize: '14px' }}>
                                    Crea tu nueva contraseña. Debe tener mínimo 8 caracteres alfanuméricos.
                                </p>
                                <label htmlFor={fieldIds.newPassword} className="visually-hidden">Nueva contraseña</label>
                                <input
                                    id={fieldIds.newPassword}
                                    type="password"
                                    className="form-control rounded-1"
                                    style={{ minHeight: '50px' }}
                                    placeholder="Nueva contraseña"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    maxLength={20}
                                />
                                <label htmlFor={fieldIds.confirmPassword} className="visually-hidden">Repetir contraseña</label>
                                <input
                                    id={fieldIds.confirmPassword}
                                    type="password"
                                    className="form-control rounded-1"
                                    style={{ minHeight: '50px' }}
                                    placeholder="Repetir contraseña"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    required
                                    maxLength={20}
                                />
                                <button type="submit" className="py-2 rounded-1 mt-2">
                                    Continuar
                                </button>
                                <button type="button" className="btn btn-link text-muted p-0" style={{ fontSize: '14px' }} onClick={() => setStep(1)}>
                                    ← Volver
                                </button>
                            </form>
                        )}

                        {/* ── Paso 3 ── */}
                        {step === 3 && (
                            <form onSubmit={handleCodeSubmit} className="d-flex flex-column gap-3 mt-3">
                                <p className="text-muted text-start" style={{ fontSize: '14px' }}>
                                    Ingresa el código de 6 dígitos que enviamos a <strong>{email}</strong>.
                                </p>
                                <label htmlFor={fieldIds.code} className="visually-hidden">Código de verificación</label>
                                <input
                                    id={fieldIds.code}
                                    type="text"
                                    className="form-control rounded-1 text-center"
                                    style={{ minHeight: '50px', letterSpacing: '6px', fontSize: '22px' }}
                                    placeholder="000000"
                                    value={code}
                                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    required
                                    maxLength={6}
                                    disabled={loading}
                                />
                                <button type="submit" className="py-2 rounded-1 mt-2 bg-black text-white" disabled={loading || code.length < 6}>
                                    {loading
                                        ? <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                                        : null}
                                    Restablecer contraseña
                                </button>
                                <button type="button" className="btn btn-link text-muted p-0" style={{ fontSize: '14px' }} onClick={() => setStep(2)}>
                                    ← Volver
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} color={toast.color} icon={toast.icon} />}
        </Container>
    );
}

export default ForgotPassword;
