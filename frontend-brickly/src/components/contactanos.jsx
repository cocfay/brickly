import { useState, useEffect, useRef } from 'react';
import Container from 'react-bootstrap/Container';
import { FormattedMessage } from 'react-intl';
import { API_URL } from '../services/authService';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

function Contactanos() {
    const [form, setForm] = useState({
        fullName: '',
        phone: '',
        email: '',
        message: '',
    });
    const fieldIds = {
        fullName: 'contactanos-fullname',
        phone: 'contactanos-phone',
        email: 'contactanos-email',
        message: 'contactanos-message',
    };
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [turnstileReady, setTurnstileReady] = useState(false);
    const turnstileRef = useRef(null);
    const turnstileWidgetId = useRef(null);

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

    const formatPhone = (value) => {
        if (!value) return '';
        if (!value.startsWith('+502 ')) return value;

        let digits = value.slice(5).replace(/\D/g, '');
        digits = digits.slice(0, 8);

        let formatted = '+502 ';
        if (digits.length > 4) {
            formatted += digits.slice(0, 4) + ' ' + digits.slice(4);
        } else {
            formatted += digits;
        }

        return formatted;
    };

    const handleChange = (e) => {
        if (e.target.name === 'phone') {
            const raw = e.target.value;
            // Si el usuario borró el prefijo, lo restauramos al escribir
            if (!raw.startsWith('+502 ')) {
                const clean = raw.replace(/\D/g, '');
                if (clean.length > 0) {
                    setForm({ ...form, phone: formatPhone('+502 ' + clean) });
                } else {
                    setForm({ ...form, phone: '' });
                }
            } else {
                setForm({ ...form, phone: formatPhone(raw) });
            }
        } else {
            setForm({ ...form, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validar Turnstile
        const turnstileToken = turnstileWidgetId.current
            ? window.turnstile.getResponse(turnstileWidgetId.current)
            : null;
        
        if (!turnstileToken) {
            setError('Por favor, completa la verificación de seguridad.');
            return;
        }

        // Separar nombre y apellido: primera palabra = name, el resto = lastname
        const parts = form.fullName.trim().split(/\s+/);
        const name = parts[0] || '';
        const lastname = parts.slice(1).join(' ') || '';

        const body = {
            type: 'HomeForm',
            name,
            lastname,
            phone: form.phone,
            email: form.email,
            message: form.message,
            'cf-turnstile-response': turnstileToken
        };

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error('Error al enviar');

            // Resetear Turnstile
            if (turnstileWidgetId.current) {
                window.turnstile.reset(turnstileWidgetId.current);
            }

            setSuccess(true);
            setForm({ fullName: '', phone: '', email: '', message: '' });
        } catch {
            // Resetear Turnstile en caso de error
            if (turnstileWidgetId.current) {
                window.turnstile.reset(turnstileWidgetId.current);
            }
            setError('Ocurrió un error al enviar. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container style={{ marginTop: 'clamp(3rem, 10vw, 8rem)', marginBottom: 'clamp(2rem, 10vw, 4rem)' }}>
            <div className="text-center lh-1" style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontFamily: 'AppleGaramond' }}>
                <FormattedMessage id="contact.text1" />
            </div>

            {success ? (
                <div className="text-center mt-5 py-5">
                    <i className="fa-regular fa-circle-check mb-3" style={{ fontSize: '48px', color: '#2e7d32' }}></i>
                    <p className="fs-5 mt-3">Gracias por contactarnos, pronto nos pondremos en contacto contigo.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="row mt-3 mt-lg-5 g-4 form-contacto">
                    <div className="col-md-6">
                        <div className="form-group">
                            <label htmlFor={fieldIds.fullName} className="form-label"><FormattedMessage id="contact.text2" />*</label>
                            <input
                                id={fieldIds.fullName}
                                type="text"
                                name="fullName"
                                value={form.fullName}
                                onChange={handleChange}
                                className="form-control"
                                required
                            />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <label htmlFor={fieldIds.phone} className="form-label"><FormattedMessage id="contact.text3" />*</label>
                            <input
                                id={fieldIds.phone}
                                type="tel"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                className="form-control"
                                required
                            />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <label htmlFor={fieldIds.email} className="form-label"><FormattedMessage id="contact.text4" />*</label>
                            <input
                                id={fieldIds.email}
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                className="form-control"
                                required
                            />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <label htmlFor={fieldIds.message} className="form-label"><FormattedMessage id="contact.text5" />*</label>
                            <input
                                type="text"
                                id={fieldIds.message}
                                name="message"
                                value={form.message}
                                onChange={handleChange}
                                className="form-control"
                                //rows="3"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="col-12">
                            <div className="alert alert-danger py-2" style={{ fontSize: '14px' }}>{error}</div>
                        </div>
                    )}

                    {/* Turnstile Widget */}
                    <div className="col-12 d-flex justify-content-center">
                        <div ref={turnstileRef}></div>
                    </div>

                    <div className="col-12 d-flex justify-content-center mt-3">
                        <button type="submit" className="btn" disabled={loading}>
                            {loading
                                ? <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                                : null
                            }
                            <FormattedMessage id="contact.text6" />
                        </button>
                    </div>
                </form>
            )}
        </Container>
    );
}

export default Contactanos;
