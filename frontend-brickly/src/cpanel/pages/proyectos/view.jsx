import { useEffect, useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getProyectoById, updateProyecto } from '../../services/proyectos';
import { getCurrentUser } from '../../../services/authService';
import { getLogoUrl } from '../../../services/logoService';
import '../../../assets/css/arquitectos.css';
import alertify from 'alertifyjs';


import build2 from '../../../assets/images/imagenes_architect/2.png';
import build5 from '../../../assets/images/imagenes_architect/5.png';

import arrow from '../../../assets/images/iconos/arrow.png';
import sinPropiedad from './../../assets/images/iconos/sinPropiedad.png';

function View() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [proyecto, setProyecto] = useState(null);
    const [loading, setLoading] = useState(true);

    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.roles?.includes('admin');


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
        if (!path || path === '') return sinPropiedad;
        return path.startsWith('http') ? path : getLogoUrl(path);
    };

    // Admin: aprobar (pre-published→published) o borrador (published→draft)
    const changeStatus = async () => {
        try {
            const getData = await getProyectoById(id);
            const currentStatus = getData?.data?.status;

            let newStatus;
            if (currentStatus === 'pre-published') {
                newStatus = 'published';
            } else if (currentStatus === 'published') {
                newStatus = 'draft';
            } else {
                return;
            }

            const update = await updateProyecto(id, { status: newStatus });
            setProyecto(prev => ({ ...prev, status: newStatus }));
            if (update.success) {
                const msg = newStatus === 'published' ? 'Proyecto aprobado y publicado' : 'Proyecto colocado como borrador';
                alertify.alert("BRICKLY HOMES", `<center>${msg}.</center>`);
            }
        } catch (errors) {
            console.error(errors);
        }
    };

    // No-admin: publicar (draft→pre-published) o borrador (pre-published→draft)
    const changeStatusNonAdmin = async (targetStatus) => {
        // Solo validar cuando intenta enviar a revisión (draft → pre-published)
        if (targetStatus === 'pre-published') {
            // 1. Validar que todos los campos del proyecto estén completos
            const requiredFields = [
                { field: 'title', label: 'Título' },
                { field: 'description', label: 'Descripción' },
                { field: 'address', label: 'Dirección' },
                { field: 'date_project', label: 'Año del proyecto' },
                { field: 'mainImage', label: 'Imagen principal (escritorio)' },
                { field: 'mainImageAlter', label: 'Imagen principal (móvil)' }
            ];

            const missingFields = requiredFields.filter(({ field }) => {
                const value = proyecto[field];
                return !value || (typeof value === 'string' && value.trim() === '');
            });

            const galleryCount = (proyecto.images || []).length;
            if (galleryCount < 3) {
                missingFields.push({ label: `Galería de imágenes (faltan ${3 - galleryCount} imágenes)` });
            }

            if (missingFields.length > 0) {
                const fieldList = missingFields.map(f => `• ${f.label}`).join('<br>');
                alertify.alert(
                    "BRICKLY HOMES",
                    `<center><b>Completa todos los campos del proyecto antes de enviarlo a revisión:</b><br><br>${fieldList}</center>`
                );
                return;
            }

            // 2. Validar que tenga un proyecto favorito seleccionado
            const user = getCurrentUser();
            if (!user?.agentInfo?.favoriteProject) {
                alertify.alert(
                    "BRICKLY HOMES",
                    `<center>Debes seleccionar un proyecto favorito antes de publicar.<br><br>Serás redirigido para elegir uno.</center>`,
                    () => {
                        navigate('/cpanel/proyectos/favoritos');
                    }
                );
                return;
            }
        }

        try {
            const update = await updateProyecto(id, { status: targetStatus });
            setProyecto(prev => ({ ...prev, status: targetStatus }));
            if (update.success) {
                const msg = targetStatus === 'pre-published' ? 'Proyecto enviado para aprobación' : 'Proyecto colocado como borrador';
                alertify.alert("BRICKLY HOMES", `<center>${msg}.</center>`);
            }
        } catch (errors) {
            console.error(errors);
        }
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
                <Link to="/cpanel/proyectos" className="btn btn-dark rounded-pill px-4">Volver a proyectos</Link>
            </Container>
        );
    }

    const mainImage = getImageSrc(proyecto.mainImage);
    const mobileImage = getImageSrc(proyecto.mainImageAlter);
    const galleryImages = proyecto.images || [];
    const statusLabel = {
        'draft': { text: 'Borrador', class: 'bg-secondary' },
        'published': { text: 'Publicado', class: 'bg-success' },
        'pre-published': { text: 'Pendiente de aprobación', class: 'bg-warning text-dark' },
        'disabled': { text: 'Deshabilitado', class: 'bg-dark' },
        'sold': { text: 'Vendido', class: 'bg-danger' },
        'rented': { text: 'Alquilado', class: 'bg-light' }
    };
    const statusInfo = statusLabel[proyecto.status] || { text: proyecto.status, class: 'bg-secondary' };

    return (
        <div style={{ marginBottom: 'clamp(2rem, 5vw, 5rem)' }} className='position-relative'>
            {/* Botones flotantes */}
            {isAdmin ? (
                proyecto.status === 'pre-published' && (
                    <div className="position-fixed bottom-0 end-0 me-3 mb-3" style={{ zIndex: 1999 }}>
                        <div
                            className="bg-success text-white py-2 px-4 rounded-3"
                            style={{ width: 'fit-content', cursor: 'pointer' }}
                            onClick={changeStatus}
                        >
                            Aprobar proyecto
                        </div>
                    </div>
                )
            ) : (
                <div className="position-fixed bottom-0 end-0 me-3 mb-3 d-flex flex-column gap-2" style={{ zIndex: 1999 }}>
                    {proyecto?.status === 'draft' && (
                        <button
                            onClick={() => changeStatusNonAdmin('pre-published')}
                            className="d-flex align-items-center justify-content-center text-white rounded-circle border-0"
                            style={{ width: '52px', height: '52px', fontSize: '20px', backgroundColor: '#198754', cursor: 'pointer' }}
                            title="Enviar a revisión"
                        >
                            <i className="fa-solid fa-check"></i>
                        </button>
                    )}
                    {proyecto?.status && proyecto?.status !== 'draft' && (
                        <button
                            onClick={() => changeStatusNonAdmin('draft')}
                            className="d-flex align-items-center justify-content-center text-white rounded-circle border-0"
                            style={{ width: '52px', height: '52px', fontSize: '20px', backgroundColor: '#6c757d', cursor: 'pointer' }}
                            title="Colocar como borrador"
                        >
                            <i className="fa-duotone fa-solid fa-file-pen"></i>
                        </button>
                    )}
                    <Link
                        to={`/cpanel/proyectos/edit/${id}`}
                        className="d-flex align-items-center justify-content-center bg-dark text-white rounded-circle"
                        style={{ width: '52px', height: '52px', fontSize: '20px', textDecoration: 'none' }}
                        title="Editar proyecto"
                    >
                        <i className="fa-duotone fa-solid fa-pen-to-square"></i>
                    </Link>
                </div>
            )}

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
                            <Link to="/cpanel/proyectos" className='d-block my-4 text-end' title='Atrás'>
                                <img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" />
                            </Link>
                            <div className='mt-lg-4 me-lg-5'>
                                <div style={{ fontSize: '20px' }}>
                                    {proyecto.status && (
                                        <span className={`badge p-2 mb-2 ${statusInfo.class}`} style={{ fontSize: '14px' }}>
                                            {statusInfo.text}
                                        </span>
                                    )}
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
                    <Link to="/cpanel/proyectos" className='d-block my-4 text-end' title='Atrás'>
                        <img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" />
                    </Link>
                    <div>
                        <div style={{ fontSize: '20px' }}>
                            {proyecto.status && (
                                <span className={`badge p-2 mb-2 ${statusInfo.class}`} style={{ fontSize: '14px' }}>
                                    {statusInfo.text}
                                </span>
                            )}
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

export default View;
