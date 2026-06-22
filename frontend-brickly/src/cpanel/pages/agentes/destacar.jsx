import { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import arrow from '../../../assets/images/iconos/arrow.png'

function Destacar() {
  const lang = localStorage.getItem('selectedLang')

  return (
    <Container>
      <div className="mt-4 d-flex justify-content-between">
        <div>
          <div style={{ fontSize: 'clamp(30px, 3vw, 40px)' }}>
            Destaca tus agentes
          </div>
          <div>Selecciona uno de nuestros paquetes para promocionar a tus agentes en el portal y en nuestras redes sociales.</div>
        </div>
        <Link to="/cpanel/agentes" title='Atrás'><img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" /></Link>
      </div>

      <Row className='gy-4 card-price' style={{ marginTop: '2rem' }}>
        {/* Paquete Básico */}
        <Col md={6} xxl={4}>
          <div className='border border-1 h-100 d-flex flex-column rounded-5'>
            <div className='bg-dark text-white text-center py-1 rounded-top-5' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #5E7C9C', fontSize: 'clamp(36px, 3vw, 40px)' }}>Agent Signature</div>
            <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
              <div className="d-flex flex-column align-items-center">
                <div className="d-flex flex-column align-items-center">
                  <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '26px', paddingTop: '6px' }}>$</span>25</span>
                  <span className='text-muted' style={{ fontSize: '16px' }}>Al mes</span>
                </div>
              </div>
              <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#5E7C9C' }}></i><div>Perfil de agente destacado en búsquedas.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#5E7C9C' }}></i><div>Badge “Agente Verificado”.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#5E7C9C' }}></i><div>1 Propiedad destacada activa al mes (rotativa o fija).</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#5E7C9C' }}></i><div>Perfil mejorado (bio + branding básico).</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#5E7C9C' }}></i><div>URL propia dentro de Brickly.</div></div>
              </div>
              <div className='mt-5 mb-2 mx-auto'>
                <button className='btn py-2 px-5 bg-dark text-white rounded-5 fs-5' style={{ width: '250px' }}>Adquirir</button>
              </div>
            </div>
          </div>
        </Col>

        {/* Paquete Premium */}
        <Col md={6} xxl={4}>
          <div className='border border-1 h-100 d-flex flex-column rounded-5'>
            <div className='bg-dark text-white text-center py-1 rounded-top-5' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #D4AF37', fontSize: 'clamp(36px, 3vw, 40px)' }}>Agent Prestige</div>
            <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
              <div className="d-flex flex-column align-items-center">
                <div className="d-flex flex-column align-items-center">
                  <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '26px', paddingTop: '6px' }}>$</span>45</span>
                  <span className='text-muted' style={{ fontSize: '16px' }}>Al mes</span>
                </div>
              </div>
              <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#D4AF37' }}></i><div>Perfil de agente destacado en búsquedas.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#D4AF37' }}></i><div>Badge “Agente Verificado”.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#D4AF37' }}></i><div>Hasta 3 propiedades destacadas simultáneamente.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#D4AF37' }}></i><div>Perfil mejorado (bio + branding básico).</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#D4AF37' }}></i><div>Prioridad en resultados de búsqueda.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#D4AF37' }}></i><div>URL propia dentro de Brickly.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#D4AF37' }}></i><div>Recepción prioritaria de leads.</div></div>
              </div>
              <div className='mt-5 mb-2 mx-auto'>
                <button className='btn py-2 px-5 bg-dark text-white rounded-5 fs-5' style={{ width: '250px' }}>Adquirir</button>
              </div>
            </div>
          </div>
        </Col>

        {/* Paquete VIP */}
        <Col md={6} xxl={4}>
          <div className='border border-1 h-100 d-flex flex-column rounded-5'>
            <div className='bg-dark text-white text-center py-1 rounded-top-5' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #3B1E4A', fontSize: 'clamp(36px, 3vw, 40px)' }}>Private Collection Agent</div>
            <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
              <div className="d-flex flex-column align-items-center">
                <div className="d-flex flex-column align-items-center">
                  <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '26px', paddingTop: '6px' }}>$</span>75</span>
                  <span className='text-muted' style={{ fontSize: '16px' }}>Al mes</span>
                </div>
              </div>
              <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>Perfil de agente destacado en búsquedas.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>Badge “Agente Verificado”.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>Hasta 7 propiedades destacadas simultáneamente.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>Perfil mejorado (bio + branding básico).</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>Prioridad en resultados de búsqueda.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>URL propia dentro de Brickly.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>Recepción prioritaria de leads.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>Newsletter dedicado (1 al mes).</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#3B1E4A' }}></i><div>Amplificación en redes sociales.</div></div>
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

export default Destacar;
