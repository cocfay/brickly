import { useEffect, useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { getProyectoById } from '../../cpanel/services/proyectos';
import { getLogoUrl } from '../../services/logoService';
import { getArchitectProfilePath } from '../../utils/profileRoutes';
import '../../assets/css/arquitectos.css';

import arrow from '../../assets/images/iconos/arrow.png';

function Projectarchitect() {
    const { id } = useParams();
    const [proyecto, setProyecto] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const load = async () => {
            setLoading(true);
            const result = await getProyectoById(id);
            if (result.success) {
                setProyecto(result.data);
            }
            setLoading(false);
        };
        load();
    }, [id]);

    const getImageSrc = (path) => {
        if (!path || path === '') return null;
        return path.startsWith('http') ? path : getLogoUrl(path);
    };

    if (loading) {
        return (
            <Container className="text-center py-5">
                <div className="spinner-border text-primary" />
                <p className="mt-3">Cargando proyecto...</p>
            </Container>
        );
    }

    if (!proyecto) {
        return (
            <Container className="text-center py-5">
                <p className="text-muted">Proyecto no encontrado</p>
                <Link to="/arquitectos" className="btn btn-dark rounded-pill px-4">Volver a arquitectos</Link>
            </Container>
        );
    }

    const mainImage = getImageSrc(proyecto.mainImage);
    const mobileImage = getImageSrc(proyecto.mainImageAlter);
    const galleryImages = proyecto.images || [];
    const architectProfile = proyecto.user || proyecto.userId;

    return (
        <div style={{ marginBottom: 'clamp(2rem, 5vw, 5rem)' }} className='position-relative'>
            {/* ============ LAYOUT ESCRITORIO (lg+) ============ */}
            <div className="d-none d-lg-block">
                {/* Imagen principal desktop */}
                {mainImage && (
                    <div className='mb-4'>
                        <img
                            src={mainImage}
                            className='w-100 object-fit-cover'
                            alt={proyecto.title || 'Proyecto'}
                            style={{ maxHeight: '500px' }}
                        />
                    </div>
                )}

                {/* Galería (hasta 3 thumbnails) */}
                {galleryImages.length > 0 && (
                    <div className='d-flex w-100 gap-4'>
                        {galleryImages.slice(0, 3).map((img, idx) => (
                            <div key={idx} className='flex-grow-1'>
                                <img
                                    src={getImageSrc(typeof img === 'string' ? img : img.path)}
                                    className='w-100 object-fit-cover'
                                    style={{ height: '238px', display: 'block' }}
                                    alt={`${proyecto.title || 'Proyecto'} - ${idx + 1}`}
                                />
                            </div>
                        ))}
                    </div>
                )}

                <div className="container-fluid p-0 mt-4">
                    <Row className='g-0 align-items-stretch'>
                        <Col md={8} className='bleed-left-content pe-lg-4'>
                            <Link
                                to={architectProfile ? getArchitectProfilePath(architectProfile) : '/arquitectos'}
                                className='d-block my-4 text-end'
                                title='Atrás'
                            >
                                <img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" />
                            </Link>
                            <div className='mt-lg-4 me-lg-5'>
                                <div style={{ fontSize: '20px' }}>
                                    <h1>{proyecto.title || 'Sin título'}</h1>
                                    {(proyecto.address || proyecto.date_project) && (
                                        <span className='text-muted'>
                                            {proyecto.address}{proyecto.address && proyecto.date_project ? ' ' : ''}{proyecto.date_project ? String(proyecto.date_project).slice(0, 4) : ''}
                                        </span>
                                    )}
                                </div>
                                <br />
                                {proyecto.description && (
                                    <div style={{ fontSize: '20px' }} dangerouslySetInnerHTML={{ __html: proyecto.description }} />
                                )}
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className='d-flex flex-column gap-4 px-lg-0'>
                                {galleryImages.slice(3, 5).map((img, idx) => (
                                    <img
                                        key={idx + 3}
                                        src={getImageSrc(typeof img === 'string' ? img : img.path)}
                                        className='w-100 object-fit-cover'
                                        alt={`${proyecto.title || 'Proyecto'} - ${idx + 4}`}
                                    />
                                ))}
                            </div>
                        </Col>
                    </Row>
                </div>
            </div>

            {/* ============ LAYOUT MÓVIL / TABLET (< lg) ============ */}
            <div className="d-block d-lg-none">
                {/* 1. Imagen móvil */}
                {mobileImage && (
                    <div className='mb-4'>
                        <img
                            src={mobileImage}
                            className='w-100 object-fit-cover'
                            alt={proyecto.title || 'Proyecto'}
                            style={{ maxHeight: '500px' }}
                        />
                    </div>
                )}

                {/* 2. Título y contenido */}
                <Container>
                    <Link
                        to={architectProfile ? getArchitectProfilePath(architectProfile) : '/arquitectos'}
                        className='d-block my-4 text-end'
                        title='Atrás'
                    >
                        <img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" />
                    </Link>
                    <div>
                        <div style={{ fontSize: '20px' }}>
                            <h1>{proyecto.title || 'Sin título'}</h1>
                            {(proyecto.address || proyecto.date_project) && (
                                <span className='text-muted'>
                                    {proyecto.address}{proyecto.address && proyecto.date_project ? ' ' : ''}{proyecto.date_project ? String(proyecto.date_project).slice(0, 4) : ''}
                                </span>
                            )}
                        </div>
                        <br />
                        {proyecto.description && (
                            <div style={{ fontSize: '20px' }} dangerouslySetInnerHTML={{ __html: proyecto.description }} />
                        )}
                    </div>

                    {/* 3. Galería de imágenes después del texto */}
                    {galleryImages.length > 0 && (
                        <div className='mt-4 d-flex flex-column gap-4'>
                            {galleryImages.slice(0, 5).map((img, idx) => (
                                <img
                                    key={idx}
                                    src={getImageSrc(typeof img === 'string' ? img : img.path)}
                                    className='w-100 object-fit-cover'
                                    style={{ maxHeight: '400px' }}
                                    alt={`${proyecto.title || 'Proyecto'} - ${idx + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </Container>
            </div>
        </div>
    );
}

export default Projectarchitect;
