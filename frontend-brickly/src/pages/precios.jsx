import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import AOS from 'aos';
import 'aos/dist/aos.css';

import { Container, Nav, Row, Col } from 'react-bootstrap';
import '../assets/css/precios.css';
import { useT } from '../hooks/useT';


function Precios() {

  const t = useT()

  const [periodo, setPeriodo] = useState('mensual');
  const [renderPeri, setrenderPeri] = useState('')

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

  const handleContratar = (plan) => {
    const message = encodeURIComponent('Hola, equipo de Bricky Homes. Me interesa contratar un paquete. ¿Cuál es el proceso?');
    window.open(`https://wa.me/50237649719?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Container>

        <div className="mt-4" style={{ fontSize: 'clamp(30px, 3vw, 50px)', marginBottom: 'clamp(2.8rem, 4vw, 4rem)' }}>
          <FormattedMessage id='price.text1' />
        </div>

       <Nav activeKey={periodo} onSelect={(selectedKey) => setPeriodo(selectedKey)} className="mb-4 m-auto prices-nav py-0">
        <Nav.Item>
          <Nav.Link onClick={() => {setPeriodo('mensual') }} className={periodo == 'mensual' ? 'active py-2' : ''} /* eventKey={t('mensual', 'monthly')} */><FormattedMessage id='price.text2' /></Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link onClick={() => {setPeriodo('anual')}} className={periodo == 'anual' ? 'active py-2' : ''} /* eventKey={t('anual', 'annual')} */><FormattedMessage id='price.text3' /></Nav.Link>
        </Nav.Item>
      </Nav>

      <Row className='gy-4 gy-lg-5 card-price justify-content-center' style={{ marginTop: '2rem' }}>
        {/* <Col md={6} xxl={3}>
          <div className='border border-1 h-100 d-flex flex-column'>
            <div className='bg-dark text-white text-center py-1' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #A38065', fontSize: 'clamp(36px, 3vw, 40px)' }}><FormattedMessage id='price.text4' /></div>
            <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
              <div className="d-flex flex-column align-items-center">
                <div className="d-flex flex-column align-items-center">
                  <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '26px', paddingTop: '6px' }}>$</span>{ periodo == 'mensual' ? '55' : '620' }</span>
                  <span className='text-muted' style={{ fontSize: '16px' }}>{ renderPeri }</span>
                </div>
              </div>
              <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#A38065' }}></i><div><FormattedMessage values={{ b: (chunks) => <strong>{chunks}</strong>}} id='price.text5' /></div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#A38065' }}></i><div><FormattedMessage values={{ b: (chunks) => <strong>{chunks}</strong>}} id='price.text6' /></div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#A38065' }}></i><div><FormattedMessage values={{ b: (chunks) => <strong>{chunks}</strong>}} id='price.text7' /></div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#A38065' }}></i><div><FormattedMessage values={{ b: (chunks) => <strong>{chunks}</strong>}} id='price.text8' /></div></div>
              </div>
              <div className='mt-5 mb-2'>
                <button className='btn w-100 py-2 bg-dark text-white rounded-0 fs-5' onClick={() => handleContratar('ARQUITECTO')}>
                  <FormattedMessage id='price.text24' />
                </button>
              </div>
            </div>
          </div>
        </Col> */}
        <Col md={6} xxl={3}>
          <div className='border border-1 h-100 d-flex flex-column'>
            <div className='bg-dark text-white text-center py-1' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #F29500', fontSize: 'clamp(36px, 3vw, 40px)' }}><FormattedMessage id='price.text9' /></div>
            <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
              <div className="d-flex flex-column align-items-center">
                <div className="d-flex flex-column align-items-center">
                  <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '26px', paddingTop: '6px' }}>$</span>{ periodo == 'mensual' ? '55' : '605' }</span>
                  <span className='text-muted' style={{ fontSize: '16px' }}>{ renderPeri }</span>
                </div>
              </div>
              <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#F29500' }}></i><div><FormattedMessage values={{ b: (chunks) => <strong>{chunks}</strong> }} id='price.text10' /></div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#F29500' }}></i><div><FormattedMessage values={{ b: (chunks) => <strong>{chunks}</strong> }} id='price.text11' /></div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#F29500' }}></i><div><FormattedMessage values={{ b: (chunks) => <strong>{chunks}</strong> }} id='price.text12' /></div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#F29500' }}></i><div><FormattedMessage values={{ b: (chunks) => <strong>{chunks}</strong> }} id='price.text13' /></div></div>
              </div>
              <div className='mt-5 mb-2'>
                <button className='btn w-100 py-2 bg-dark text-white rounded-0 fs-5' onClick={() => handleContratar('INMOBILIARIA')}>
                  <FormattedMessage id='price.text24' />
                </button>
              </div>
            </div>
          </div>
        </Col>
        <Col md={6} xxl={3}>
          <div className='border border-1 h-100 d-flex flex-column'>
            <div className='bg-dark text-white text-center py-1' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #005051', fontSize: 'clamp(36px, 3vw, 40px)' }}><FormattedMessage id='price.text14' /></div>
            <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
              <div className="d-flex flex-column align-items-center">
                <div className="d-flex flex-column align-items-center">
                  <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '26px' , paddingTop: '6px'}}>$</span>{ periodo == 'mensual' ? '90' : '990' }</span>
                  <span className='text-muted' style={{ fontSize: '16px' }}>{ renderPeri }</span>
                </div>
              </div>
              <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><FormattedMessage id='price.text15' values={{b: (chunks) => <strong>{chunks}</strong>}} /></div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><FormattedMessage id='price.text16' values={{b: (chunks) => <strong>{chunks}</strong>}} /></div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><FormattedMessage id='price.text17' values={{b: (chunks) => <strong>{chunks}</strong>}} /></div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#005051' }}></i><div><FormattedMessage id='price.text18' values={{b: (chunks) => <strong>{chunks}</strong>}} /></div></div>
              </div>
              <div className='mt-4 mb-2'>
                <button className='btn w-100 py-2 bg-dark text-white rounded-0 fs-5' onClick={() => handleContratar('AGENTE_BASICO')}>
                  <FormattedMessage id='price.text24' />
                </button>
              </div>
            </div>
          </div>
        </Col>
        {/* <Col md={6} xxl={3}>
          <div className='border border-1 h-100 d-flex flex-column'>
            <div className='bg-dark text-white text-center py-1' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #B65740', fontSize: 'clamp(36px, 3vw, 40px)' }}><FormattedMessage id='price.text19' /></div>
            <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
              <div className="d-flex flex-column align-items-center">
                <div className="d-flex flex-column align-items-center">
                  <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '26px', paddingTop: '6px' }}>$</span>{ periodo == 'mensual' ? '85' : '895' }</span>
                  <span className='text-muted' style={{ fontSize: '16px' }}>{ renderPeri }</span>
                </div>
              </div>
              <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#B65740' }}></i><div><FormattedMessage id='price.text20' values={{ b: (chunks) => <strong>{chunks}</strong> }} /></div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#B65740' }}></i><div><FormattedMessage id='price.text21' values={{ b: (chunks) => <strong>{chunks}</strong> }} /></div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#B65740' }}></i><div><FormattedMessage id='price.text22' values={{ b: (chunks) => <strong>{chunks}</strong> }} /></div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#B65740' }}></i><div><FormattedMessage id='price.text23' values={{ b: (chunks) => <strong>{chunks}</strong> }} /></div></div>
              </div>
              <div className='mt-5 mb-2'>
                <button className='btn w-100 py-2 bg-dark text-white rounded-0 fs-5' onClick={() => handleContratar('AGENCIA')}>
                  <FormattedMessage id='price.text24' />
                </button>
              </div>
            </div>
          </div>
        </Col> */}
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
