import { useEffect, useState } from 'react';
import { Container, Row, Col, Button, Form, Card, Accordion } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import banner from './../../assets/images/imagenes_de_fondo/banner_agentes.webp'
import banner_movil from './../../assets/images/imagenes_de_fondo/banner_agentes_movil.webp'
import gpi from './../../assets/images/iconos/gpi.png';
import diamond from '../../assets/images/iconos/diamond.png';
import nPhoto from '../../assets/images/logos/notPhoto.png';
import './../../assets/css/asesores.css'

import { FormattedMessage, useIntl } from 'react-intl';
import { API_URL } from '../../services/authService';
import { getLogoUrl } from '../../services/logoService';
import StarRating from '../../components/StarRating';
import SEO from '../../components/SEO';
import { fetchAllPages } from '../../utils/fetchAll';
import { useT } from '../../hooks/useT';
import { getAgentProfilePath } from '../../utils/profileRoutes';

function About() {
  const intl = useIntl();
  const fieldIds = {
    search: 'agents-search',
    specMobile: 'agents-filter-spec-mobile',
    deptMobile: 'agents-filter-dept-mobile',
    modeMobile: 'agents-filter-mode-mobile',
    expeMobile: 'agents-filter-expe-mobile',
    specDesktop: 'agents-filter-spec-desktop',
    deptDesktop: 'agents-filter-dept-desktop',
    modeDesktop: 'agents-filter-mode-desktop',
    expeDesktop: 'agents-filter-expe-desktop',
    sort: 'agents-sort-order',
  };

  // ── Datos de la API ──────────────────────────────────────────────
  const [agents, setAgents] = useState([]);       // todos los agentes
  const [filtered, setFiltered] = useState([]);   // resultado tras aplicar filtros
  const [agentProperties, setAgentProperties] = useState([]); // propiedades publicadas relacionadas a los agentes
  const [loading, setLoading] = useState(true);

  // ── Paginación ───────────────────────────────────────────────────
  const [visibleCount, setVisibleCount] = useState(21);
  const itemsPerPage = 21;

  // ── Conteo de propiedades por agente ──────────────────────────────
  const [propCounts, setPropCounts] = useState({});

  // ── Filtros ──────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterSpec, setFilterSpec] = useState('');
  const [filterExpe, setFilterExpe] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [sortOrder, setSortOrder] = useState('featured');

  // ── Opciones para los selects (departamentos) ─────────────────────
  const [departamentos, setDepartamentos] = useState([]);

  const url = API_URL;
  const t = useT();

  const getId = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return value._id || value.id || null;
    return String(value);
  };

  const getPropertyAgentIds = (property) => {
    const ids = [getId(property?.userId), getId(property?.agentId)];

    if (Array.isArray(property?.agents)) {
      property.agents.forEach(agent => ids.push(getId(agent)));
    }

    return ids.filter(Boolean);
  };

  const sameText = (a, b) =>
    String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

  // Carga inicial de agentes + departamentos únicos
  useEffect(() => {
    Promise.all([
      fetchAllPages(`${API_URL}/users/list-user?hasProperty=published&roles=agente`),
      fetchAllPages(`${API_URL}/users/list-user?hasProperty=published&roles=agencia`)
    ])
      .then(([agentesArr, agenciasArr]) => {
        const usersMap = {};
        agenciasArr.forEach(u => { usersMap[u._id] = u; });

        const agentes = agentesArr.filter(u =>
          u.isEnabled
        ).map(agent => {
          const agencia = agent.parentId ? usersMap[agent.parentId] : null;

          return {
            ...agent,
            agencia: agencia && agencia.agentInfo ? {
              _id: agencia._id,
              profileSlug: agencia.profileSlug,
              name: agencia.name || 'Sin nombre',
              avatar: getLogoUrl(agencia.agentInfo.logo)
            } : null
          };
        });

        setAgents(agentes);
        setFiltered(agentes);

        // Obtener conteo de propiedades publicadas por agente
        const countPromises = agentes.map(async (agent) => {
          try {
            const res = await fetch(`${API_URL}/properties?agents=${agent._id}&status=published`);
            if (res.ok) {
              const data = await res.json();
              return { id: agent._id, count: Number(data?.total || 0) };
            }
          } catch {}
          return { id: agent._id, count: 0 };
        });
        Promise.all(countPromises).then(counts => {
          const countsMap = counts.reduce((acc, c) => { acc[c.id] = c.count; return acc; }, {});
          setPropCounts(countsMap);
        });

        // Obtener propiedades publicadas relacionadas a estos agentes para filtros por información de propiedad
        const agentIds = agentes.map(a => a._id).filter(Boolean);
        if (agentIds.length > 0) {
          const agentsParam = agentIds.map(id => `agents=${encodeURIComponent(id)}`).join('&');
          fetchAllPages(`${API_URL}/properties?${agentsParam}&status=published`)
            .then(props => {
              const properties = Array.isArray(props) ? props : [];
              setAgentProperties(properties);

              const depts = [...new Set(
                properties
                  .map(p => p.location?.department)
                  .filter(d => d && d.toLowerCase() !== 'ninguno')
              )].sort();
              setDepartamentos(depts);
            })
            .catch(() => {});
        }
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  // Efecto único que aplica TODOS los filtros (API y locales)
  useEffect(() => {
    const applyFilters = async () => {
      let base = agents;

      // Si hay filtro por operación o ubicación, filtramos por propiedades publicadas relacionadas
      if (filterMode || filterDept) {
        const matchedIds = new Set();

        agentProperties.forEach(property => {
          const matchesMode = !filterMode || sameText(property.market?.mode, filterMode);
          const matchesDept = !filterDept || sameText(property.location?.department, filterDept);

          if (matchesMode && matchesDept) {
            getPropertyAgentIds(property).forEach(id => matchedIds.add(id));
          }
        });

        base = agents.filter(a => matchedIds.has(a._id));
      }

      // Aplicar filtros locales sobre la base resultante
      let result = base;

      if (search && search.length >= 3) {
        const q = search.toLowerCase();
        result = result.filter(a =>
          a.name?.toLowerCase().includes(q) ||
          a.agentInfo?.proTitle?.toLowerCase().includes(q) ||
          a.agentInfo?.specialization?.toLowerCase().includes(q)
        );
      }

      if (filterSpec) {
        result = result.filter(a => a.agentInfo?.specialization === filterSpec);
      }

      if (filterExpe) {
        const min = parseInt(filterExpe);
        result = result.filter(a => (a.agentInfo?.expe || 0) >= min);
      }

      // Ordenar
      result = [...result].sort((a, b) => {
        const aFeatured = a.featured_user || 0;
        const bFeatured = b.featured_user || 0;
        const aPropCount = propCounts[a._id] || 0;
        const bPropCount = propCounts[b._id] || 0;

        if (sortOrder === 'featured') {
          if (bFeatured !== aFeatured) return bFeatured - aFeatured;
          return bPropCount - aPropCount;
        }

        let primarySort = 0;
        if (sortOrder === 'rating') {
          primarySort = (b.ratingAverage || 0) - (a.ratingAverage || 0);
        } else if (sortOrder === 'rating_asc') {
          primarySort = (a.ratingAverage || 0) - (b.ratingAverage || 0);
        } else if (sortOrder === 'az') {
          primarySort = (a.name || '').localeCompare(b.name || '');
        } else if (sortOrder === 'za') {
          primarySort = (b.name || '').localeCompare(a.name || '');
        } else if (sortOrder === 'propcount') {
          primarySort = bPropCount - aPropCount;
        }

        if (primarySort !== 0) return primarySort;
        return bFeatured - aFeatured;
      });

      setFiltered(result);
    };

    applyFilters();
  }, [search, filterSpec, filterExpe, filterDept, filterMode, sortOrder, agents, agentProperties]);

  // Resetear contador visible cuando cambian los filtros
  useEffect(() => {
    setVisibleCount(itemsPerPage);
  }, [search, filterSpec, filterExpe, filterDept, filterMode, sortOrder]);

  // Agentes visibles (carga progresiva)
  const visibleAgents = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + itemsPerPage);
  };

  // Especialidades únicas para el select de filtro
  const especializaciones = [...new Set(agents.map(a => a.agentInfo?.specialization).filter(Boolean))];

  return (
    <>
        <SEO title="Agentes Inmobiliarios" description="Encuentra los mejores agentes inmobiliarios en Guatemala. Conecta con profesionales del sector inmobiliario para comprar, vender o alquilar propiedades." />
        <div className="position-relative">
            <img src={banner} alt="banner" className='w-100 object-fit-cover d-none d-lg-block' style={{ height: '50vh'}} />
            <img src={banner_movil} alt="banner" className='w-100 object-fit-cover d-block d-lg-none' style={{ height: '45vh' }} />
            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center ">
                <Container className='text-white lh-sm'>
                    <div className='mt-3 mt-lg-0 lh-1 mb-3' style={{ fontSize: 'clamp(40px, 6.5vw, 95px)', fontFamily: 'AppleGaramond' }}><FormattedMessage id='agent.text1' /></div>
                    <div className='fw-light' style={{ fontSize: 'clamp(16px, 3vw, 28px)' }}><FormattedMessage id='agent.text2' /></div>
                    <div className="mt-4 mt-lg-5">
                        <div className='mb-3 fst-italic' style={{fontSize: 'clamp(16px, 3vw, 22px)' }}><FormattedMessage id='agent.text3' /></div>
                        <div className="position-relative">
                            <label htmlFor={fieldIds.search} className="visually-hidden">{t('Buscar agentes', 'Search agents')}</label>
                            <input id={fieldIds.search} type="text" className='form-control' value={search} onChange={e => setSearch(e.target.value)} style={{ width: 'min(400px, 100%)', paddingLeft: '34px' }} aria-label={t('Buscar agentes', 'Search agents')} />
                            <i className="ms-2 position-absolute top-50 translate-middle-y start-0 fa-solid fa-magnifying-glass text-dark" aria-hidden="true"></i>
                        </div>
                    </div>
                </Container>
            </div>
        </div>
        <Container style={{ marginTop: 'clamp(1rem, 3vw, 4rem)', marginBottom: 'clamp(2rem, 5vw, 5rem)' }} className='section-1'>
            <div className="d-block d-lg-none">
                <Accordion defaultActiveKey="0">
                    <Accordion.Item className='border-0'> 
                        <Accordion.Header>
                            <div style={{ fontSize: 'clamp(20px, 3vw, 28px)'}}>
                                <FormattedMessage id='agent.text4' />
                            </div>
                        </Accordion.Header>
                        <Accordion.Body>
                            <Row className='mt-3 mt-lg-4 gap-3'>
                                <Col lg={3} md={6}>
                                    <label htmlFor={fieldIds.specMobile} className='form-label' style={{ fontSize: 'clamp(16px, 3vw, 20px)'}}><FormattedMessage id='agent.text5' /></label>
                                    <select id={fieldIds.specMobile} className='w-100 form-control border-dark' value={filterSpec} onChange={e => setFilterSpec(e.target.value)}>
                                        <option value="">{t("Seleccione...", "Select...")}</option>
                                        {especializaciones.map(e => (
                                            <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                                        ))}
                                    </select>
                                </Col>
                                <Col lg={3} md={6}>
                                    <label htmlFor={fieldIds.deptMobile} className='form-label' style={{ fontSize: 'clamp(16px, 3vw, 20px)'}}><FormattedMessage id='agent.text7' /></label>
                                    <select id={fieldIds.deptMobile} className='w-100 form-control border-dark' value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                                        <option value="">{t("Seleccione...", "Select...")}</option>
                                        {departamentos.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </Col>
                                <Col lg={3} md={6}>
                                    <label htmlFor={fieldIds.modeMobile} className='form-label' style={{ fontSize: 'clamp(16px, 3vw, 20px)'}}>Por tipo de operación</label>
                                    <select id={fieldIds.modeMobile} className='w-100 form-control border-dark' value={filterMode} onChange={e => setFilterMode(e.target.value)}>
                                        <option value="">{t("Seleccione...", "Select...")}</option>
                                        <option value="Venta">Venta</option>
                                        <option value="Alquiler">Alquiler</option>
                                    </select>
                                </Col>
                                <Col lg={3} md={6}>
                                    <label htmlFor={fieldIds.expeMobile} className='form-label' style={{ fontSize: 'clamp(16px, 3vw, 20px)'}}><FormattedMessage id='agent.text8' /></label>
                                    <select id={fieldIds.expeMobile} className='w-100 form-control border-dark' value={filterExpe} onChange={e => setFilterExpe(e.target.value)}>
                                        <option value="">{t("Seleccione...", "Select...")}</option>
                                        <option value="3">Más de 3 años</option>
                                        <option value="5">Más de 5 años</option>
                                        <option value="8">Más de 8 años</option>
                                        <option value="10">Más de 10 años</option>
                                        <option value="15">Más de 15 años</option>
                                    </select>
                                </Col>
                            </Row>
                        </Accordion.Body>
                    </Accordion.Item>
                </Accordion>
            </div>
            <div className="d-none d-lg-block">
                <div style={{ fontSize: 'clamp(20px, 3vw, 28px)'}}>
                    <FormattedMessage id='agent.text4' />
                </div>
                <Row className='mt-3 mt-lg-4'>
                    <Col lg={3} md={6}>
                        <label htmlFor={fieldIds.specDesktop} className='form-label' style={{ fontSize: 'clamp(16px, 3vw, 20px)'}}><FormattedMessage id='agent.text5' /></label>
                        <select id={fieldIds.specDesktop} className='w-100 form-control border-dark' value={filterSpec} onChange={e => setFilterSpec(e.target.value)}>
                            <option value="">{t("Seleccione...", "Select...")}</option>
                            {especializaciones.map(e => (
                                <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                            ))}
                        </select>
                    </Col>
                    <Col lg={3} md={6}>
                        <label htmlFor={fieldIds.deptDesktop} className='form-label' style={{ fontSize: 'clamp(16px, 3vw, 20px)'}}><FormattedMessage id='agent.text7' /></label>
                        <select id={fieldIds.deptDesktop} className='w-100 form-control border-dark' value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                            <option value="">{t("Seleccione...", "Select...")}</option>
                            {departamentos.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </Col>
                    <Col lg={3} md={6}>
                        <label htmlFor={fieldIds.modeDesktop} className='form-label' style={{ fontSize: 'clamp(16px, 3vw, 20px)'}}>Por tipo de operación</label>
                        <select id={fieldIds.modeDesktop} className='w-100 form-control border-dark' value={filterMode} onChange={e => setFilterMode(e.target.value)}>
                            <option value="">{t("Seleccione...", "Select...")}</option>
                            <option value="Venta">Venta</option>
                            <option value="Alquiler">Alquiler</option>
                        </select>
                    </Col>
                    <Col lg={3} md={6}>
                        <label htmlFor={fieldIds.expeDesktop} className='form-label' style={{ fontSize: 'clamp(16px, 3vw, 20px)'}}><FormattedMessage id='agent.text8' /></label>
                        <select id={fieldIds.expeDesktop} className='w-100 form-control border-dark' value={filterExpe} onChange={e => setFilterExpe(e.target.value)}>
                            <option value="">{t("Seleccione...", "Select...")}</option>
                            <option value="3">{t("Más de 3 años", "More than 3 years")}</option>
                            <option value="5">{t("Más de 5 años", "More than 5 years")}</option>
                            <option value="8">{t("Más de 8 años", "More than 8 years")}</option>
                            <option value="10">{t("Más de 10 años", "More than 10 years")}</option>
                            <option value="15">{t("Más de 15 años", "More than 15 years")}</option>
                        </select>
                    </Col>
                </Row>
            </div>
            <div className="d-flex justify-content-between flex-column flex-lg-row gap-4 align-items-center mt-4">
                <div style={{ fontSize: 'clamp(20px, 3vw, 24px)'}}>{filtered.length} <FormattedMessage id='agent.text9' /></div>
                <div className='d-flex gap-3 align-items-baseline'>
                    <label htmlFor={fieldIds.sort} className="me-2"><FormattedMessage id='agent.text10' />:</label><select name="sortOrder" id={fieldIds.sort} className='p-1 border-0 rounded-1' style={{ colorScheme: 'auto', backgroundColor: '#e9e9e9', color: 'black' }} value={sortOrder} onChange={e => setSortOrder(e.target.value || 'featured')}>
                    <option value="featured">{t("Destacados", "Featured")}</option>
                    <option value="propcount">{t("Más Propiedades", "More Properties")}</option>
                    <option value="rating">{t("Mejores Calificados", "Best Rated")}</option>
                    <option value="rating_asc">{t("Menos Calificados", "Lowest Rated")}</option>
                    <option value="az">A-Z</option>
                    <option value="za">Z-A</option>
                    </select>
                </div>
            </div>

            <Row className='gy-5 gt-2 gb-5 justify-content-start mt-0 mt-lg-1'>
                {loading ? (
                    <Col xs={12} className='text-center py-5'>
                        <div className="spinner-border text-dark"></div>
                    </Col>
                ) : filtered && filtered.length > 0 ? (
                    <>
                    {visibleAgents.map((items, index) => (

                        <Col xl={4} md={6} key={items._id || index}>
                            <Link to={getAgentProfilePath(items)}>
                                <Card className='rounded-1'>
                                    <div className="position-relative">
                                        <Card.Img
                                            variant="top"
                                            src={items.avatar ? url + items.avatar.replace('/uploads', '') : nPhoto}
                                            className='object-fit-cover border'
                                            style={{ height: '380px' }}
                                        />
                                        <div className="position-absolute top-0 start-0 w-100 h-100" style={{ padding: '5%' }}>
                                            <div className="d-flex align-items-baseline gap-2">
                                                {items.featured_user ? (
                                                    <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', padding: '3px 10px', fontSize: '14px' }}>
                                                        <img src={diamond} style={{ width: '14px' }} alt="" /> Destacado
                                                    </div>
                                                ) : null}
                                                {items.agentInfo?.verified == true ? (
                                                    <div className="d-flex align-items-center gap-2 py-1 px-2 rounded-4" style={{ background: '#193968', color: '#fff', width: 'fit-content', fontSize: '14px', padding: '3px 10px'}}><img src={gpi} style={{ width: '28px' }} alt="GPI" /> <div style={{ width: '0.1px', minHeight: '20px', backgroundColor: '#fff' }}></div> Verificado</div>
                                                ) : null}
                                            </div>
                                        </div>
                                        { items?.parentId && items?.agencia && (
                                            <div className="position-absolute top-100 start-0 translate-middle" style={{ marginLeft: '70px', paddingBottom: '40px' }}>
                                                <img src={items.agencia.avatar} alt="logo" className='border bg-light' style={{ width: '80px', height: '80px' }} srcSet="" />
                                            </div>
                                        )}
                                    </div>
                                    <Card.Body className='mt-3 pb-4 d-flex flex-column'>
                                        <Card.Title className='d-flex align-items-center flex-column gap-1'>
                                            <div style={{ fontSize: 'clamp(24px, 3.5vw, 34px)'}}>{items.name}</div>
                                            { items?.parentId && items?.agencia ? (
                                                <div className='text-muted text-uppercase' style={{ fontSize: 'clamp(14px, 3.5vw, 20px)'}}>{items.agencia.name}</div>
                                            ) : (
                                                <div style={{ fontSize: 'clamp(14px, 3.5vw, 20px)', visibility: 'hidden' }}>&nbsp;</div>
                                            )}
                                            <div className="my-1" style={{ fontSize: '16px' }}>
                                                <StarRating rating={items.ratingAverage} size='13px' />
                                            </div>
                                            <div className='text-muted mb-1'>{propCounts[items._id] || 0} Propiedades</div>
                                        </Card.Title>
                                        <div className="d-flex justify-content-center mt-auto pt-4">
                                            <Button className='bg-dark border-0 rounded-1 px-4 text-white py-2'><FormattedMessage id='agent.text12' /></Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Link>
                        </Col>
                    ))
                    }
                    </>
                ) : (
                    <Col xs={12} className='d-flex justify-content-center text-center fs-2'>
                        No hay agentes para mostrar
                    </Col>
                )}
            </Row>
            {hasMore && (
              <div className="d-flex justify-content-center" style={{ marginBottom: 'clamp(3rem, 6vw, 6rem)' }}>
                <button className="link-more-black d-flex align-items-center gap-2" onClick={handleLoadMore} style={{ background: 'none', cursor: 'pointer' }}>
                  {t('Ver más', 'View more')} <i className="fa-solid fa-angle-right"></i>
                </button>
              </div>
            )}
            <div style={{ marginTop: 'clamp(2rem, 6vw, 6rem)' }}>

                <div className='mb-4' style={{ fontSize: 'clamp(24px, 3vw, 40px)' }}><FormattedMessage id='agent.text13' /></div>
                <div className='lh-sm' style={{ fontSize: 'clamp(16px, 3vw, 22px)' }}><FormattedMessage id='agent.text14' /></div>
            </div>

            <Accordion defaultActiveKey="0" className='mt-5 faq-asesores'>
                <Accordion.Item eventKey="0" flush="true" className='py-4'>
                    <Accordion.Header>1. <FormattedMessage id='agent.text15' /></Accordion.Header>
                    <Accordion.Body style={{ fontSize: 'clamp(16px, 3vw, 22px)' }}>
                        <FormattedMessage id='agent.text16' />
                    </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="1" className='py-4'>
                    <Accordion.Header>2. <FormattedMessage id='agent.text17' /></Accordion.Header>
                    <Accordion.Body style={{ fontSize: 'clamp(16px, 3vw, 22px)' }}>
                        <FormattedMessage id='agent.text18' />
                    </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="2" className='py-4'>
                    <Accordion.Header>3. <FormattedMessage id='agent.text19' /></Accordion.Header>
                    <Accordion.Body style={{ fontSize: 'clamp(16px, 3vw, 22px)' }}>
                        <FormattedMessage id='agent.text20' />
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </Container>
    </>
  );
}

export default About;
