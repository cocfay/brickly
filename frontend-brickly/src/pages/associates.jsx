import { useState, useEffect } from 'react';
import { Container, Button, Row, Col, Card, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import banner from './../assets/images/imagenes_de_fondo/banner_asociados.webp'
import banner_movil from './../assets/images/imagenes_de_fondo/banner_asociados_movil.webp'
import diamond from './../assets/images/iconos/diamond.png';
import gpi from './../assets/images/iconos/gpi.png';
import d from './../assets/images/iconos/desar.png'
import a from './../assets/images/iconos/agen_imo.png'
import  './../assets/css/asociados.css'

import { FormattedMessage } from 'react-intl';
import { useT } from '../hooks/useT';
import { getAgenciesWithProperties } from '../services/listUsers';
import { getAgencyProfilePath } from '../utils/profileRoutes';
import SEO from '../components/SEO';

const ITEMS_PER_PAGE = 21;

function Associates() {
  const t = useT();
  const sortSelectId = 'associates-sort-order';
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('Todos');
  const [orden, setOrden] = useState('destacadas');

  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getAgenciesWithProperties();
      setAgencies(data);
      setLoading(false);
    };
    load();
  }, []);

  // Usar totalPublished de /properties/count/total/{agencyId} como fuente principal.
  // Fallbacks mantienen compatibilidad si alguna respuesta no trae el nuevo campo.
  const getPropCount = (agency) => {
    return Number(
      agency?.totalPublished ??
      agency?.propCount ??
      (Array.isArray(agency?.propertiesPublished) ? agency.propertiesPublished.length : 0)
    );
  };

  // Filtrar y ordenar
  const filtered = agencies
    .filter(a => {
      if (filtro === 'Todos') return true;
      if (filtro === 'Agencias') return true; // por ahora solo hay agencias
      return true;
    })
    .sort((a, b) => {
      const aPropCount = getPropCount(a);
      const bPropCount = getPropCount(b);

      // Destacadas: primero las que tienen featured_user = true, luego por cantidad de propiedades descendente
      if (orden === 'destacadas') {
        if (a.featured_user && !b.featured_user) return -1;
        if (!a.featured_user && b.featured_user) return 1;
        return bPropCount - aPropCount;
      }
      // Más propiedades
      if (orden === 'mas') {
        return bPropCount - aPropCount;
      }
      // Menos propiedades
      if (orden === 'menos') {
        return aPropCount - bPropCount;
      }
      // A-Z / Z-A
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return orden === 'az' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });


  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  return (
    <>
      <SEO title="Asociados Inmobiliarios" description="Descubre las agencias y desarrolladoras inmobiliarias asociadas a Brickly Homes. Encuentra la mejor opción para tu propiedad." />
      <div className="position-relative">
          <img src={banner} alt="banner" className='w-100 object-fit-cover d-none d-lg-block' style={{ height: '50vh' }} loading="lazy" />
          <img src={banner_movil} alt="banner" className='w-100 object-fit-cover d-block d-lg-none' style={{ height: '45vh' }} loading="lazy" />
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center ">
              <Container className='text-white lh-sm'>
                  <div className='mt-3 mt-lg-0 lh-1 mb-3 mb-lg-1' style={{ fontSize: 'clamp(40px, 6.5vw, 86px)', fontFamily: 'AppleGaramond' }}><FormattedMessage id='associate.text1' /></div>
                  <div className='fw-light' style={{ fontSize: 'clamp(16px, 3vw, 30px)' }}><FormattedMessage id='associate.text2' values={{br: () => <br />}} /></div>
                  <Link to="/precios" style={{ fontSize: 'clamp(16px, 3vw, 20px)', width: 'fit-content'}} className='mt-4 d-block bg-black rounded-0 border-light px-4 py-2 text-white'><FormattedMessage id='associate.text3' /></Link>
              </Container>
          </div>
      </div>
      <Container style={{ marginTop: 'clamp(2rem, 3vw, 4rem)', marginBottom: 'clamp(2rem, 5vw, 5rem)' }}>

        <div className='d-flex d-lg-none gap-3 gap-lg-5 justify-content-center align-items-stretch flex-wrap'>
            <Button
              variant="light"
              className={`border-dark ${filtro === 'Todos' ? 'bg-dark text-white' : ''}`}
              style={{ minWidth: 'clamp(146px, 3vw, 231.30px)', fontSize: 'clamp(12px, 3vw, 16px)' }}
              onClick={() => { setFiltro('Todos'); setVisibleCount(ITEMS_PER_PAGE); }}
            >
              <FormattedMessage id='associate.text4' />
            </Button>
            <Button
              variant="light"
              className={`d-flex align-items-center justify-content-center gap-3 border-dark ${filtro === 'Desarrolladoras' ? 'bg-dark text-white' : ''}`}
              style={{ minWidth: 'clamp(146px, 3vw, 231.30px)', fontSize: 'clamp(12px, 3vw, 16px)' }}
              onClick={() => { setFiltro('Desarrolladoras'); setVisibleCount(ITEMS_PER_PAGE); }}
            >
              <img src={d} alt="icons" style={{ width: '35px', fontSize: 'clamp(12px, 3vw, 16px)' }} className='d-none d-md-flex' />
              <FormattedMessage id='associate.text5' />
            </Button>
            <Button
              variant="light"
              className={`d-flex align-items-center justify-content-center gap-3 border-dark ${filtro === 'Agencias' ? 'bg-dark text-white' : ''}`}
              style={{ minWidth: 'clamp(146px, 3vw, 231.30px)', fontSize: 'clamp(12px, 3vw, 16px)' }}
              onClick={() => { setFiltro('Agencias'); setVisibleCount(ITEMS_PER_PAGE); }}
            >
              <img src={a} alt="icons" style={{ width: '35px' }} className='d-none d-md-flex' />
              <FormattedMessage id='associate.text6' />
            </Button>
        </div>

        <div className='d-none d-lg-flex justify-content-between mx-auto align-items-stretch border-bottom border-dark navAssociates' style={{ fontSize: 'clamp(16px, 3vw, 20px)', width: 'min(800px, 100%)' }}>
            <div
              className={`d-flex align-items-center justify-content-center gap-3 px-4 ${filtro === 'Todos' ? 'active' : ''}`}
              style={{ minHeight: '43px', cursor: 'pointer' }}
              onClick={() => { setFiltro('Todos'); setVisibleCount(ITEMS_PER_PAGE); }}
            >
              <FormattedMessage id='associate.text4' />
            </div>
            <div
              className={`d-flex align-items-center justify-content-center gap-3 px-4 ${filtro === 'Desarrolladoras' ? 'active' : ''}`}
              style={{ minHeight: '43px', cursor: 'pointer' }}
              onClick={() => { setFiltro('Desarrolladoras'); setVisibleCount(ITEMS_PER_PAGE); }}
            >
              <img src={d} alt="icons" style={{ width: '35px' }} className='d-none d-md-flex' />
              <FormattedMessage id='associate.text5' />
            </div>
            <div
              className={`d-flex align-items-center justify-content-center gap-3 px-4 ${filtro === 'Agencias' ? 'active' : ''}`}
              style={{ minHeight: '43px', cursor: 'pointer' }}
              onClick={() => { setFiltro('Agencias'); setVisibleCount(ITEMS_PER_PAGE); }}
            >
              <img src={a} alt="icons" style={{ width: '35px' }} className='d-none d-md-flex' />
              <FormattedMessage id='associate.text6' />
            </div>
        </div>


        <div className="d-flex justify-content-lg-end flex-column flex-lg-row gap-4 align-items-center mt-4 mt-lg-5">
            <div className='d-flex gap-3 align-items-baseline'>
                <label htmlFor={sortSelectId}><FormattedMessage id='agent.text10' />:</label>
                <select
                  name="sortOrder"
                  id={sortSelectId}
                  className='p-1 border-0 rounded-1'
                  style={{ colorScheme: 'auto', backgroundColor: '#e9e9e9', color: 'black' }}
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                >
                  <option value="destacadas"><FormattedMessage id='associate.sortFeatured' defaultMessage="Destacadas" /></option>
                  <option value="mas"><FormattedMessage id='associate.sortMore' defaultMessage="Más propiedades" /></option>
                  <option value="menos"><FormattedMessage id='associate.sortLess' defaultMessage="Menos propiedades" /></option>
                  <option value="az"><FormattedMessage id='associate.sortAZ' defaultMessage="Nombre: A-Z" /></option>
                  <option value="za"><FormattedMessage id='associate.sortZA' defaultMessage="Nombre: Z-A" /></option>
                </select>

            </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="dark" />
            <p className="mt-3 text-muted"><FormattedMessage id='associate.loading' defaultMessage="Cargando..." /></p>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-5">
            <p className="text-muted" style={{ fontSize: 'clamp(16px, 3vw, 20px)' }}>
              <FormattedMessage id='associate.noResults' defaultMessage="No hay asociados disponibles" />
            </p>
          </div>
        ) : (
          <Row className='gy-5 justify-content-start mt-2'>
            {visible.map(agency => (
              <Col xl={4} md={6} key={agency._id} className=''>
                <Link to={getAgencyProfilePath(agency)} className="text-decoration-none text-dark">
                  <Card className='rounded-1 h-100' style={{ cursor: 'pointer' }}>
                      <div className="position-relative">
                        <Card.Img
                          variant="top"
                          src={agency.avatarUrl || ag1}
                          className='object-fit-cover border'
                          style={{ height: '380px' }}
                        />
                        <div className="position-absolute top-0 start-0 w-100 h-100" style={{ padding: '5%' }}>
                          <div className="d-flex align-items-baseline gap-2">
                            {agency.featured_user ? (
                                <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', padding: '3px 10px', fontSize: '14px' }}>
                                    <img src={diamond} style={{ width: '14px' }} alt="" /> Destacado
                                </div>
                            ) : null}
                            {agency.agentInfo?.verified == true ? (
                                <div className="d-flex align-items-center gap-2 py-1 px-2 rounded-4" style={{ background: '#193968', color: '#fff', width: 'fit-content', fontSize: '14px', padding: '3px 10px'}}><img src={gpi} style={{ width: '28px' }} alt="GPI" /> <div style={{ width: '0.1px', minHeight: '20px', backgroundColor: '#fff' }}></div> Verificado</div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <Card.Body className='mt-3 pb-4'>
                          <Card.Title className='d-flex align-items-center flex-column gap-1'>
                              <div style={{ fontSize: 'clamp(24px, 3.5vw, 34px)'}}>{agency.name}</div>
                          </Card.Title>
                          <Card.Text style={{ fontSize: 'clamp(16px, 3.5vw, 20px)'}}>
                            <span className='text-muted mb-1 d-flex align-items-baseline gap-2 justify-content-center'>
                              <i className="fa-sharp fa-light fa-house"></i> {getPropCount(agency)} {getPropCount(agency) === 1 ? t('Propiedad disponible', 'Available property') : t('Propiedades disponibles', 'Available properties')}
                            </span>
                            {/* <div className='text-muted text-center mb-1'>{agency.clickCounter} Visualizaciones</div> */}
                          </Card.Text>
                          <div className="d-flex justify-content-center mt-5">
                              <span className='bg-dark border-0 rounded-1 px-4 text-white py-2 d-inline-block'>
                                <FormattedMessage id='agent.text12' />
                              </span>
                          </div>
                      </Card.Body>
                  </Card>
                </Link>
              </Col>
            ))}
            {hasMore && (
              <Col xs={12} className='d-flex justify-content-center'>
                <Button
                  variant='transparent'
                  style={{ fontSize: 'clamp(16px, 3.5vw, 20px)'}}
                  className='border border-1 border-dark rounded-0 px-4 py-1 d-flex align-items-baseline gap-2'
                  onClick={handleLoadMore}
                >
                  <FormattedMessage id='associate.text9' /> <i className="fa-solid fa-angle-right"></i>
                </Button>
              </Col>
            )}
          </Row>
        )}

      </Container>
    </>
  );
}

export default Associates;
