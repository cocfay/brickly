import { useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';

import expe from './../../assets/images/iconos/expe.png'
import house_aval from './../../assets/images/iconos/premio.png'
import lan from './../../assets/images/iconos/lang.png'
import leads from './../../assets/images/iconos/proyectos.png'
import arrow from '../../assets/images/iconos/arrow.png';
import '../../assets/css/arquitectos.css';

import { FormattedMessage } from 'react-intl';
import { API_URL } from '../../services/authService';
import { getLogoUrl } from '../../services/logoService';
import { getProyectosByUser } from '../../cpanel/services/proyectos';
import { getPublicProfile } from '../../services/profileService';
import { useT } from '../../hooks/useT';

function Profilearchitect() {

    const t = useT()

    const pluralize = (count, singular, plural) => count === 1 ? singular : plural

    const { slug, id } = useParams();
    const profileIdentifier = slug || id;
    const [architect, setArchitect] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profileIdentifier) return;
        const load = async () => {
            try {
                const found = await getPublicProfile(profileIdentifier);
                const roles = Array.isArray(found?.roles) ? found.roles : [found?.roles].filter(Boolean);

                if (!found?.isEnabled || !roles.includes('arquitecto')) {
                    setLoading(false);
                    return;
                }
                setArchitect(found);

                // Cargar sus proyectos usando el servicio de proyectos del cpanel
                const projResult = await getProyectosByUser(found._id);
                if (projResult.success) {
                    const list = Array.isArray(projResult.data) ? projResult.data : (projResult.data?.data || []);
                    // Solo mostrar proyectos publicados
                    setProjects(list.filter(p => p.status === 'published'));
                }
            } catch (e) {
                console.error('Error cargando arquitecto:', e);
            }
            setLoading(false);
        };
        load();
    }, [profileIdentifier]);

    // Obtener URL del logo de la firma
    const getLogo = () => {
        if (!architect?.agentInfo?.logo) return null;
        return getLogoUrl(architect.agentInfo.logo);
    };

    const logoUrl = getLogo();

    if (loading) return (
        <Container className="text-center py-5">
            <div className="spinner-border text-primary" />
        </Container>
    );

    if (!architect) return (
        <Container className="text-center py-5">
            <p>Arquitecto no encontrado</p>
            <Link to="/arquitectos">Volver a arquitectos</Link>
        </Container>
    );

  return (
    <Container style={{ marginTop: 'clamp(2rem, 3vw, 4rem)', marginBottom: 'clamp(2rem, 5vw, 5rem)' }}>
        <Link to="/arquitectos" className='d-block my-4 text-end' title='Atrás' aria-label={t('Volver a arquitectos', 'Back to architects')}><img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" srcSet="" /></Link>
        <Row className='g-5 flex-column-reverse flex-lg-row'>
            <Col lg={5}>
                <div style={{ backgroundColor: '#f9f9f9' }}>
                    <img src={API_URL + architect.avatar.replace('/uploads', '')} alt="Agent" className='ratio ratio-1x1 w-100 object-fit-cover d-none d-lg-block' style={{ height: '460px', objectPosition: 'top' }} />
                    <div className='py-3 px-auto px-lg-4'>
                        <div className='fs-4 mb-2'>{t('Contacta a tu arquitecto', 'Contact to your architect')}</div>
                        <div className="d-flex justify-content-between flex-column flex-xl-row align-items-xl-end gap-4 gap-lg-2">
                            <div className="d-flex flex-column gap-1">
                                <a href={`tel:${architect.phone.replace(/\D/g, '')}`} className="d-flex-align-items-center gap-3 text-body" aria-label={`Llamar a ${architect.name}`}><i className="fa-solid fa-mobile-screen-button" aria-hidden="true"></i> {architect.phone}</a>
                                <a href={`mailto:${architect.email}`} className="d-flex-align-items-center gap-3 text-body" aria-label={`Enviar correo a ${architect.name}`}><i className="fa-regular fa-envelope" aria-hidden="true"></i> {architect.email}</a>
                                <div className="d-flex-align-items-center gap-3"><i className="fa-solid fa-location-dot"></i> {architect.agentInfo.address} </div>
                                <a href={architect.agentInfo?.wesite} target='_blank' rel="noreferrer" className="d-flex align-items-center gap-2 text-body text-truncate" style={{ maxWidth: '280px' }} aria-label={`Abrir sitio web de ${architect.name}`}>
                                    <i className="fa-solid fa-globe flex-shrink-0" aria-hidden="true"></i>
                                    <span className="text-truncate">{architect.agentInfo?.wesite}</span>
                                </a>
                            </div>
                            { (architect?.agentInfo.tiktok != "" || architect?.agentInfo.instagram != "" || architect?.agentInfo.linkedin != "") && (
                                <div className="d-flex algin-items-center gap-2">
                                    { architect?.agentInfo.instagram &&
                                        <a href={`${architect?.agentInfo.instagram}`} target='_blank' rel="noreferrer" className='text-white bg-dark rounded-circle' title='Instagram' aria-label={`Abrir Instagram de ${architect.name}`} style={{ width: '30px', height: '30px', display: 'grid', placeItems: 'center' }}><i className="fa-brands fa-instagram" aria-hidden="true"></i></a>
                                    }
                                    { architect?.agentInfo.linkedin &&
                                        <a href={`${architect?.agentInfo.linkedin}`} target='_blank' rel="noreferrer" className='text-white bg-dark rounded-circle' title='Linkedin' aria-label={`Abrir LinkedIn de ${architect.name}`} style={{ width: '30px', height: '30px', display: 'grid', placeItems: 'center' }}><i className="fa-brands fa-linkedin" aria-hidden="true"></i></a>
                                    }
                                    { architect?.agentInfo.tiktok &&
                                        <a href={`${architect?.agentInfo.tiktok}`} target='_blank' rel="noreferrer" className='text-white bg-dark rounded-circle' title='Tiktok' aria-label={`Abrir TikTok de ${architect.name}`} style={{ width: '30px', height: '30px', display: 'grid', placeItems: 'center' }}><i className="fa-brands fa-tiktok" aria-hidden="true"></i></a>
                                    }
                                </div> )
                            }
                        </div>
                    </div>
                </div>
            </Col>
            <Col lg={7}>
                <div>
                    {/* Logo de la firma + signTitle */}
                    {architect.agentInfo?.signTitle && (
                        <div className="d-flex align-items-center gap-3" style={{ fontSize: 'clamp(20px, 3vw, 32px)', color: '#5D5B5A' }}>
                            {logoUrl ? (
                                <img src={logoUrl} alt={architect.agentInfo.signTitle} className='rounded-circle object-fit-cover' style={{ width: 'clamp(50px, 5vw, 70px)', height: 'clamp(50px, 5vw, 70px)' }} />
                            ) : null}
                            <span className="fw-semibold">{architect.agentInfo.signTitle}</span>
                        </div>
                    )}
                    <div className="lh-1 mt-3 mt-lg-1 mb-4" style={{ fontSize: 'clamp(46px, 4.5vw, 142px)', fontFamily: 'AppleGaramond' }}>{architect.name}</div>
                    {architect.avatar && (
                        <img src={API_URL + architect.avatar.replace('/uploads', '')} alt={architect.name} className='ratio ratio-1x1 w-100 object-fit-cover d-block d-lg-none mb-4' style={{ height: '460px', objectPosition: 'top' }} />
                    )}
                    {architect.agentInfo?.description && (
                        <div className='lh-sm' style={{ fontSize: 'clamp(16px, 3vw, 18px)', fontStyle: 'italic', color: '#5D5B5A' }}>"{architect.agentInfo.description}"</div>
                    )}
                    {architect.agentInfo?.categoria?.length > 0 && (
                        <div className='d-flex my-4 my-lg-5 gap-3 flex-wrap'>
                            {architect.agentInfo.categoria.map(tag => (
                                <div key={tag} className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>{tag.toUpperCase()}</div>
                            ))}
                        </div>
                    )}
                    <div className="d-flex mt-5 mt-lg-0 gap-4 gap-lg-5 flex-column flex-md-row" style={{ fontSize: '16px' }}>
                        <div className='d-flex flex-column gap-3'>
                            <div className='d-flex align-items-center gap-3'><img src={expe} style={{ width: '30px' }} alt="icons" />{architect.agentInfo?.expe || 12} {t(pluralize(architect.agentInfo?.expe || 12, 'Año de experiencia', 'Años de experiencia'), pluralize(architect.agentInfo?.expe || 12, 'Year of experience', 'Years of experience'))}</div>
                            <div className='d-flex align-items-center gap-3'><img src={leads} style={{ width: '30px' }} alt="icons" />{projects.length} {t(pluralize(projects.length, 'Proyecto diseñado', 'Proyectos diseñados'), pluralize(projects.length, 'Project designed', 'Projects designed'))}</div>
                        </div>
                        <div className='d-flex flex-column gap-3'>
                            <div className='d-flex align-items-center gap-3'><img src={lan} style={{ width: '30px' }} alt="icons" />{architect.agentInfo?.languages?.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ') || t('Español, inglés, alemán', 'Spanish, English, German')}</div>
                            {architect.agentInfo?.premios && (
                                <div className='d-flex align-items-center gap-3'><img src={house_aval} style={{ width: '30px' }} alt="icons" />{architect.agentInfo?.premios} {t(pluralize(architect.agentInfo?.premios, 'premio recibido', 'premios recibidos'), pluralize(architect.agentInfo?.premios, 'award received', 'awards received'))}</div>
                            )}
                        </div>
                    </div>
                    {architect.phone && (
                        <div className='mt-5 d-flex justify-content-center justify-content-lg-start'>
                            <a href={`https://wa.me/${architect.phone.replace(/\D/g, '')}?text=` + encodeURIComponent('¡Hola! Me comunico desde la plataforma Brickly Homes. Estoy interesado en su trabajo.')} target="_blank" rel="noopener noreferrer" aria-label={`Contactar por WhatsApp a ${architect.name}`}>
                                <Button className="rounded-1 text-center border-0 fs-6 px-3" style={{ backgroundColor: 'black', color: 'white', boxSizing: 'border-box' }}><i className="fa-brands fa-whatsapp me-1"></i> <FormattedMessage id="profileAgent.text5" /> </Button>
                            </a>
                        </div>
                    )}
                </div>
            </Col>
        </Row>
        
        <div className="d-flex flex-column gap-3" style={{ marginTop: 'clamp(2rem, 6vw, 6rem)' }}>
            <div className="lh-sm mb-3" style={{fontSize: 'clamp(24px, 3vw, 40px)'}} >{t(`Proyectos de ${architect.name}`, `${architect.name}'s Projects`)}</div>

            {projects.length > 0 ? (
                <Row className='gy-5'>
                    {projects.map(proj => (
                        <Col md={6} key={proj._id || proj.id}>
                            <Link to={`/arquitectos/proyecto/${proj._id || proj.id}`} className='text-body'>
                                <div className='position-relative propiedades-zoom'>
                                    {proj.mainImage ? (
                                        <img
                                            src={getLogoUrl(proj.mainImageAlter || proj.mainImage)}
                                            className='w-100 object-fit-cover'
                                            alt={proj.title}
                                            style={{ height: 'clamp(280px, 50vw, 463px)' }}
                                        />
                                    ) : (
                                        <div className='w-100 bg-secondary d-flex align-items-center justify-content-center' style={{ height: '300px' }}>
                                            <i className="fa-regular fa-image" style={{ fontSize: '60px', color: '#aaa' }}></i>
                                        </div>
                                    )}
                                    {proj.title && (
                                        <div className="position-absolute start-0 bottom-0 w-100">
                                            <div className='bg-dark text-white py-1 px-3 d-flex gap-3 align-items-baseline' style={{ fontSize: 'clamp(14px, 3vw, 18px)' }}>{proj.title}</div>
                                        </div>
                                    )}
                                </div>
                                {(proj.address || proj.date_project) && (
                                    <div className='mt-3' style={{ fontSize: '18px' }}>
                                        {proj.address}{proj.address && proj.date_project ? ' ' : ''}{proj.date_project ? String(proj.date_project).slice(0, 4) : ''}
                                    </div>
                                )}
                            </Link>
                        </Col>
                    ))}
                </Row>
            ) : (
                <p className="text-muted">{t('No hay proyectos publicados aún', 'No published projects yet')}</p>
            )}
        </div>
    </Container>
  );
}

export default Profilearchitect;
