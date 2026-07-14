import { useState, useEffect } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { createAgente, getAgentLimit } from '../../services/agentes';

import arrow from '../../../assets/images/iconos/arrow.png'

function Add() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', password: '', email: '' });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [limitInfo, setLimitInfo] = useState(null);
    const [checkingLimit, setCheckingLimit] = useState(true);

    useEffect(() => {
        const checkLimit = async () => {
            setCheckingLimit(true);
            const result = await getAgentLimit();
            if (result.success) {
                setLimitInfo(result.data);
            } else {
                // Si falla la consulta, no bloqueamos el formulario aquí:
                // el backend igual valida el límite al enviar el formulario.
                setLimitInfo(null);
            }
            setCheckingLimit(false);
        };
        checkLimit();
    }, []);

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAlert(null);

        const result = await createAgente({ ...form, roles: ['agente'] });

        if (result.success) {
            setAlert({ variant: 'success', message: 'Agente creado correctamente.' });
            setTimeout(() => navigate('/cpanel/agentes'), 1500);
        } else {
            setAlert({ variant: 'danger', message: result.error || 'Error al crear agente.' });
        }
        setLoading(false);
    };

    const limitReached = limitInfo && !limitInfo.canCreate;

    return (
        <Container>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className='fs-1'>Crear agente</div>
                <Link to="/cpanel/agentes" title='Atrás'><img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" srcSet="" /></Link>
            </div>

            {alert && (
                <Alert variant={alert.variant} onClose={() => setAlert(null)} dismissible className="position-fixed bottom-0 end-0 m-3 shadow-sm">
                    <div className="d-flex align-items-center gap-2">
                        <i className={`fa-solid ${alert.variant === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        <span>{alert.message}</span>
                    </div>

                </Alert>
            )}

            {!checkingLimit && limitInfo && (
                <div className={`mb-4 small ${limitReached ? 'text-danger' : 'text-muted'}`}>
                    Agentes creados: {limitInfo.current} / {limitInfo.max === 0 ? 'sin cupo en tu plan actual' : limitInfo.max}
                </div>
            )}

            {limitReached ? (
                <Alert variant="warning">
                    <div className="d-flex align-items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        <span>
                            {limitInfo.max === 0
                                ? 'Tu plan actual no permite crear agentes, o tu suscripción no está activa. Actualiza tu plan para continuar.'
                                : `Has alcanzado el límite de ${limitInfo.max} agente(s) para tu plan actual. Actualiza tu plan para agregar más.`}
                        </span>
                    </div>
                </Alert>
            ) : (
                <form onSubmit={handleSubmit}>
                    <div className="row g-4">
                        <div className="col-md-4">
                            <label className="form-label">Nombre del agente*</label>
                            <input
                                type="text" name="name" required
                                className="form-control rounded-pill"
                                value={form.name} onChange={handleChange}
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Clave de usuario*</label>
                            <input
                                type="password" name="password" required
                                className="form-control rounded-pill"
                                value={form.password} onChange={handleChange}
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Correo electrónico*</label>
                            <input
                                type="email" name="email" required
                                className="form-control rounded-pill"
                                value={form.email} onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="d-flex justify-content-end mt-5">
                        <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={loading || checkingLimit}>
                            {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                            Crear agente
                        </button>
                    </div>
                </form>
            )}
        </Container>
    );
}

export default Add;
