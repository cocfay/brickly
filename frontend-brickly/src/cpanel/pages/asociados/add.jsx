import { useState, useEffect } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { createAsociado, getAsociados } from '../../services/asociados';
import { API_URL } from '../../../services/authService';
import { getLogoUrl } from '../../../services/logoService';
import { isProfileComplete } from '../../../utils/profileUtils';
import { fetchAllPages } from '../../../utils/fetchAll';

import arrow from '../../../assets/images/iconos/arrow.png'

function Add() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ logo_url: '', name: '', expire_date: '', category: '', type: '' });
    const [selectedAgency, setSelectedAgency] = useState(null);
    const [agencies, setAgencies] = useState([]);
    const [loadingAgencies, setLoadingAgencies] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertVariant, setAlertVariant] = useState('success');

    // Cargar agencias activas con perfil completo, excluyendo las ya asociadas
    useEffect(() => {
        const loadAgencies = async () => {
            try {
                // Cargar agencias disponibles
                const users = await fetchAllPages(`${API_URL}/users/list-user`);

                // Cargar asociados existentes para saber qué agencias ya están asociadas
                const asociadosRes = await getAsociados();
                const existingIds = new Set();
                if (asociadosRes.success && Array.isArray(asociadosRes.data)) {
                    asociadosRes.data.forEach(a => {
                        if (a.type) existingIds.add(a.type);
                    });
                }

                // Filtrar: agencias activas, con perfil completo, con logo y que NO estén ya asociadas
                const agenciesList = users.filter(u =>
                    u.isEnabled &&
                    Array.isArray(u.roles) && u.roles.includes('agencia') &&
                    isProfileComplete(u) &&
                    u.agentInfo?.logo &&
                    !existingIds.has(u._id)
                ).map(u => ({
                    value: u._id,
                    label: u.fullname || u.name || 'Sin nombre',
                    logo: u.agentInfo?.logo || null,
                    logo_url: u.agentInfo?.logo || '',
                    role: Array.isArray(u.roles) ? u.roles[0] : u.roles || ''
                }));

                setAgencies(agenciesList);
            } catch (error) {
                console.error('Error al cargar agencias:', error);
                setAlertVariant('danger');
                setAlertMessage('Error al cargar lista de agencias.');
                setShowAlert(true);
            }
            setLoadingAgencies(false);
        };
        loadAgencies();
    }, []);

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
        } else {
            setForm(prev => ({
                ...prev,
                name: '',
                logo_url: '',
                category: ''
            }));
        }
    };

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setShowAlert(false);

        if (!selectedAgency) {
            setAlertVariant('danger');
            setAlertMessage('Debes seleccionar una agencia.');
            setShowAlert(true);
            setLoading(false);
            return;
        }

        try {
            const payload = {
                logo_url: form.logo_url,
                name: form.name,
                expire_date: form.expire_date,
                category: form.category,
                type: selectedAgency.value
            };

            const result = await createAsociado(payload);

            if (result.success) {
                setAlertVariant('success');
                setAlertMessage('Asociado creado correctamente.');
                setShowAlert(true);
                setTimeout(() => navigate('/cpanel/asociados'), 1500);
            } else {
                setAlertVariant('danger');
                setAlertMessage(result.error || 'Error al crear asociado.');
                setShowAlert(true);
            }
        } catch (error) {
            setAlertVariant('danger');
            setAlertMessage(error.message || 'Error al crear asociado.');
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

    return (
        <Container>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className='fs-1'>Asignar asociado</div>
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
                <div className="row g-4">
                    <div className="col-md-6">
                        <label className="form-label">Seleccionar agencia*</label>
                        <Select
                            options={agencies}
                            value={selectedAgency}
                            onChange={handleAgencyChange}
                            formatOptionLabel={formatOptionLabel}
                            placeholder="Buscar agencia..."
                            isClearable
                            isLoading={loadingAgencies}
                            noOptionsMessage={() => 'No hay agencias disponibles'}
                            styles={{
                                control: (base, state) => ({
                                    ...base,
                                    borderRadius: '50px',
                                    padding: '2px 8px',
                                    minHeight: '42px',
                                    borderColor: state.isFocused ? '#000' : base.borderColor,
                                    boxShadow: state.isFocused ? '0 0 0 1px #000' : base.boxShadow,
                                    '&:hover': { borderColor: '#000' }
                                }),
                                placeholder: (base) => ({
                                    ...base,
                                    fontSize: '14px',
                                    color: '#6c757d'
                                }),
                                option: (base, state) => ({
                                    ...base,
                                    backgroundColor: state.isSelected ? '#2a2a2a' : state.isFocused ? '#3a3a3a' : '#fff',
                                    color: state.isSelected || state.isFocused ? '#fff' : '#000',
                                    '&:active': { backgroundColor: '#2a2a2a' }
                                }),
                                multiValue: (base) => ({
                                    ...base,
                                    backgroundColor: '#000',
                                    color: '#fff'
                                }),
                                multiValueLabel: (base) => ({
                                    ...base,
                                    color: '#fff'
                                }),
                                multiValueRemove: (base) => ({
                                    ...base,
                                    color: '#fff',
                                    '&:hover': { backgroundColor: '#333', color: '#fff' }
                                }),
                                indicatorSeparator: (base) => ({
                                    ...base,
                                    backgroundColor: '#ccc'
                                }),
                                dropdownIndicator: (base, state) => ({
                                    ...base,
                                    color: state.isFocused ? '#000' : '#666',
                                    '&:hover': { color: '#000' }
                                }),
                                clearIndicator: (base) => ({
                                    ...base,
                                    color: '#666',
                                    '&:hover': { color: '#000' }
                                }),
                                menu: (base) => ({
                                    ...base,
                                    border: '1px solid #000'
                                })
                            }}
                        />
                    </div>
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

                {/* Campos ocultos que se autocompletan */}
                <input type="hidden" name="name" value={form.name} />
                <input type="hidden" name="logo_url" value={form.logo_url} />
                <input type="hidden" name="category" value={form.category} />
                <input type="hidden" name="type" value={form.type} />

                <div className="d-flex justify-content-end mt-5">
                    <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={loading || loadingAgencies}>
                        {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                        {loading ? 'Guardando...' : 'Asociar'}
                    </button>
                </div>
            </form>
        </Container>
    );
}

export default Add;
