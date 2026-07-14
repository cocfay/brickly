import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import AOS from 'aos';
import 'aos/dist/aos.css';

import { Container, Nav, Row, Col, Alert } from 'react-bootstrap';
import '../assets/css/precios.css';
import { useT } from '../hooks/useT';
import { isAuthenticated, getFullUser } from '../services/authService';
import { subscribeToPlan } from '../services/recurrenteService';


function Precios() {

  const t = useT()

  const [periodo, setPeriodo] = useState('mensual');
  const [renderPeri, setrenderPeri] = useState('')
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Plan actualmente activo del usuario (si tiene sesión iniciada y su
  // suscripción está ACTIVE). Se recalcula en cada render porque
  // getFullUser() lee de sessionStorage/cookie.
  const currentUser = getFullUser();
  const currentPlan = currentUser?.subscriptionStatus === 'ACTIVE'
    ? currentUser?.subscriptionPlan
    : null;

  useEffect(() => {
    if (periodo === 'mensual') {
      setrenderPeri(t('Mensual', 'Monthly'));
    } else if (periodo === 'anual') {
      setrenderPeri(t('Anual', 'Annual'));
    }
  }, [periodo]);

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 100,
    });
  }, []);

  const handleContratar = async (plan) => {
    // Sin sesión iniciada -> redirigir a login
    if (!isAuthenticated()) {
      window.location.href = import.meta.env.PROD ? '/login' : '/frontend-brickly/login';
      return;
    }

    // Ya tiene este plan activo -> no hacer nada (el botón ya está deshabilitado)
    if (plan === currentPlan) return;

    setErrorMsg('');
    setLoadingPlan(plan);
    try {
      const { checkout_url } = await subscribeToPlan(plan);
      if (checkout_url) {
        window.location.href = checkout_url;
      } else {
        setErrorMsg('No se pudo generar el enlace de pago. Intenta de nuevo.');
        setLoadingPlan(null);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar la suscripción. Intenta de nuevo.');
      setLoadingPlan(null);
    }
  };

  // Botón reutilizable: maneja los 3 estados -> normal / cargando / adquirido actualmente
  const PlanButton = ({ plan }) => {
    const isCurrent = plan === currentPlan;
    const isLoading = loadingPlan === plan;

    return (
      <button
        className={`btn w-100 py-2 rounded-0 fs-5 ${isCurrent ? 'bg-secondary text-white' : 'bg-dark text-white'}`}
        onClick={() => handleContratar(plan)}
        disabled={isCurrent || isLoading}
      >
        {isCurrent ? (
          'ADQUIRIDO ACTUALMENTE'
        ) : isLoading ? (
          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        ) : (
          <FormattedMessage id='price.text24' />
        )}
      </button>
    );
  };

  return (
    <Container>

        <div className="mt-4" style={{ fontSize: 'clamp(30px, 3vw, 50px)', marginBottom: 'clamp(2.8rem, 4vw, 4rem)' }}>
          <FormattedMessage id='price.text1' />
        </div>

        {errorMsg && (
          <Alert variant="danger" onClose={() => setErrorMsg('')} dismissible>
            {errorMsg}
          </Alert>
        )}

       <Nav activeKey={periodo} onSelect={(selectedKey) => setPeriodo(selectedKey)} className="mb-4 m-auto prices-nav py-0">
        <Nav.Item>
          <Nav.Link onClick={() => {setPeriodo('mensual') }} className={periodo == 'mensual' ? 'active py-2' : ''} /* eventKey={t('mensual', 'monthly')} */><FormattedMessage id='price.text2' /></Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link onClick={() => {setPeriodo('anual')}} className={periodo == 'anual' ? 'active py-2' : ''} /* eventKey={t('anual', 'annual')} */><FormattedMessage id='price.text3' /></Nav.Link>
        </Nav.Item>
      </Nav>

      <Row className='gy-4 gy-lg-5 card-price justify-content-center' style={{ marginTop: '2rem' }}>
        {periodo === 'mensual' ? (
          <>
            <Col md={6} xxl={3}>
              <div className='border border-1 h-100 d-flex flex-column'>
                <div className='bg-dark text-white text-center py-1' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #F29500', fontSize: 'clamp(36px, 3vw, 40px)' }}>AGENTE INDIVIDUAL</div>
                <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
                  <div className="d-flex flex-column align-items-center">
                    <div className="d-flex flex-column align-items-center">
                      <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '22px', paddingTop: '6px' }}>GTQ </span>420</span>
                      <span className='text-muted' style={{ fontSize: '16px' }}>{ renderPeri }</span>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#F29500' }}></i><div><strong>Panel de control:</strong> Gestiona todas tus propiedades y mira cuántas visitas tienen.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#F29500' }}></i><div><strong>Leads calificados:</strong> Recibe avisos de clientes con interés real a tu WhatsApp y correo electrónico.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#F29500' }}></i><div><strong>Tu perfil profesional:</strong> Incluye tu foto, especialidad y portafolio de ventas.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#F29500' }}></i><div><strong>Métricas:</strong> Reportes detallados de rendimiento por propiedad y comparativas de efectividad individual.</div></div>
                  </div>
                  <div className='mt-5 mb-2'>
                    <PlanButton plan='TEST_DAILY' />
                  </div>
                </div>
              </div>
            </Col>
            <Col md={6} xxl={3}>
              <div className='border border-1 h-100 d-flex flex-column'>
                <div className='bg-dark text-white text-center py-1' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #005051', fontSize: 'clamp(36px, 3vw, 40px)' }}>AGENCIA SILVER</div>
                <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
                  <div className="d-flex flex-column align-items-center">
                    <div className="d-flex flex-column align-items-center">
                      <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '22px', paddingTop: '6px' }}>GTQ </span>420</span>
                      <span className='text-muted' style={{ fontSize: '16px' }}>{ renderPeri }</span>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Equipo bajo control:</strong> Incluye 1 punto de contacto centralizado para que manejes a todo tu equipo.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Reparto de leads:</strong> Recibe todos los prospectos y asígnalos por zona o presupuesto.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Marca de agencia:</strong> Perfil corporativo premium para que tu agencia resalte.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Gestión de propiedades:</strong> Administra y da seguimiento a todo tu portafolio desde un solo lugar.</div></div>
                  </div>
                  <div className='mt-5 mb-2'>
                    <PlanButton plan='AGENCIA_SILVER' />
                  </div>
                </div>
              </div>
            </Col>
            <Col md={6} xxl={3}>
              <div className='border border-1 h-100 d-flex flex-column'>
                <div className='bg-dark text-white text-center py-1' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #005051', fontSize: 'clamp(36px, 3vw, 40px)' }}>AGENCIA GOLD</div>
                <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
                  <div className="d-flex flex-column align-items-center">
                    <div className="d-flex flex-column align-items-center">
                      <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '22px', paddingTop: '6px' }}>GTQ </span>650</span>
                      <span className='text-muted' style={{ fontSize: '16px' }}>{ renderPeri }</span>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Equipo bajo control:</strong> Incluye 5 perfiles de brokers para que manejes a todo tu equipo.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Reparto de leads:</strong> Recibe todos los prospectos y asígnalos por zona o presupuesto.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Marca de agencia:</strong> Perfil corporativo premium para que tu agencia resalte.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Visibilidad del equipo:</strong> Consulta el estado, desempeño y actividad de todos los brokers desde tu panel de administración.</div></div>
                  </div>
                  <div className='mt-5 mb-2'>
                    <PlanButton plan='AGENCIA_GOLD' />
                  </div>
                </div>
              </div>
            </Col>
            <Col md={6} xxl={3}>
              <div className='border border-1 h-100 d-flex flex-column'>
                <div className='bg-dark text-white text-center py-1' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #005051', fontSize: 'clamp(36px, 3vw, 40px)' }}>AGENCIA DIAMOND</div>
                <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
                  <div className="d-flex flex-column align-items-center">
                    <div className="d-flex flex-column align-items-center">
                      <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '22px', paddingTop: '6px' }}>GTQ </span>1050</span>
                      <span className='text-muted' style={{ fontSize: '16px' }}>{ renderPeri }</span>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Equipo bajo control:</strong> Incluye 10 perfiles de brokers para que manejes a todo tu equipo.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Reparto de leads:</strong> Recibe todos los prospectos y asígnalos por zona o presupuesto.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Marca de agencia:</strong> Perfil corporativo premium para que tu agencia resalte.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Visibilidad del equipo:</strong> Consulta el estado, desempeño y actividad de todos los brokers desde tu panel de administración.</div></div>
                  </div>
                  <div className='mt-5 mb-2'>
                    <PlanButton plan='AGENCIA_DIAMOND' />
                  </div>
                </div>
              </div>
            </Col>
          </>
        ) : (
          <>
            <Col md={6} xxl={3}>
              <div className='border border-1 h-100 d-flex flex-column'>
                <div className='bg-dark text-white text-center py-1' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #F29500', fontSize: 'clamp(36px, 3vw, 40px)' }}>AGENTE INDIVIDUAL</div>
                <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
                  <div className="d-flex flex-column align-items-center">
                    <div className="d-flex flex-column align-items-center">
                      <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '22px', paddingTop: '6px' }}>GTQ </span>4200</span>
                      <span className='text-muted' style={{ fontSize: '16px' }}>{ renderPeri }</span>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#F29500' }}></i><div><strong>Panel de control:</strong> Gestiona todas tus propiedades y mira cuántas visitas tienen.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#F29500' }}></i><div><strong>Leads calificados:</strong> Recibe avisos de clientes con interés real a tu WhatsApp y correo electrónico.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#F29500' }}></i><div><strong>Tu perfil profesional:</strong> Incluye tu foto, especialidad y portafolio de ventas.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#F29500' }}></i><div><strong>Métricas:</strong> Reportes detallados de rendimiento por propiedad y comparativas de efectividad individual.</div></div>
                  </div>
                  <div className='mt-5 mb-2'>
                    <PlanButton plan='BROKER_ANUAL' />
                  </div>
                </div>
              </div>
            </Col>
            <Col md={6} xxl={3}>
              <div className='border border-1 h-100 d-flex flex-column'>
                <div className='bg-dark text-white text-center py-1' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #005051', fontSize: 'clamp(36px, 3vw, 40px)' }}>AGENCIA SILVER</div>
                <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
                  <div className="d-flex flex-column align-items-center">
                    <div className="d-flex flex-column align-items-center">
                      <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '22px', paddingTop: '6px' }}>GTQ </span>4200</span>
                      <span className='text-muted' style={{ fontSize: '16px' }}>{ renderPeri }</span>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Equipo bajo control:</strong> Incluye 1 punto de contacto centralizado para que manejes a todo tu equipo.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Reparto de leads:</strong> Recibe todos los prospectos y asígnalos por zona o presupuesto.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Marca de agencia:</strong> Perfil corporativo premium para que tu agencia resalte.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Gestión de propiedades:</strong> Administra y da seguimiento a todo tu portafolio desde un solo lugar.</div></div>
                  </div>
                  <div className='mt-5 mb-2'>
                    <PlanButton plan='AGENCIA_SILVER_A' />
                  </div>
                </div>
              </div>
            </Col>
            <Col md={6} xxl={3}>
              <div className='border border-1 h-100 d-flex flex-column'>
                <div className='bg-dark text-white text-center py-1' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #005051', fontSize: 'clamp(36px, 3vw, 40px)' }}>AGENCIA GOLD</div>
                <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
                  <div className="d-flex flex-column align-items-center">
                    <div className="d-flex flex-column align-items-center">
                      <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '22px', paddingTop: '6px' }}>GTQ </span>6500</span>
                      <span className='text-muted' style={{ fontSize: '16px' }}>{ renderPeri }</span>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Equipo bajo control:</strong> Incluye 5 perfiles de brokers para que manejes a todo tu equipo.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Reparto de leads:</strong> Recibe todos los prospectos y asígnalos por zona o presupuesto.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Marca de agencia:</strong> Perfil corporativo premium para que tu agencia resalte.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Visibilidad del equipo:</strong> Consulta el estado, desempeño y actividad de todos los brokers desde tu panel de administración.</div></div>
                  </div>
                  <div className='mt-5 mb-2'>
                    <PlanButton plan='AGENCIA_GOLD_A' />
                  </div>
                </div>
              </div>
            </Col>
            <Col md={6} xxl={3}>
              <div className='border border-1 h-100 d-flex flex-column'>
                <div className='bg-dark text-white text-center py-1' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #005051', fontSize: 'clamp(36px, 3vw, 40px)' }}>AGENCIA DIAMOND</div>
                <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
                  <div className="d-flex flex-column align-items-center">
                    <div className="d-flex flex-column align-items-center">
                      <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '22px', paddingTop: '6px' }}>GTQ </span>10500</span>
                      <span className='text-muted' style={{ fontSize: '16px' }}>{ renderPeri }</span>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Equipo bajo control:</strong> Incluye 10 perfiles de brokers para que manejes a todo tu equipo.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Reparto de leads:</strong> Recibe todos los prospectos y asígnalos por zona o presupuesto.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Marca de agencia:</strong> Perfil corporativo premium para que tu agencia resalte.</div></div>
                    <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><strong>Visibilidad del equipo:</strong> Consulta el estado, desempeño y actividad de todos los brokers desde tu panel de administración.</div></div>
                  </div>
                  <div className='mt-5 mb-2'>
                    <PlanButton plan='AGENCIA_DIAMOND_A' />
                  </div>
                </div>
              </div>
            </Col>
          </>
        )}
      </Row>

      <div style={{ marginTop: 'clamp(5rem, 10vw, 9rem)', marginBottom: 'clamp(5rem, 10vw, 9rem)'}}>
        <div style={{ fontSize: 'clamp(30px, 3vw, 50px)', marginBottom: 'clamp(3rem, 6vw, 7rem)' }}><FormattedMessage id='price.text25' /></div>
        <Row className='gy-4 gy-lg-5 overflow-hidden'>
          <Col md={6} className='fw-bold fs-4' data-aos="fade-right"><FormattedMessage id='price.text26' /></Col>
          <Col md={6} data-aos="fade-left"><FormattedMessage id='price.text27' /></Col>
          <Col xs={12}><hr /></Col>
          <Col md={6} className='fw-bold fs-4' data-aos="fade-right"><FormattedMessage id='price.text28' /></Col>
          <Col md={6} data-aos="fade-left"><FormattedMessage id='price.text29' /></Col>
          <Col xs={12}><hr /></Col>
          <Col md={6} className='fw-bold fs-4' data-aos="fade-right"><FormattedMessage id='price.text30' /></Col>
          <Col md={6} data-aos="fade-left"><FormattedMessage id='price.text31' /></Col>
          <Col xs={12}><hr /></Col>
          <Col md={6} className='fw-bold fs-4' data-aos="fade-right"><FormattedMessage id='price.text32' /></Col>
          <Col md={6} data-aos="fade-left"><FormattedMessage id='price.text33' /></Col>
          <Col xs={12}><hr /></Col>
          <Col md={6} className='fw-bold fs-4' data-aos="fade-right"><FormattedMessage id='price.text34' /></Col>
          <Col md={6} data-aos="fade-left"><FormattedMessage id='price.text35' /></Col>
        </Row>
      </div>
    </Container>
  );
}

export default Precios;
