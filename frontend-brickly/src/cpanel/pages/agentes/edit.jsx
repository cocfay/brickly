import { useState, useEffect } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getAgenteById, updateAgente } from '../../services/agentes';

import arrow from '../../../assets/images/iconos/arrow.png'

function Edit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const fromUsers = searchParams.get('from') === 'users';
    const [form, setForm] = useState({ name: '', password: '', isEnabled: true });
    const [originalIsEnabled, setOriginalIsEnabled] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loadingShow, setLoadingShow] = useState(true);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        const load = async () => {
            const result = await getAgenteById(id);
            if (result.success) {
                const enabled = result.data.isEnabled !== false;
                setForm({ 
                    name: result.data.name || '', 
                    password: '',
                    isEnabled: enabled 
                });
                setOriginalIsEnabled(enabled);
            } else {
                setAlert({ variant: 'danger', message: result.error || 'Error al cargar agente.' });
            }
            setLoadingShow(false);
        };
        load();
    }, [id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAlert(null);

        // Solo enviar password si el usuario escribió algo
        const payload = { 
            name: form.name,
            isEnabled: form.isEnabled
        };
        if (form.password.trim()) payload.password = form.password;

        const result = await updateAgente(id, payload);
        if (result.success) {
            setAlert({ variant: 'success', message: 'Agente actualizado correctamente.' });
            setTimeout(() => navigate(fromUsers ? '/cpanel/users' : '/cpanel/agentes'), 1500);
        } else {
            setAlert({ variant: 'danger', message: result.error || 'Error al actualizar.' });
        }
        setLoading(false);
    };

    if (loadingShow) return (
        <Container className="text-center py-5">
            <div className="spinner-border text-primary" />
        </Container>
    );

    return (
        <Container>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className='fs-1'>Editar agente</div>
                <Link onClick={() => navigate(-1)} title='Atrás'><img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" srcSet="" /></Link>
            </div>

            {alert && (
                <Alert variant={alert.variant} onClose={() => setAlert(null)} dismissible>
                    <div className="d-flex align-items-center gap-2">
                        <i className={`fa-solid ${alert.variant === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        <span>{alert.message}</span>
                    </div>

                </Alert>
            )}

            <form onSubmit={handleSubmit}>
                <div className="row g-4">
                    <div className="col-md-6">
                        <label className="form-label">Nombre del agente*</label>
                        <input
                            type="text" name="name" required
                            className="form-control rounded-pill"
                            value={form.name} onChange={handleChange}
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Contraseña <span className="text-muted" style={{fontSize:'12px'}}>(dejar vacío para no cambiar)</span></label>
                        <input
                            type="password" name="password"
                            className="form-control rounded-pill"
                            value={form.password} onChange={handleChange}
                            placeholder="Nueva contraseña"
                        />
                    </div>
                    <div className="col-md-6 d-flex align-items-center gap-2 mt-4">
                        <input
                            type="checkbox" name="isEnabled" id="isEnabled"
                            className="form-check-input mt-0"
                            checked={form.isEnabled} onChange={handleChange}
                        />
                        <label htmlFor="isEnabled" className="form-check-label">Agente activo</label>
                    </div>
                </div>
                <div className="d-flex justify-content-end mt-5">
                    <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                        Guardar cambios
                    </button>
                </div>
            </form>
        </Container>
    );
}

export default Edit;
