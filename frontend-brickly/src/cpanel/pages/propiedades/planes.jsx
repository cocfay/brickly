import { useState, useEffect } from 'react';
import { Container, Nav, Card, Row, Col } from 'react-bootstrap';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { useT } from '../../../hooks/useT';
import arrow from '../../../assets/images/iconos/arrow.png'


function Planes() {

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

  return (
    <Container>
      <div className="mt-4 d-flex justify-content-between">
        <div>
          <div style={{ fontSize: 'clamp(30px, 3vw, 40px)' }}>
          {/* <FormattedMessage id='price.text1' /> */}
          Destaca tus propiedades
          </div>
          <div>Selecciona uno de nuestros paquetes para promocionar tus propiedades en el portal y en nuestras redes sociales.</div>
        </div>
        <Link to="/cpanel/propiedades" title='Atrás'><img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" srcSet="" /></Link>
      </div>

      <Row className='gy-4 card-price' style={{ marginTop: '2rem' }}>
        <Col md={6} xxl={4}>
          <div className='border border-1 h-100 d-flex flex-column rounded-5'>
            <div className='bg-dark text-white text-center py-1 rounded-top-5' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #C1C1C1', fontSize: 'clamp(36px, 3vw, 40px)' }}>{/* <FormattedMessage id='price.text4' /> */}Signature</div>
            <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
              <div className="d-flex flex-column align-items-center">
                <div className="d-flex flex-column align-items-center">
                  <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '26px', paddingTop: '6px' }}>$</span>{/* { periodo == 'mensual' ? '55' : '620' } */} 15</span>
                  <span className='text-muted' style={{ fontSize: '16px' }}>{/* { renderPeri } */} 7 días</span>
                </div>
              </div>
              <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#C1C1C1' }}></i><div>{/* <FormattedMessage values={{ b: (chunks) => <strong>{chunks}</strong>}} id='price.text5' /> */} Etiqueta de "Propiedad Destacada" visible en la publicación.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#C1C1C1' }}></i><div>{/* <FormattedMessage values={{ b: (chunks) => <strong>{chunks}</strong>}} id='price.text6' /> */} Ubicación en el home dentro de la sección de destacados.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#C1C1C1' }}></i><div>{/* <FormattedMessage values={{ b: (chunks) => <strong>{chunks}</strong>}} id='price.text7' /> */} Una historia en redes sociales para promocionar la propiedad.</div></div>
              </div>
              <div className='mt-5 mb-2 mx-auto'>
                <button className='btn py-2 px-5 bg-dark text-white rounded-5 fs-5' style={{ width: '250px' }}>{/* <FormattedMessage id='price.text24' /> */} Adquirir</button>
              </div>
            </div>
          </div>
        </Col>
        <Col md={6} xxl={4}>
          <div className='border border-1 h-100 d-flex flex-column rounded-5'>
            <div className='bg-dark text-white text-center py-1 rounded-top-5' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #B70818', fontSize: 'clamp(36px, 3vw, 40px)' }}>{/* <FormattedMessage id='price.text9' /> */} Prestige</div>
            <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
              <div className="d-flex flex-column align-items-center">
                <div className="d-flex flex-column align-items-center">
                  <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '26px', paddingTop: '6px' }}>$</span>{/* { periodo == 'mensual' ? '75' : '805' } */} 25</span>
                  <span className='text-muted' style={{ fontSize: '16px' }}>{/* { renderPeri } */} 14 días</span>
                </div>
              </div>
              <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#B70818' }}></i><div>{/* <FormattedMessage values={{ b: (chunks) => <strong>{chunks}</strong> }} id='price.text10' /> */} Etiqueta de "Propiedad Destacada" visible en la publicación.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#B70818' }}></i><div>{/* <FormattedMessage values={{ b: (chunks) => <strong>{chunks}</strong> }} id='price.text11' /> */} Ubicacion en el home dentro de la sección de destacados.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#B70818' }}></i><div>{/* <FormattedMessage values={{ b: (chunks) => <strong>{chunks}</strong> }} id='price.text12' /> */} Amplificación en redes sociales.</div></div>
              </div>
              <div className='mt-5 mb-2 mx-auto'>
                <button className='btn py-2 px-5 bg-dark text-white rounded-5 fs-5' style={{ width: '250px' }}>{/* <FormattedMessage id='price.text24' /> */} Adquirir</button>
              </div>
            </div>
          </div>
        </Col>
        <Col md={6} xxl={4}>
          <div className='border border-1 h-100 d-flex flex-column rounded-5'>
            <div className='bg-dark text-white text-center py-1 rounded-top-5' style={{ fontFamily: 'AppleGaramond', borderBottom: '6px solid #008A69', fontSize: 'clamp(36px, 3vw, 40px)' }}>{/* <FormattedMessage id='price.text14' /> */} Private Collection</div>
            <div className='p-4 d-flex flex-column flex-grow-1 mt-2'>
              <div className="d-flex flex-column align-items-center">
                <div className="d-flex flex-column align-items-center">
                  <span className='fw-bold lh-1 d-flex align-items-start' style={{ fontSize: 'clamp(46px, 3vw, 50px)' }}><span className='fw-normal' style={{ fontSize: '26px' , paddingTop: '6px'}}>$</span>{ /* periodo == 'mensual' ? '155' : '1640' */ } 35</span>
                  <span className='text-muted' style={{ fontSize: '16px' }}>{/* { renderPeri } */} 30 días</span>
                </div>
              </div>
              <div className="d-flex flex-column gap-3 mt-4 flex-grow-1" style={{ fontSize: '16px' }}>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#008A69' }}></i><div>{/* <FormattedMessage id='price.text15' values={{b: (chunks) => <strong>{chunks}</strong>}} /> */} Etiqueta de "Propiedad Destacada" visible en la publicacion por 15 dias.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#008A69' }}></i><div>{/* <FormattedMessage id='price.text16' values={{b: (chunks) => <strong>{chunks}</strong>}} /> */} Perfil de agencia en portada por 30 días.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#008A69' }}></i><div>{/* <FormattedMessage id='price.text17' values={{b: (chunks) => <strong>{chunks}</strong>}} /> */} 1 Envío de newsletter dedicado.</div></div>
                <div className='d-flex gap-2 align-items-baseline'><i className="fa-solid fa-check" style={{ color: '#008A69' }}></i><div>{/* <FormattedMessage id='price.text17' values={{b: (chunks) => <strong>{chunks}</strong>}} /> */} 1 Publicación en redes sociales.</div></div>
              </div>
              <div className='mt-5 mb-2 mx-auto'>
                <button className='btn py-2 px-5 bg-dark text-white rounded-5 fs-5' style={{ width: '250px' }}>{/* <FormattedMessage id='price.text24' /> */} Adquirir</button>
              </div>
            </div>
          </div>
        </Col>
      </Row>
      
    </Container>
  );
}

export default Planes;