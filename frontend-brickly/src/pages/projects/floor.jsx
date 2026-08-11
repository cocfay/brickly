import { useState, useEffect } from "react";
import { Container, Row, Col, Breadcrumb, Button, Form } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.min.css';

import tour    from '../../assets/images/iconos/IconoTour.png';
import arrow   from '../../assets/images/iconos/arrow.png';
import venta   from '../../assets/images/iconos/venta.png';
import bricklyIcon from '../../assets/images/logos/brickly-icon.png';
import { useT } from '../../hooks/useT';
import '../../assets/css/proyectos.css';
import { getProyectoById, sendProyectoLead, registerProyectoCitaClick } from '../../cpanel/services/proyectos';
import { enriquecerProyecto, MODELO_FALLBACK_IMG } from '../../utils/proyectosUtils';
import { enriquecerAmenidades } from '../../utils/amenidades';
import { getModelPath } from '../../utils/projectRoutes';

// Fila tipo "label: valor" para las secciones de datos
function BulletRow({ label, value }) {
    if (value == null || value === '' || value === '—') return null;
    return (
        <Col md={6}>
            <div className="d-flex align-items-center gap-1">
                <span className="fs-2 lh-1">•</span>
                <span>{label}: {value || '—'}</span>
            </div>
        </Col>
    );
}

function Floor({ preview = false }) {
    const t = useT();
    const { id, modelSlug } = useParams();
    const [project, setProject] = useState(null);
    const [modelo, setModelo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mainImg, setMainImg] = useState(MODELO_FALLBACK_IMG);
    const [isLg, setIsLg] = useState(window.innerWidth >= 992);
    const [formStatus, setFormStatus] = useState(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsLg(window.innerWidth >= 992);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!id || !modelSlug) return;
        let active = true;
        setLoading(true);
        getProyectoById(id)
            .then(({ success, data }) => {
                if (!active) return;
                if (success && data) {
                    const enriched = enriquecerProyecto(data);
                    const found = (enriched.modelos || []).find(
                        m => m.modelSlug === modelSlug
                    ) || null;
                    setProject(enriched);
                    setModelo(found);
                }
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [id, modelSlug]);

    useEffect(() => {
        if (modelo) {
            const primera = (Array.isArray(modelo.fotosUrls) && modelo.fotosUrls.length)
                ? modelo.fotosUrls[0]
                : (modelo.img || MODELO_FALLBACK_IMG);
            setMainImg(primera);
        }
    }, [modelo]);

    if (loading) {
        return (
            <Container style={{ marginTop: 'clamp(1.5rem, 3vw, 3rem)', marginBottom: 'clamp(3rem, 6vw, 6rem)' }}>
                <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                </div>
            </Container>
        );
    }

    if (!modelo || !project) {
        return (
            <Container style={{ marginTop: 'clamp(1.5rem, 3vw, 3rem)', marginBottom: 'clamp(3rem, 6vw, 6rem)' }}>
                <div className="text-center" style={{ marginTop: '8rem', marginBottom: '8rem' }}>
                    <div className="fs-2 text-muted">{t('Modelo no encontrado', 'Model not found')}</div>
                    <Link to={preview ? '/cpanel/proyectos' : '/proyectos'} className="btn btn-outline-dark mt-4">{t('Volver a proyectos', 'Back to projects')}</Link>
                </div>
            </Container>
        );
    }

    const titulo = project.titulo;
    const ubicacion = project.ubicacion;
    const desarrolladora = project.desarrolladora;
    const apartamentoId = id;

    const requestFieldIds = {
        name: 'model-request-name',
        email: 'model-request-email',
        phone: 'model-request-phone',
        message: 'model-request-message',
    }

    const handleCitaClick = () => {
        const storageKey = `citaClicked_${apartamentoId}_${modelSlug}`;
        if (localStorage.getItem(storageKey)) return;
        localStorage.setItem(storageKey, '1');
        registerProyectoCitaClick({ projectSlug: apartamentoId, modelSlug });
    };

    const handleLeadSubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById(requestFieldIds.name)?.value?.trim();
        const email = document.getElementById(requestFieldIds.email)?.value?.trim();
        const phone = document.getElementById(requestFieldIds.phone)?.value?.trim();
        const message = document.getElementById(requestFieldIds.message)?.value?.trim();

        if (!name || !email || !phone) {
            setFormStatus({ type: 'error', msg: t('Por favor completa nombre, correo y teléfono', 'Please complete name, email and phone') });
            return;
        }

        setSending(true);
        setFormStatus(null);
        const res = await sendProyectoLead({
            projectSlug: apartamentoId,
            modelSlug,
            modelName: modelo.nombre,
            name,
            email,
            phone,
            message,
            type: 'modelo',
        });
        setSending(false);

        if (res.success) {
            setFormStatus({ type: 'success', msg: t('Solicitud enviada correctamente. Pronto te contactaremos.', 'Request sent successfully. We will contact you soon.') });
            ['name', 'email', 'phone', 'message'].forEach((f) => {
                const el = document.getElementById(requestFieldIds[f]);
                if (el) el.value = '';
            });
        } else {
            setFormStatus({ type: 'error', msg: res.error || t('No se pudo enviar la solicitud. Inténtalo de nuevo.', 'Could not send the request. Try again.') });
        }
    };

    // Rutas adaptadas al contexto: preview (cpanel) vs público
    const toInicio = preview ? '/cpanel' : '/';
    const toProyectos = preview ? '/cpanel/proyectos' : '/proyectos';
    const toProyecto = preview ? `/cpanel/proyectos/view/${apartamentoId}` : `/proyectos/apartamento/${apartamentoId}`;
    const toModelo = (modelSlug) => preview
        ? `/cpanel/proyectos/view/${apartamentoId}/modelo/${modelSlug}`
        : getModelPath(apartamentoId, { modelSlug });

    // Galería dinámica: fotos del modelo o imagen de respaldo
    const galeria = Array.isArray(modelo.fotosUrls) && modelo.fotosUrls.length
        ? modelo.fotosUrls
        : [modelo.img || MODELO_FALLBACK_IMG];

    const openLightbox = (startImg) => {
        const elements = galeria.map(img => ({ href: img, type: 'image' }));
        const startAt = galeria.indexOf(startImg);
        const lb = GLightbox({
            elements,
            startAt: startAt >= 0 ? startAt : 0,
            touchNavigation: true,
            loop: true,
            openEffect: 'zoom',
            closeEffect: 'fade',
        });
        lb.open();
    };

    const esBodega = modelo.tipo === 'Bodega';
    const esOficina = modelo.tipo === 'Oficina';
    const otrosModelos = (project.modelos || []).filter(m => m.modelSlug !== modelSlug);

    const tieneValor = (v) => v != null && v !== '' && v !== '—';

    const distribFields = esBodega
        ? [
            modelo.distribucion.oficina,
            modelo.distribucion.banosCompletos,
            modelo.distribucion.mediosBanos,
            modelo.distribucion.habitacionServicio,
            modelo.distribucion.areaDescarga,
            modelo.distribucion.helipuerto,
            modelo.distribucion.mezzanine,
        ]
        : esOficina
        ? [
            modelo.distribucion.espacios,
            modelo.distribucion.banosCompletos,
            modelo.distribucion.mediosBanos,
            modelo.distribucion.parqueo,
            modelo.distribucion.amueblado,
            modelo.distribucion.areaLavanderia,
        ]
        : [
            modelo.distribucion.dormitorios,
            modelo.distribucion.banosCompletos,
            modelo.distribucion.mediosBanos,
            modelo.distribucion.habitacionServicio,
            modelo.distribucion.pergolaDeck,
            modelo.distribucion.parqueo,
            modelo.distribucion.amueblado,
            modelo.distribucion.numeroPisos,
            modelo.distribucion.areaLavanderia,
            modelo.distribucion.estudioOficina,
            modelo.distribucion.salaFamiliar,
        ];
    const distribTiene = tieneValor(modelo.distribucion.totalAmbientes) || distribFields.some(tieneValor);

    const modeloAmenidades = enriquecerAmenidades(
        Object.entries(modelo.amenities || {})
            .filter(([, v]) => v)
            .map(([key]) => key)
    );

    return (
        <>
        <Container style={{ marginTop: 'clamp(1.5rem, 3vw, 3rem)', marginBottom: 'clamp(3rem, 6vw, 6rem)' }}>

            {/* Breadcrumb */}
            <Breadcrumb className='px-3 py-1 rounder-1' style={{ "--bs-breadcrumb-divider": "'>'", fontSize: '14px', width: 'fit-content', background: '#f0f0f0' }} >
                <Breadcrumb.Item linkAs={Link} linkProps={{ to: toInicio }}>Inicio</Breadcrumb.Item>
                <Breadcrumb.Item linkAs={Link} linkProps={{ to: toProyectos }}>Proyectos</Breadcrumb.Item>
                <Breadcrumb.Item linkAs={Link} linkProps={{ to: toProyecto }}>{titulo}</Breadcrumb.Item>
                <Breadcrumb.Item active>{modelo.nombre}</Breadcrumb.Item>
            </Breadcrumb>

            {/* Botón atrás */}
            <div className="d-flex justify-content-end mb-2 mt-4 mt-lg-0">
                <Link to={toProyecto} title="Atrás">
                    <img src={arrow} style={{ width: '36px' }} alt="Atrás" />
                </Link>
            </div>

            {/* Header */}
            <div className="mb-4">
                <div className="d-flex justify-content-between align-items-lg-end flex-column flex-lg-row gap-3">
                    <div className="d-flex flex-wrap flex-column align-items-start gap-2 mt-3">
                        <div style={{ fontSize: 'clamp(28px, 4vw, 50px)', fontFamily: 'AppleGaramond', lineHeight: 1.1 }}>
                            {titulo}
                        </div>
                        <div className="d-flex align-items-center gap-1" style={{ fontSize: '20px' }}>
                            <i className="fa-solid fa-location-dot me-1"></i>
                            {ubicacion}
                        </div>
                        <div style={{ fontSize: '20px' }}>Tipo: {modelo.tipo}</div>
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                            <span className="fw-bold" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>{modelo.precioDesdeUSD}</span>
                            <div className='d-flex align-items-center gap-2'><img src={venta} alt="icons" style={{ width: '20px' }} /> <div className="bg-dark rounded-1 px-4 py-0 text-white fw-lighter" style={{ fontSize: '16px' }}>{project.modo}</div></div>
                        </div>
                    </div>
                    <div className="d-flex flex-column align-items-lg-end gap-2 text-lg-end">
                        <div className="lh-1" style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontFamily: 'AppleGaramond' }}>
                            {modelo.nombre}
                        </div>
                        {modelo.tour360 ? (
                            <a href={modelo.tour360} className="d-flex align-items-center gap-2 text-body text-decoration-none" style={{ fontSize: '16px', border: '1px solid black', borderRadius: '999px', padding: '8px 20px' }}>
                                <img src={tour} alt="tour" style={{ width: '24px' }} />
                                Tour 360
                            </a>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* ── Galería ── */}
            {isLg ? (
            <div className="d-flex gap-2 mb-5" style={{ height: 'clamp(400px, 55vw, 600px)' }}>
                {/* Imagen principal */}
                <div
                    className="position-relative flex-grow-1"
                    style={{ borderRadius: '14px', overflow: 'hidden', minWidth: 0, cursor: 'zoom-in' }}
                    onClick={() => openLightbox(mainImg)}
                >
                    <img src={mainImg} alt="Principal" className="object-fit-cover w-100 border-radius-1 h-100" style={{ display: 'block' }} />
                    <div className="position-absolute bottom-0 end-0 m-2 favorite-icon unlike" style={{ cursor: 'pointer' }} onClick={e => e.stopPropagation()}>
                        <i className="fa-solid fa-heart"></i>
                    </div>
                    {galeria.length > 1 && (
                    <div
                        className="position-absolute d-flex align-items-center gap-2"
                        style={{ bottom: '12px', left: '12px', backgroundColor: '#ffffffdd', borderRadius: '20px', padding: '4px 14px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                        onClick={e => { e.stopPropagation(); openLightbox(mainImg); }}
                    >
                        <i className="fa-regular fa-image"></i> +{galeria.length - 1} Fotos
                    </div>
                    )}
                </div>
                {/* Thumbnails derecha */}
                <div className="d-flex flex-column gap-2" style={{ width: '32%', flexShrink: 0 }}>
                    {galeria.slice(1, 4).map((img, i) => (
                        <div
                            key={i}
                            onClick={() => { setMainImg(img); openLightbox(img); }}
                            style={{
                                flex: 1,
                                minHeight: 0,
                                borderRadius: '10px',
                                overflow: 'hidden',
                                cursor: 'zoom-in',
                                transition: 'opacity 0.2s',
                            }}
                        >
                            <img src={img} alt="" className="object-fit-cover w-100 h-100" style={{ display: 'block' }} />
                        </div>
                    ))}
                </div>
            </div>
            ) : (
            <div className="d-flex flex-column gap-2 mb-5">
                {/* Imagen principal arriba */}
                <div
                    className="position-relative w-100"
                    style={{ borderRadius: '14px', overflow: 'hidden', cursor: 'zoom-in', aspectRatio: '16/9' }}
                    onClick={() => openLightbox(mainImg)}
                >
                    <img src={mainImg} alt="Principal" className="object-fit-cover w-100 h-100" style={{ display: 'block' }} />
                    <div className="position-absolute bottom-0 end-0 m-2 favorite-icon unlike" style={{ cursor: 'pointer' }} onClick={e => e.stopPropagation()}>
                        <i className="fa-solid fa-heart"></i>
                    </div>
                    {galeria.length > 1 && (
                    <div
                        className="position-absolute d-flex align-items-center gap-2"
                        style={{ bottom: '12px', left: '12px', backgroundColor: '#ffffffdd', borderRadius: '20px', padding: '4px 14px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                        onClick={e => { e.stopPropagation(); openLightbox(mainImg); }}
                    >
                        <i className="fa-regular fa-image"></i> +{galeria.length - 1} Fotos
                    </div>
                    )}
                </div>
                {/* Thumbnails debajo */}
                <div className="d-flex gap-2">
                    {galeria.slice(1, 4).map((img, i) => (
                        <div
                            key={i}
                            onClick={() => { setMainImg(img); openLightbox(img); }}
                            style={{
                                flex: 1,
                                borderRadius: '10px',
                                overflow: 'hidden',
                                cursor: 'zoom-in',
                                aspectRatio: '4/4',
                                transition: 'opacity 0.2s',
                            }}
                        >
                            <img src={img} alt="" className="object-fit-cover w-100 h-100" style={{ display: 'block' }} />
                        </div>
                    ))}
                </div>
            </div>
            )}

            {/* Desarrollado por — móvil: justo debajo de las fotos */}
            {tieneValor(desarrolladora.nombre) && (
                <div className="d-lg-none mb-4" style={{ fontSize: '17px', fontWeight: 500 }}>
                    {t('Desarrollado por: ', 'Developed by:')} {desarrolladora.nombre}
                </div>
            )}

            {/* ── Contenido principal ── */}
            <Row className="g-5">
                {/* Columna izquierda */}
                <Col lg={7} className="floor-content-col">

                    {/* Descripción del modelo */}
                    {(tieneValor(modelo.descripcion) || modelo.camas > 0 || modelo.banos > 0 || modelo.parqueo > 0 || tieneValor(modelo.area)) && (
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-building fs-2"></i> {t('Descripción del modelo', 'Model description')}
                        </div>
                        <div style={{ lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: modelo.descripcion || '' }} />

                        {/* Iconos principales */}
                        {(modelo.camas > 0 || modelo.banos > 0 || modelo.parqueo > 0 || tieneValor(modelo.area)) && (
                        <div className="d-flex mb-4 py-3 border-top border-bottom justify-content-center align-items-center" style={{ gap: 'clamp(25px, 8vw, 70px)' }}>
                            <div>A partir de: </div>
                            <div className="text-center">
                                <i className="fa-solid fa-bed d-block mb-1" style={{ fontSize: '22px' }}></i>
                                <span style={{ fontSize: '20px', fontWeight: 600 }}>{modelo.camas}</span>
                            </div>
                            <div className="text-center">
                                <i className="fa-solid fa-bath d-block mb-1" style={{ fontSize: '22px' }}></i>
                                <span style={{ fontSize: '20px', fontWeight: 600 }}>{modelo.banos}</span>
                            </div>
                            <div className="text-center">
                                <i className="fa-solid fa-car-side d-block mb-1" style={{ fontSize: '22px' }}></i>
                                <span style={{ fontSize: '20px', fontWeight: 600 }}>{modelo.parqueo}</span>
                            </div>
                            <div className="text-center">
                                <i className="fa-solid fa-crop-simple d-block mb-1" style={{ fontSize: '22px' }}></i>
                                <span style={{ fontSize: '20px', fontWeight: 600 }}>{modelo.area}</span>
                            </div>
                        </div>
                        )}
                    </div>
                    )}

                    {/* Áreas y dimensiones */}
                    {(tieneValor(modelo.areas.areaConstruccionM2) || tieneValor(modelo.areas.espacioAlmacenamiento)) && (
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-chart-area"></i> {t('Áreas y dimensiones', 'Areas and dimensions')}
                        </div>
                        <Row className="gy-1">
                            <BulletRow label="Área de construcción (m²)" value={modelo.areas.areaConstruccionM2} />
                            <BulletRow label={t('Espacio de almacenamiento', 'Storage space')} value={modelo.areas.espacioAlmacenamiento} />
                        </Row>
                    </div>
                    )}

                    {/* Estructura y obra gris */}
                    {tieneValor(modelo.estructura.alturaCielo) && (
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-trowel-bricks"></i> {t('Estructura y obra gris', 'Structure and gray work')}
                        </div>
                        <Row className="gy-1">
                            <BulletRow label={t('Altura del cielo', 'Ceiling height')} value={modelo.estructura.alturaCielo} />
                        </Row>
                    </div>
                    )}

                    {/* Distribución de ambientes */}
                    {distribTiene && (
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-tree-city"></i> {t('Distribución de ambientes', 'Room distribution')}
                        </div>
                        <Row className="gy-1">
                            <BulletRow label={t('Total de ambientes', 'Total rooms')} value={modelo.distribucion.totalAmbientes} />
                            {esBodega ? (
                                <>
                                    <BulletRow label={t('Oficina', 'Office')} value={modelo.distribucion.oficina} />
                                    <BulletRow label={t('Baños completos', 'Full bathrooms')} value={modelo.distribucion.banosCompletos} />
                                    <BulletRow label={t('Medios baños', 'Half bathrooms')} value={modelo.distribucion.mediosBanos} />
                                    <BulletRow label={t('Habitación de servicio', 'Service room')} value={modelo.distribucion.habitacionServicio} />
                                    <BulletRow label={t('Área de descarga', 'Loading area')} value={modelo.distribucion.areaDescarga} />
                                    <BulletRow label={t('Helipuerto', 'Helipad')} value={modelo.distribucion.helipuerto} />
                                    <BulletRow label={t('Mezzanine', 'Mezzanine')} value={modelo.distribucion.mezzanine} />
                                </>
                            ) : esOficina ? (
                                <>
                                    <BulletRow label={t('Espacios', 'Spaces')} value={modelo.distribucion.espacios} />
                                    <BulletRow label={t('Baños completos', 'Full bathrooms')} value={modelo.distribucion.banosCompletos} />
                                    <BulletRow label={t('Medios baños', 'Half bathrooms')} value={modelo.distribucion.mediosBanos} />
                                    <BulletRow label={t('Parqueo/Driveway', 'Parking/Driveway')} value={modelo.distribucion.parqueo} />
                                    <BulletRow label={t('Amueblado/No amueblado', 'Furnished/Unfurnished')} value={modelo.distribucion.amueblado} />
                                    <BulletRow label={t('Área de lavandería', 'Laundry area')} value={modelo.distribucion.areaLavanderia} />
                                </>
                            ) : (
                                <>
                                    <BulletRow label={t('Dormitorios', 'Bedrooms')} value={modelo.distribucion.dormitorios} />
                                    <BulletRow label={t('Baños completos', 'Full bathrooms')} value={modelo.distribucion.banosCompletos} />
                                    <BulletRow label={t('Medios baños', 'Half bathrooms')} value={modelo.distribucion.mediosBanos} />
                                    <BulletRow label={t('Habitación de servicio', 'Service room')} value={modelo.distribucion.habitacionServicio} />
                                    <BulletRow label={t('Pérgola/Deck social', 'Social pergola/deck')} value={modelo.distribucion.pergolaDeck} />
                                    <BulletRow label={t('Parqueo/Driveway', 'Parking/Driveway')} value={modelo.distribucion.parqueo} />
                                    <BulletRow label={t('Amueblado/No amueblado', 'Furnished/Unfurnished')} value={modelo.distribucion.amueblado} />
                                    <BulletRow label={t('Número de pisos', 'Number of floors')} value={modelo.distribucion.numeroPisos} />
                                    <BulletRow label={t('Área de lavandería', 'Laundry area')} value={modelo.distribucion.areaLavanderia} />
                                    <BulletRow label={t('Estudio/Oficina', 'Study/Office')} value={modelo.distribucion.estudioOficina} />
                                    <BulletRow label={t('Sala familiar', 'Family room')} value={modelo.distribucion.salaFamiliar} />
                                </>
                            )}
                        </Row>
                    </div>
                    )}

                    {/* Gastos fijos */}
                    {(tieneValor(modelo.gastosFijos.tipoEstufa) || tieneValor(modelo.gastosFijos.servicioAgua) || tieneValor(modelo.gastosFijos.mantenimientoUSD) || tieneValor(modelo.gastosFijos.mantenimientoQ) || tieneValor(modelo.gastosFijos.iusi) || (Array.isArray(modelo.incluye.includes) && modelo.incluye.includes.length > 0)) && (
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-sack-dollar"></i> {t('Gastos fijos', 'Fixed expenses')}
                        </div>
                        <Row className="gy-1">
                            <BulletRow label={t('Tipo de estufa', 'Stove type')} value={modelo.gastosFijos.tipoEstufa} />
                            <BulletRow label={t('Servicio de agua', 'Water service')} value={modelo.gastosFijos.servicioAgua} />
                            <BulletRow label={t('Mantenimiento ($)', 'Maintenance ($)')} value={modelo.gastosFijos.mantenimientoUSD} />
                            <BulletRow label={t('Mantenimiento (Q)', 'Maintenance (Q)')} value={modelo.gastosFijos.mantenimientoQ} />
                            <BulletRow label={t('IUSI', 'IUSI')} value={modelo.gastosFijos.iusi} />
                        </Row>
                        {Array.isArray(modelo.incluye.includes) && modelo.incluye.includes.length > 0 && (
                        <div className="mt-3">
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <i className="fa-sharp fa-regular fa-circle-check"></i> {t('Incluye', 'Includes')}
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                                {modelo.incluye.includes.map((inc, i) => (
                                    <span key={i} className="border border-black rounded-pill px-3 py-2" style={{ color: '#333', fontWeight: 400 }}>
                                        {inc}
                                    </span>
                                ))}
                            </div>
                        </div>
                        )}
                    </div>
                    )}

                    {/* Amenidades del modelo */}
                    {(modeloAmenidades || []).length > 0 && (
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-umbrella-beach"></i> {t('Amenidades del modelo', 'Model amenities')}
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                            {modeloAmenidades.map((a, i) => (
                                <span key={i} className="border border-black rounded-pill px-3 py-2" style={{ color: '#333', fontWeight: 400 }}>
                                    {a.nombre}
                                </span>
                            ))}
                        </div>
                    </div>
                    )}

                </Col>

                {/* Columna derecha — sidebar */}
                <Col lg={5}>
                    <div className="sticky-lg-top" style={{ top: '100px' }}>

                        {/* Desarrollado por — solo desktop (en móvil va bajo las fotos + barra flotante) */}
                        <div className="p-3 my-2 d-none d-lg-block">

                            <div className="mb-3">{t('Desarrollado por: ', 'Developed by:')} {desarrolladora.nombre}</div>
                            <div className="mb-3 fs-4">{t('Comercializado por', 'Marketed by')}</div>
                            <div className="d-flex align-items-start justify-content-between align-items-lg-center flex-column flex-md-row gap-3">
                                <div className="d-flex align-items-center gap-2 mt-3" style={{ fontSize: '17px' }}>
                                    <img src={bricklyIcon} alt="Brickly" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
                                    <span>{t('Brickly Proyectos', 'Brickly Proyectos')}</span>
                                </div>
                                <div className="d-flex justify-content-md-end flex-column">
                                    <div className='mb-2 lh-1' style={{ fontSize: '16px' }}><FormattedMessage id="home.text12" /></div>
                                    <a href={`https://wa.me/50237649719?text=${encodeURIComponent(`Me interesa el model ${modelo.nombre} del proyecto ${titulo}, Necesito una cita para más información.`)}`} target="_blank" className="rounded-1 text-center border-0 py-1" style={{ backgroundColor: 'black', color: 'white', boxSizing: 'border-box', padding: '2px 8px', fontSize: '13px' }} rel="noreferrer" aria-label="Agendar una cita para información del modelo" onClick={handleCitaClick}>
                                        <i className="fa-brands fa-whatsapp me-2"></i><FormattedMessage id="home.text13" />
                                    </a>
                                </div>
                            </div>
                            <br />
                            <hr/>
                        </div>

                        {/* Solicitar información */}
                        <div className="mb-4">
                            <div className="mb-3 fs-3">{t('Solicitar información', 'Request information')}</div>
                            <Form onSubmit={handleLeadSubmit} className="d-flex flex-column gap-2">
                                <label htmlFor={requestFieldIds.name} className="visually-hidden">Nombre</label>
                                <Form.Control id={requestFieldIds.name} placeholder="Nombre" style={{ fontSize: '14px', borderRadius: '4px' }} />
                                <label htmlFor={requestFieldIds.email} className="visually-hidden">Correo electrónico</label>
                                <Form.Control id={requestFieldIds.email} type="email" placeholder="Correo electrónico" style={{ fontSize: '14px', borderRadius: '4px' }} />
                                <label htmlFor={requestFieldIds.phone} className="visually-hidden">Teléfono</label>
                                <Form.Control id={requestFieldIds.phone} placeholder="Teléfono" style={{ fontSize: '14px', borderRadius: '4px' }} />
                                <label htmlFor={requestFieldIds.message} className="visually-hidden">Mensaje</label>
                                <Form.Control
                                    id={requestFieldIds.message}
                                    as="textarea"
                                    rows={3}
                                    defaultValue={`Estoy interesado en la propiedad: ${titulo}, ${modelo.nombre}`}
                                    style={{ fontSize: '14px', borderRadius: '4px' }}
                                />
                                <button type="submit" className="btn btn-dark w-100 rounded-1 py-2 mt-1" disabled={sending}>
                                    {sending ? t('Enviando...', 'Sending...') : 'ENVIAR'}
                                </button>
                                {formStatus && (
                                    <div className={`small mt-1 ${formStatus.type === 'success' ? 'text-success' : 'text-danger'}`}>{formStatus.msg}</div>
                                )}
                            </Form>
                        </div>

                        {/* Ubicación geográfica — mapa placeholder */}
                        <div className="mt-5">
                            <div className="mb-3 fs-3">
                                <i className="fa-regular fa-earth-africa me-2"></i>{t('Ubicación geográfica', 'Geographic location')}
                            </div>
                            <div
                                className="rounded-1 overflow-hidden d-flex align-items-center justify-content-center bg-light"
                                style={{ height: '300px', border: '1px solid #dee2e6' }}
                            >
                                <iframe
                                    title="mapa"
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3861.0!2d-90.5069!3d14.6099!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTTCsDM2JzM1LjYiTiA5MMKwMzAnMjQuOCJX!5e0!3m2!1ses!2sgt!4v1"
                                    width="100%"
                                    height="300"
                                    style={{ border: 0 }}
                                    allowFullScreen=""
                                    loading="lazy"
                                ></iframe>
                            </div>
                        </div>

                    </div>
                </Col>
            </Row>

            {/* ── Explora más modelos ── */}
            {otrosModelos.length > 0 && (
            <div style={{ marginTop: 'clamp(2rem, 10vw, 6rem)', marginBottom: 'clamp(2rem, 10vw, 6rem)' }}>
                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-5 gap-3 gap-lg-0">
                    <div style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontFamily: 'AppleGaramond' }}>
                        {t('Explora más modelos', 'Explore more models')}
                    </div>
                    <Link to={toModelo(otrosModelos[0].modelSlug)} className="link-more-black d-flex align-items-center gap-2">
                        {t('Ver todos', 'View all')} <i className="fa-solid fa-angle-right"></i>
                    </Link>
                </div>

                <div className="row gy-5 align-items-start">
                    {otrosModelos.map((m, i) => (
                        <div key={i} className="col-md-6 col-xl-4">
                            <Link to={toModelo(m.modelSlug)} className="d-block text-body border rounded-3">
                                <div className="position-relative d-block propiedades-zoom">
                                    <img
                                        src={m.img}
                                        className="object-fit-cover w-100 border-radius-1"
                                        alt={m.nombre}
                                        style={{ aspectRatio: '4 / 4' }}
                                    />
                                </div>
                                <div className="mt-3 px-4 pb-4">
                                    <div className="text-truncate" style={{ fontSize: 'clamp(34px, 6vw, 46px)', fontFamily: 'AppleGaramond' }}>
                                        {m.nombre}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '14px' }}>{t('Desde', 'From')}</div>
                                    <div className="mt-2 fw-bold fs-4 text-dark">{m.precioDesdeUSD}</div>
                                    <hr />
                                    <div className="d-flex justify-content-around icons-small-description gap-4 mt-2">
                                        <div><i className="fa-solid fa-crop-simple me-2"></i>{m.area}</div>
                                        <div><i className="fa-solid fa-bed me-2"></i>{m.camas} {t('Habitaciones', 'Bedrooms')}</div>
                                        <div><i className="fa-solid fa-bath me-2"></i>{m.banos} {t('Baños', 'Baths')}</div>
                                    </div>
                                    <hr />
                                    <div className="d-flex justify-content-center align-items-center gap-1 mt-3 text-body">
                                        {t('Ver disponibilidad', 'Check availability')} <i className="fa-solid fa-angle-right ms-1"></i>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
            )}

        </Container>

        {/* Barra flotante móvil: Comercializado por + Agendar cita */}
        <div className="brickly-fixed-bar">
            <div className="brickly-bar-info">
                <img src={bricklyIcon} alt="Brickly" className="brickly-bar-logo" />
                <div>
                    <div className="brickly-bar-title">{t('Comercializado por', 'Marketed by')}</div>
                    <div className="brickly-bar-name">{t('Brickly Proyectos', 'Brickly Proyectos')}</div>
                </div>
            </div>
            <a
                href={`https://wa.me/50237649719?text=${encodeURIComponent(`Me interesa el model ${modelo.nombre} del proyecto ${titulo}, Necesito una cita para más información.`)}`}
                target="_blank"
                rel="noreferrer"
                className="brickly-bar-btn"
                onClick={handleCitaClick}
            >
                <i className="fa-brands fa-whatsapp me-2"></i>{t('Agendar cita', 'Schedule appointment')}
            </a>
        </div>
        </>
    );
}

export default Floor;