import { useState, useEffect } from "react"
import { Container, Row, Col, Alert } from "react-bootstrap"
import { getFullUser, getToken, API_URL } from './../../../services/authService'

function RetryPayment() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleRetry = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const token = getToken();
            const res = await fetch(`${API_URL}/payments/retry-checkout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al generar el enlace de pago');
            }
            const data = await res.json();
            if (data?.url) {
                window.location.href = data.url;
            } else if (data?.data?.url) {
                window.location.href = data.data.url;
            } else {
                setError('No se pudo obtener el enlace de pago. Intente de nuevo.');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const user = getFullUser();
        if (!user?.accessBlocked) {
            window.location.href = '/cpanel/';
        }
    }, []);

    return (
        <Container className="py-5">
            <Row className="justify-content-center">
                <Col md={8} lg={6}>
                    <div className="text-center">
                        <i className="fa-solid fa-lock fa-3x text-danger mb-3"></i>
                        <h3 className="fw-bold mb-3">Acceso bloqueado</h3>
                        <p className="text-muted mb-4">
                            Tu plan ha sido suspendido porque no se pudo procesar el pago recurrente.
                            Haz clic en el botón para reintentar el pago y recuperar el acceso a todas las funcionalidades.
                        </p>
                        {error && <Alert variant="danger" className="text-center">{error}</Alert>}
                        {success && <Alert variant="success" className="text-center">{success}</Alert>}
                        <button
                            className="btn btn-dark btn-lg px-5"
                            onClick={handleRetry}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Generando enlace...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-credit-card me-2"></i>
                                    Reintentar pago
                                </>
                            )}
                        </button>
                    </div>
                </Col>
            </Row>
        </Container>
    );
}

export default RetryPayment;
