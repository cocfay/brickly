import { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import arrow from '../../../assets/images/iconos/arrow.png'

function SubsAgency() {
  const lang = localStorage.getItem('selectedLang')

  return (
    <Container>
      <div className="mt-4 d-flex justify-content-between">
        <div>
          <div style={{ fontSize: 'clamp(30px, 3vw, 40px)' }}>
            Suscripción de agencia
          </div>
          <div>Selecciona uno de nuestros paquetes para promocionar tu agencia en el portal y en nuestras redes sociales.</div>
        </div>
        <Link to="/cpanel" title='Atrás'><img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" /></Link>
      </div>

      <Row className='gy-4 card-price' style={{ marginTop: '2rem' }}>
        {/* Paquete Prestige */}
        <Col md={6} xxl={4}>
          <div className='border border-1 h-100 d-flex flex-column rounded-5'>
            <div className='bg-dark text-white text-center py-1 rounded-top-5' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #D4AF37', fontSize: 'clamp(36px, 3vw, 40px)' }}>Agency Prestige</div>
            <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
              <div className="d-flex flex-column align-items-center">
                <div className="d-flex flex-column align-items-center">
                  <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '26px', paddingTop: '6px' }}>$</span>60</span>
                  <span className='text-muted' style={{ fontSize: '16px' }}>Al mes</span>
                </div>
              </div>
              <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#D4AF37' }}></i><div>Perfil de agencia destacado en búsquedas.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#D4AF37' }}></i><div>Hasta 5 propiedades destacadas simultáneamente (pool compartido).</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#D4AF37' }}></i><div>Prioridad media en resultados.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#D4AF37' }}></i><div>bricklyhomes.com/agencias/Santander.</div></div>
              </div>
              <div className='mt-5 mb-2 mx-auto'>
                <button className='btn py-2 px-5 bg-dark text-white rounded-5 fs-5' style={{ width: '250px' }}>Adquirir</button>
              </div>
            </div>
          </div>
        </Col>

        {/* Paquete Private Collection */}
        <Col md={6} xxl={4}>
          <div className='border border-1 h-100 d-flex flex-column rounded-5'>
            <div className='bg-dark text-white text-center py-1 rounded-top-5' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #3B1E4A', fontSize: 'clamp(36px, 3vw, 40px)' }}>Private Collection Agency</div>
            <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
              <div className="d-flex flex-column align-items-center">
                <div className="d-flex flex-column align-items-center">
                  <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '26px', paddingTop: '6px' }}>$</span>100</span>
                  <span className='text-muted' style={{ fontSize: '16px' }}>Al mes</span>
                </div>
              </div>
              <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>Perfil de agencia destacado en búsquedas.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>Hasta 10 propiedades destacadas simultáneamente.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>bricklyhomes.com/agencias/Santander.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>Perfil en portada (rotación destacada).</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>Newsletter dedicado (1 al mes).</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>Amplificación en redes sociales.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>Badge "Private Collection Agency".</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>Prioridad alta en resultados.</div></div>
              </div>
              <div className='mt-5 mb-2 mx-auto'>
                <button className='btn py-2 px-5 bg-dark text-white rounded-5 fs-5' style={{ width: '250px' }}>Adquirir</button>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default SubsAgency;
