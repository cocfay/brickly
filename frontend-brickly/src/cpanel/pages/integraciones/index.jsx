import { useState, useEffect } from 'react';
import { Container, Row, Col, Alert } from "react-bootstrap";
import { getCurrentUser, fetchUserProfile, updateUserProfile, getToken, API_URL } from '../../../services/authService';

import img1 from '../../assets/images/temp/c1.png'
import img2 from '../../assets/images/temp/c2.png'

function Integraciones() {
    const user = getCurrentUser();
    const isAgente = Array.isArray(user?.roles)
        ? user.roles.some(r => r === 'agente')
        : user?.roles === 'agente';

    // Estado para EasyBroker
    const [easyBrokerApiKey, setEasyBrokerApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);

    // Cargar API Key existente al montar el componente
    useEffect(() => {
        const loadEasyBrokerKey = async () => {
            try {
                const token = getToken();
                if (!token) return;
                
                const response = await fetch(`${API_URL}/users/me`, {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data?.easyBrokerApiKey) {
                        setEasyBrokerApiKey(data.easyBrokerApiKey);
                    }
                }
            } catch (error) {
                console.error('Error al cargar API Key:', error);
            }
        };
        loadEasyBrokerKey();
    }, []);

    const handleSaveEasyBroker = async () => {
        setLoading(true);
        setAlert(null);

        const result = await updateUserProfile({ easyBrokerApiKey });

        if (result.success) {
            // Refrescar perfil para actualizar la cookie
            await fetchUserProfile();
            setAlert({ variant: 'success', message: 'API Key de EasyBroker guardada correctamente.' });
        } else {
            setAlert({ variant: 'danger', message: result.error || 'Error al guardar la API Key.' });
        }

        setLoading(false);
    };

    return(
        <Container className="fs-2">
            <div className="position-relative mt-1 justify-content-center d-flex mt-4">
                <img src={img2} className="w-100 object-fit-cover" style={{ height: '450px' }} alt="" />
                <div className="position-absolute top-50 start-50 translate-middle" style={{ width: 'min(550px, 100%)' }}>
                    <div className="bg-dark text-white p-5 rounded-4 overflow-hidden" style={{ height: '330px' }}>
                        <img src={img1} className="w-100" alt="" style={{ transform: 'scale(1.3)' }} />
                        <div className="text-center fs-4 lh-sm position-absolute top-50 start-50 translate-middle">
                            Próximamente en Brickly podrás conectar con tus herramientas favoritas.
                        </div>
                    </div>
                </div>
            </div>

            {/* Cards de integración visibles solo para Agentes */}
            {isAgente && (
                <Row className="mt-5 gy-4">
                    <Col md={6}>
                        <div className="border rounded-4 p-4 h-100 d-flex flex-column align-items-center text-center shadow-sm">
                            <i className="fa-solid fa-handshake fs-1 mb-3" style={{ color: '#B70818' }}></i>
                            <h4 className="fw-bold">Integra con Wasi CRM</h4>
                            <p className="text-muted fs-6">
                                Conecta tu cuenta de Wasi CRM y sincroniza tus propiedades, clientes y leads automáticamente.
                            </p>
                            <button className="btn btn-dark rounded-5 px-4 mt-auto">
                                Conectar
                            </button>
                        </div>
                    </Col>
                    <Col md={6}>
                        <div className="border rounded-4 p-4 h-100 d-flex flex-column shadow-sm">
                            <div className="text-center">
                                <i className="fa-solid fa-link fs-1 mb-3" style={{ color: '#005051' }}></i>
                                <h4 className="fw-bold">Integra con EasyBroker CRM</h4>
                                <p className="text-muted fs-6">
                                    Sincroniza tus propiedades y contactos de EasyBroker directamente en Brickly.
                                </p>
                            </div>

                            {alert && (
                                <Alert variant={alert.variant} onClose={() => setAlert(null)} dismissible className="fs-6 py-2 mb-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <i className={`fa-solid ${alert.variant === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                                        <span>{alert.message}</span>
                                    </div>
                                </Alert>
                            )}

                            <div className="mt-auto">
                                <label className="form-label fs-6 fw-semibold">API Key</label>
                                <div className="input-group">
                                    <input
                                        type={showKey ? "text" : "password"}
                                        className="form-control rounded-start-4"
                                        placeholder="Ingresa tu API Key de EasyBroker"
                                        value={easyBrokerApiKey}
                                        onChange={(e) => setEasyBrokerApiKey(e.target.value)}
                                    />
                                    <button
                                        className="btn btn-outline-secondary"
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        title={showKey ? "Ocultar" : "Mostrar"}
                                    >
                                        <i className={`fa-solid ${showKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                                <button
                                    className="btn btn-dark rounded-5 px-4 mt-3 w-100"
                                    onClick={handleSaveEasyBroker}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="spinner-border spinner-border-sm me-2" />
                                    ) : (
                                        <i className="fa-solid fa-floppy-disk me-2"></i>
                                    )}
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </Col>
                </Row>
            )}
        </Container>
    )
}

export default Integraciones
