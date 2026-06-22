import { useState, useEffect } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';
import { getAsociados, updateAsociado } from '../../services/asociados';
import { API_URL } from '../../../services/authService';
import { getLogoUrl } from '../../../services/logoService';
import { isProfileComplete } from '../../../utils/profileUtils';
import { fetchAllPages } from '../../../utils/fetchAll';

import arrow from '../../../assets/images/iconos/arrow.png'

function Edit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState({ logo_url: '', name: '', expire_date: '', category: '', type: '' });
    const [selectedAgency, setSelectedAgency] = useState(null);
    const [agencies, setAgencies] = useState([]);
    const [loadingAgencies, setLoadingAgencies] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loadingShow, setLoadingShow] = useState(true);
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertVariant, setAlertVariant] = useState('success');

    // Cargar agencias y el asociado actual
    useEffect(() => {
        const loadData = async () => {
            try {
                // Cargar agencias
                const users = await fetchAllPages(`${API_URL}/users/list-user`);

                const agenciesList = users.filter(u =>
                    u.isEnabled &&
                    Array.isArray(u.roles) && u.roles.includes('agencia') &&
                    isProfileComplete(u) &&
                    u.agentInfo?.logo
                ).map(u => ({
                    value: u._id,
                    label: u.fullname || u.name || 'Sin nombre',
                    logo: u.agentInfo?.logo || null,
                    logo_url: u.agentInfo?.logo || '',
                    role: Array.isArray(u.roles) ? u.roles[0] : u.roles || ''
                }));

                setAgencies(agenciesList);

                // Cargar el asociado a editar
                const result = await getAsociados();
                if (result.success) {
                    const dataArr = Array.isArray(result.data) ? result.data : [];
                    const asociado = dataArr.find(a => a._id === id);
                    if (asociado) {
                        const formData = {
                            logo_url: asociado.logo_url || '',
                            name: asociado.name || '',
                            expire_date: asociado.expire_date
                                ? asociado.expire_date.split('T')[0]
                                : '',
                            category: asociado.category || '',
                            type: asociado.type || ''
                        };
                        setForm(formData);

                        // Precargar la agencia seleccionada si coincide
                        const matched = agenciesList.find(a => a.label === formData.name || a.logo_url === formData.logo_url);
                        if (matched) {
                            setSelectedAgency(matched);
                        }
                    } else {
                        setAlertVariant('danger');
                        setAlertMessage('Asociado no encontrado.');
                        setShowAlert(true);
                    }
                } else {
                    setAlertVariant('danger');
                    setAlertMessage(result.error || 'Error al cargar asociado.');
                    setShowAlert(true);
                }
            } catch (error) {
                console.error('Error al cargar datos:', error);
                setAlertVariant('danger');
                setAlertMessage('Error al cargar datos.');
                setShowAlert(true);
            }
            setLoadingShow(false);
            setLoadingAgencies(false);
        };
        loadData();
    }, [id]);

    const handleAgencyChange = (selected) => {
        setSelectedAgency(selected);
        if (selected) {
            const role = selected.role
                ? selected.role.charAt(0).toUpperCase() + selected.role.slice(1)
                : '';
            setForm(prev => ({
                ...prev,
                name: selected.label,
                logo_url: selected.logo_url,
                category: role
            }));
        }
    };

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setShowAlert(false);

        try {
            const payload = {
                expire_date: form.expire_date
            };

            const result = await updateAsociado(id, payload);
            if (result.success) {
                setAlertVariant('success');
                setAlertMessage('Asociado actualizado correctamente.');
                setShowAlert(true);
                setTimeout(() => navigate('/cpanel/asociados'), 1500);
            } else {
                setAlertVariant('danger');
                setAlertMessage(result.error || 'Error al actualizar.');
                setShowAlert(true);
            }
        } catch (error) {
            setAlertVariant('danger');
            setAlertMessage(error.message || 'Error al actualizar.');
            setShowAlert(true);
        }
        setLoading(false);
    };

    // Formatear opciones para react-select con logo y nombre
    const formatOptionLabel = ({ label, logo }) => (
        <div className="d-flex align-items-center gap-2">
            {logo ? (
                <img
                    src={getLogoUrl(logo)}
                    alt=""
                    className="rounded-circle object-fit-cover"
                    style={{ width: '32px', height: '32px' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
            ) : (
                <div
                    className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white"
                    style={{ width: '32px', height: '32px', fontSize: '14px' }}
                >
                    {label.charAt(0).toUpperCase()}
                </div>
            )}
            <span>{label}</span>
        </div>
    );

    if (loadingShow) return (
        <Container className="text-center py-5">
            <div className="spinner-border text-primary" />
        </Container>
    );

    return (
        <Container>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className='fs-1'>Editar asociado</div>
                <Link to="/cpanel/asociados" title='Atrás'><img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" srcSet="" /></Link>
            </div>

            {showAlert && (
                <Alert variant={alertVariant} onClose={() => setShowAlert(false)} dismissible className="position-fixed bottom-0 end-0 m-3 shadow-sm" style={{ zIndex: 9999 }}>
                    <div className="d-flex align-items-center gap-2">
                        <i className={`fa-solid ${alertVariant === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        <span>{alertMessage}</span>
                    </div>
                </Alert>
            )}

            <form onSubmit={handleSubmit}>
                <div className="row">
                    <div className="col-md-6">
                        <label className="form-label">Fecha de expiración*</label>
                        <div className="position-relative">
                            <input
                                type="date" name="expire_date" required
                                className="form-control rounded-pill"
                                value={form.expire_date} onChange={handleChange}
                            />
                            <i
                                className="fa-regular fa-calendar position-absolute top-50 end-0 translate-middle-y me-3"
                                style={{ color: '#6c757d', fontSize: '16px', pointerEvents: 'none', zIndex: 1 }}
                            ></i>
                        </div>
                    </div>
                </div>

                <div className="d-flex justify-content-end mt-5">
                    <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                        {loading ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </form>
        </Container>
    );
}

export default Edit;
