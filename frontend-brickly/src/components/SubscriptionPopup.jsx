import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import popupImg from '../assets/images/imagenes_de_casas/zona16.jpg';
import logoBlanco from '../assets/images/logos/logo_blanco.png';
import { API_URL } from '../services/authService';

const setCookie = (name, value, days) => {
  let expires = "";
  if (days) {
    let date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
};

const getCookie = (name) => {
  let nameEQ = name + "=";
  let ca = document.cookie.split(';');
  for(let i=0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const SubscriptionPopup = () => {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const isSubscribed = getCookie('brickly_subscribed');
    const isDismissed = getCookie('brickly_popup_dismissed');

    if (!isSubscribed && !isDismissed) {
      // 4 minutos de navegación (240,000 ms)
      const timer = setTimeout(() => {
        setShow(true);
      }, 4 * 60 * 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    // Cookie de 2 días para que vuelva a aparecer si no se ha suscrito
    setCookie('brickly_popup_dismissed', 'true', 2);
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/contact/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Este correo ya está suscrito');
      }
      setSuccess(true);
      setCookie('brickly_subscribed', 'true', 365); // No volver a mostrar si ya se suscribió
      setTimeout(() => {
        setShow(false);
      }, 3000);
    } catch (err) {
      setError(err.message || 'Error al suscribirse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered className="subscription-popup-modal">
      <Modal.Body className="p-0 position-relative overflow-hidden" style={{ borderRadius: '12px' }}>
        <button
          type="button"
          onClick={handleClose}
          className="position-absolute top-0 end-0 m-3 border-0 bg-transparent"
          style={{ zIndex: 10, fontSize: '20px', color: '#111', cursor: 'pointer' }}
          aria-label="Close"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        <Row className="g-0 align-items-stretch">
          {/* Columna izquierda con imagen */}
          <Col lg={5} className="d-none d-lg-flex position-relative text-white p-4 flex-column justify-content-between" style={{ minHeight: '480px', backgroundImage: `url(${popupImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)' }}></div>
            <div className="position-relative z-1">
              <h3 className="fw-light fst-italic" style={{ fontFamily: 'AppleGaramond, serif', fontSize: 'clamp(24px, 2.5vw, 32px)', lineHeight: '1.2' }}>
                Hogares que inspiran tu próximo capítulo
              </h3>
              <div style={{ width: '40px', height: '2px', backgroundColor: '#fff', marginTop: '12px' }}></div>
            </div>
            <div className="position-relative z-1">
              <img src={logoBlanco} alt="Brickly Homes" style={{ width: '140px' }} />
            </div>
          </Col>

          {/* Columna derecha con formulario */}
          <Col lg={7} className="p-4 p-md-5 d-flex flex-column justify-content-center bg-white text-dark">
            <div className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '11px', letterSpacing: '1.5px' }}>
              NOVEDADES BRICKLY
            </div>
            <h2 className="fw-bold mb-3" style={{ fontSize: 'clamp(22px, 2.2vw, 28px)', lineHeight: '1.25', color: '#111' }}>
              Encuentra tu próxima propiedad antes que nadie
            </h2>
            <p className="text-muted mb-4" style={{ fontSize: '14px', lineHeight: '1.5' }}>
              Suscríbete y recibe nuevas propiedades, oportunidades destacadas y recomendaciones según tus intereses.
            </p>

            {success ? (
              <div className="alert alert-success py-3 text-center" role="alert">
                ¡Gracias por suscribirte! Te hemos enviado un correo de confirmación.
              </div>
            ) : (
              <Form onSubmit={handleSubscribe}>
                <Form.Group className="mb-3 position-relative">
                  <div className="position-absolute top-50 translate-middle-y ms-3 text-muted">
                    <i className="fa-regular fa-envelope"></i>
                  </div>
                  <Form.Control
                    type="email"
                    placeholder="Tu correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ paddingLeft: '42px', minHeight: '48px', fontSize: '15px', borderRadius: '8px', border: '1px solid #ced4da' }}
                  />
                </Form.Group>

                {error && <div className="text-danger small mb-3">{error}</div>}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-100 text-white fw-bold py-3 mb-3 border-0 d-flex justify-content-center align-items-center gap-2"
                  style={{ backgroundColor: '#181f26', borderRadius: '8px', fontSize: '15px' }}
                >
                  {loading ? 'Procesando...' : <>Quiero recibir novedades <i className="fa-solid fa-arrow-right"></i></>}
                </Button>
              </Form>
            )}

            <div className="text-muted text-center mb-3" style={{ fontSize: '12px' }}>
              <i className="fa-solid fa-lock me-1"></i> Sin spam. Puedes cancelar tu suscripción cuando quieras.
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleClose}
                className="border-0 bg-transparent text-muted text-decoration-underline p-0"
                style={{ fontSize: '13px', cursor: 'pointer' }}
              >
                No, gracias
              </button>
            </div>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
};

export default SubscriptionPopup;
