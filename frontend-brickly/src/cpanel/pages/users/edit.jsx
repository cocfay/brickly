import { useState, useEffect } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { API_URL, getToken } from '../../../services/authService';
import { disableAgencyProperties } from '../../services/propiedades';
import arrow from '../../../assets/images/iconos/arrow.png';

const getUserById = async (id) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`Error ${response.status}`);
        return { success: true, data: await response.json() };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

const updateUser = async (id, data) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'PUT',
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

function Edit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState([]);
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        roles: 'cliente',
        isEnabled: true
    });
    const [originalIsEnabled, setOriginalIsEnabled] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loadingShow, setLoadingShow] = useState(true);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        const load = async () => {
            const result = await getUserById(id);
            if (result.success) {
                const u = result.data;
                const enabled = u.isEnabled !== false;
                setForm({
                    name: u.name || '',
                    email: u.email || '',
                    password: '',
                    roles: Array.isArray(u.roles) ? u.roles[0] : (u.roles || 'cliente'),
                    isEnabled: enabled
                });
                setOriginalIsEnabled(enabled);
                setUser(result.data);
            } else {
                setAlert({ variant: 'danger', message: result.error || 'Error al cargar usuario.' });
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

        const payload = {
            name: form.name,
            roles: [form.roles],
            isEnabled: form.isEnabled
        };
        if (form.password.trim()) payload.password = form.password;

        const result = await updateUser(id, payload);
        if (result.success) {
            // Si se desactivó una agencia, desactivar todas sus propiedades
            const isAgencia = form.roles === 'agencia';
            if (isAgencia && originalIsEnabled === true && form.isEnabled === false) {
                const disableResult = await disableAgencyProperties(id);
                if (disableResult.success) {
                    setAlert({ 
                        variant: 'success', 
                        message: `Usuario actualizado. ${disableResult.message}` 
                    });
                } else {
                    setAlert({ 
                        variant: 'warning', 
                        message: `Usuario actualizado, pero hubo un error al desactivar propiedades: ${disableResult.error}` 
                    });
                }
            } else {
                setAlert({ variant: 'success', message: 'Usuario actualizado correctamente.' });
            }
            setTimeout(() => navigate('/cpanel/users'), 1500);
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
                <div className='fs-1'>Editar usuario</div>
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
                        <label className="form-label">Correo electrónico</label>
                        <input
                            type="email" name="email"
                            className="form-control rounded-pill bg-light"
                            value={form.email} readOnly disabled
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">
                            Nueva contraseña <span className="text-muted" style={{ fontSize: '12px' }}>(dejar vacío para no cambiar)</span>
                        </label>
                        <input
                            type="password" name="password"
                            className="form-control rounded-pill"
                            value={form.password} onChange={handleChange}
                            placeholder="Nueva contraseña"
                        />
                    </div>
                    {!user?.roles?.includes('admin') && 
                        <>
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
                        </> 
                    }
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
