import { useState } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL, getToken } from '../../../services/authService';
import arrow from '../../../assets/images/iconos/arrow.png';

const createUser = async (data) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/auth/create-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || `Error ${response.status}`);
        }
        return { success: true, data: await response.json() };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

const ROLES = ['admin', 'agencia', 'agente', 'arquitecto', 'desarrolladora', 'cliente'];

function Add() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        roles: 'cliente',
        isEnabled: true
    });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAlert(null);

        const payload = {
            ...form,
            roles: [form.roles]
        };

        const result = await createUser(payload);
        if (result.success) {
            setAlert({ variant: 'success', message: 'Usuario creado correctamente.' });
            setTimeout(() => navigate('/cpanel/users'), 1500);
        } else {
            setAlert({ variant: 'danger', message: result.error || 'Error al crear usuario.' });
        }
        setLoading(false);
    };

    return (
        <Container>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className='fs-1'>Crear usuario</div>
                <Link to="/cpanel/users" title='Atrás'><img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" /></Link>
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
                        <label className="form-label">Nombre completo *</label>
                        <input
                            type="text" name="name" required
                            className="form-control rounded-pill"
                            value={form.name} onChange={handleChange}
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Correo electrónico *</label>
                        <input
                            type="email" name="email" required
                            className="form-control rounded-pill"
                            value={form.email} onChange={handleChange}
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Contraseña *</label>
                        <input
                            type="password" name="password" required
                            className="form-control rounded-pill"
                            value={form.password} onChange={handleChange}
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Rol *</label>
                        <select
                            name="roles"
                            className="form-select rounded-pill"
                            value={form.roles} onChange={handleChange}
                        >
                            {ROLES.map(r => (
                                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-6 d-flex align-items-center gap-2 mt-4">
                        <input
                            type="checkbox" name="isEnabled" id="isEnabled"
                            className="form-check-input mt-0"
                            checked={form.isEnabled} onChange={handleChange}
                        />
                        <label htmlFor="isEnabled" className="form-check-label">Usuario activo</label>
                    </div>
                </div>

                <div className="d-flex justify-content-end mt-5">
                    <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                        Crear usuario
                    </button>
                </div>
            </form>
        </Container>
    );
}

export default Add;
