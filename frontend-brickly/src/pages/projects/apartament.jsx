import { useState, useEffect, useRef } from "react";
import { Container, Row, Col, Breadcrumb, Form, Button } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.min.css';

import '../../assets/css/proyectos.css'

import diamond from '../../assets/images/iconos/diamond.png';
import venta   from '../../assets/images/iconos/venta.png';
import arrow   from '../../assets/images/iconos/arrow.png';
import tour    from '../../assets/images/iconos/IconoTour.png';
import { useT } from '../../hooks/useT';
import { getProyectoById, getProyectosPublicos } from '../../cpanel/services/proyectos';
import { enriquecerProyecto, MODELO_FALLBACK_IMG } from '../../utils/proyectosUtils';
import { getModelPath } from '../../utils/projectRoutes';

// ── Amenidades del edificio ─────────────────────────────────────
// edificio: true  → aplica SOLO al edificio (se marca con * en la UI)
// edificio: false → es amenidad de los apartamentos
const AMENIDADES_ALL = [
    { key: 'balcon',             nombre: 'Balcón',                                 edificio: false },
    { key: 'aire',               nombre: 'Aire acondicionado',                     edificio: false },
    { key: 'airbnb',             nombre: 'AIRBNB friendly',                        edificio: false },
    { key: 'calentador',         nombre: 'Calentador de agua',                     edificio: false },
    { key: 'cocinaIsla',         nombre: 'Cocina con isla',                        edificio: false },
    { key: 'despensa',           nombre: 'Despensa (Pantry)',                      edificio: false },
    { key: 'lavanderia',         nombre: 'Área de lavandería',                     edificio: false },
    { key: 'cuartoServicio',     nombre: 'Cuarto de servicio',                     edificio: false },
    { key: 'ventanales',         nombre: 'Ventanales de piso a techo',             edificio: false },
    { key: 'cerraduras',         nombre: 'Cerraduras inteligentes',                edificio: false },
    { key: 'sueloRadiante',      nombre: 'Suelo radiante',                         edificio: false },
    { key: 'bodegaPrivada',      nombre: 'Bodega privada',                         edificio: false },
    { key: 'acabadosLujo',       nombre: 'Acabados de lujo',                       edificio: true },
    { key: 'sonido',             nombre: 'Sistema de sonido integrado',            edificio: false },
    { key: 'ductoBasura',        nombre: 'Ducto de basura',                        edificio: false },
    { key: 'piscina',            nombre: 'Piscina',                                edificio: true },
    { key: 'jacuzzi',            nombre: 'Jacuzzi / Spa',                          edificio: true },
    { key: 'gimnasio',           nombre: 'Gimnasio',                               edificio: true },
    { key: 'salonSocial',        nombre: 'Salón social',                           edificio: true },
    { key: 'businessCenter',     nombre: 'Business Center / Co-working',           edificio: true },
    { key: 'rooftop',            nombre: 'Roof top / Terraza',                     edificio: true },
    { key: 'padel',              nombre: 'Cancha de pádel',                        edificio: true },
    { key: 'tenis',              nombre: 'Cancha de tenis / Squash',               edificio: true },
    { key: 'fogatas',            nombre: 'Área de fogatas (Fire pits)',            edificio: true },
    { key: 'cinePrivado',        nombre: 'Cine privado',                           edificio: false },
    { key: 'salonJuegos',        nombre: 'Salón de juegos (Billar/Ping pong)',     edificio: true },
    { key: 'bar',                nombre: 'Bar / Lounge',                           edificio: true },
    { key: 'juegosInfantiles',   nombre: 'Juegos infantiles (Playground)',         edificio: true },
    { key: 'ludoteca',           nombre: 'Ludoteca',                               edificio: false },
    { key: 'petPark',            nombre: 'Parque para mascotas (Pet park)',        edificio: true },
    { key: 'petWash',            nombre: 'Estación de lavado para mascotas (Pet wash)', edificio: true },
    { key: 'senderos',           nombre: 'Senderos para caminar',                  edificio: true },
    { key: 'pinatas',            nombre: 'Área de piñatas',                        edificio: false },
    { key: 'seguridad',          nombre: 'Seguridad 24/7 (CCTV)',                  edificio: true },
    { key: 'parqueoVisitas',     nombre: 'Parqueo de visitas',                     edificio: true },
    { key: 'planta',             nombre: 'Planta eléctrica de emergencia',         edificio: true },
    { key: 'pozo',               nombre: 'Pozo de agua propio',                    edificio: true },
    { key: 'lobby',              nombre: 'Lobby / Recepción',                      edificio: false },
    { key: 'delivery',           nombre: 'Área de recepción de delivery',          edificio: false },
    { key: 'wifi',               nombre: 'Wi-Fi en áreas comunes',                 edificio: false },
    { key: 'elevadores',         nombre: 'Elevadores de alta velocidad',           edificio: false },
    { key: 'cargadores',         nombre: 'Cargadores para vehículos eléctricos',   edificio: false },
    { key: 'paneles',            nombre: 'Paneles solares',                        edificio: false },
    { key: 'herramientas',       nombre: 'Cuarto de herramientas',                 edificio: false },
    { key: 'helipuerto',         nombre: 'Helipuerto',                             edificio: false },
    { key: 'muelle',             nombre: 'Frente al muelle',                       edificio: false },
];

// Fila tipo "label: valor" para las secciones de datos
function BulletRow({ label, value }) {
    return (
        <Col md={6}>
            <div className="d-flex align-items-center gap-1">
                <span className="fs-2 lh-1">•</span>
                <span><strong>{label}:</strong> {value || '—'}</span>
            </div>
        </Col>
    );
}

function Apartament() {
    const { id } = useParams();
    const [isLg, setIsLg] = useState(window.innerWidth >= 992);

    useEffect(() => {
        const handleResize = () => setIsLg(window.innerWidth >= 992);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [project, setProject] = useState(null);
    const [mainImg, setMainImg] = useState(null);
    const t = useT();
    const requestFieldIds = {
        name: 'project-request-name',
        email: 'project-request-email',
        phone: 'project-request-phone',
        message: 'project-request-message',
    }

    // ── Drag-to-scroll para el scroll horizontal ──
    const scrollRef = useRef(null);
    const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, dragged: false });

    const handleMouseDown = (e) => {
        dragState.current = { isDown: true, startX: e.pageX - scrollRef.current.offsetLeft, scrollLeft: scrollRef.current.scrollLeft, dragged: false };
    };

    const handleMouseLeave = () => {
        dragState.current.isDown = false;
    };

    const handleMouseUp = () => {
        dragState.current.isDown = false;
    };

    const handleMouseMove = (e) => {
        if (!dragState.current.isDown) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - dragState.current.startX) * 1.5;
        if (Math.abs(walk) > 3) dragState.current.dragged = true;
        scrollRef.current.scrollLeft = dragState.current.scrollLeft - walk;
    };

    useEffect(() => {
        if (id) {
            let active = true;
            Promise.all([
                getProyectoById(id),
                getProyectosPublicos(),
            ]).then(([detailRes, listRes]) => {
                if (!active) return;
                if (detailRes.success && detailRes.data) {
                    const otros = listRes.success && Array.isArray(listRes.data) ? listRes.data : [];
                    const enrichedProject = enriquecerProyecto(detailRes.data, { otros });
                    setProject(enrichedProject);
                    setMainImg(enrichedProject.imagenPrincipal);
                }
            });
            return () => { active = false; };
        }
    }, [id]);

    const openLightbox = (startImg) => {
        const galeria = project ? project.imagenesGaleria : [];
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

    if (!project) {
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

    const amenidades = (project.amenidadKeys || []).map(key => AMENIDADES_ALL.find(a => a.key === key)).filter(Boolean);

    return (
        <>
        <Container style={{ marginTop: 'clamp(1.5rem, 3vw, 3rem)', marginBottom: 'clamp(3rem, 6vw, 6rem)' }}>

            {/* Breadcrumb */}
            <Breadcrumb className='px-3 py-1 rounder-1' style={{ "--bs-breadcrumb-divider": "'>'", fontSize: '14px', width: 'fit-content', background: '#f0f0f0' }}>
                <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>Inicio</Breadcrumb.Item>
                <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/proyectos' }}>Proyectos</Breadcrumb.Item>
                <Breadcrumb.Item active>{project.titulo}</Breadcrumb.Item>
            </Breadcrumb>

            {/* Botón atrás */}
            <div className="d-flex justify-content-end mb-2 mt-4 mt-lg-0">
                <Link to="/proyectos" title="Atrás" aria-label={t('Volver a proyectos', 'Back to projects')}>
                    <img src={arrow} style={{ width: '36px' }} alt="Atrás" />
                </Link>
            </div>

            {/* Header */}
            <div className="mb-4">

                {/* Precio + badges */}
                <div className="d-flex justify-content-between align-items-lg-end flex-column flex-lg-row">
                    <div className="d-flex flex-wrap flex-column align-items-start gap-2 mt-3">
                        <div style={{ fontSize: 'clamp(28px, 4vw, 50px)', fontFamily: 'AppleGaramond', lineHeight: 1.1 }}>
                            {project.titulo}
                        </div>
                        <div className="" style={{ fontSize: '20px' }}>
                            <i className="fa-solid fa-location-dot me-1"></i>{project.ubicacion}
                        </div>
                        <div style={{ fontSize: '20px' }}>Tipo: {project.tipo}</div>
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                            <span className="fw-bold" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>{project.precioDesdeUSD}</span>
                            <div className='d-flex align-items-center gap-2'><img src={venta} alt="icons" style={{ width: '20px' }} /> <div className= "bg-dark rounded-1 px-4 py-0 text-white fw-lighter" style={{ fontSize: '16px' }}>{project.modo}</div></div>
                        </div>
                        {/* Precio desde Q + Tasa */}
                        <div className="d-flex align-items-center gap-3 flex-wrap mt-1">
                            <span style={{ fontSize: '16px' }}><strong>{t('Precio desde', 'Starting from')} (Q):</strong> {project.precioDesdeQ}</span>
                            <span style={{ width: '1px', height: '18px', backgroundColor: '#ccc' }}></span>
                            <span style={{ fontSize: '16px' }}><strong>Tasa ($):</strong> {project.tasaUSD}</span>
                        </div>
                    </div>
                    <div className="d-flex flex-column align-items-center gap-4 me-lg-5 mt-5">
                        <div style={{ border: '1px solid black' }} className="py-2 px-4 rounded-4">APARTAMENTOS EN PREVENTA</div>
                        {/* Desktop: 3 items en fila */}
                        <div className="d-none d-lg-flex align-items-center justify-content-center gap-5">
                            <div className="d-flex align-items-center gap-2"><i className="fa-graphite fa-thin fa-buildings"></i>{project.areas.numeroPisos} Niveles</div>
                            {project.unidades ? (<>
                                <div style={{ width: '1px', height: '24px', backgroundColor: '#ccc' }}></div>
                                <div className="d-flex align-items-center gap-2"><i className="fa-sharp fa-light fa-block"></i>{project.unidades} Unidades</div>
                            </>) : null}
                            {project.fechaEntrega ? (<>
                                <div style={{ width: '1px', height: '24px', backgroundColor: '#ccc' }}></div>
                                <div className="d-flex align-items-center gap-2"><i className="fa-regular fa-calendar"></i>Entrega: {project.fechaEntrega}</div>
                            </>) : null}
                        </div>
                        {/* Móvil/tablet: 2 columnas */}
                        <div className="d-lg-none w-100">
                            <div className="d-flex align-items-center justify-content-center gap-4 mb-3">
                                <div className="d-flex align-items-center gap-2"><i className="fa-graphite fa-thin fa-buildings"></i>{project.areas.numeroPisos} Niveles</div>
                                {project.unidades ? (<>
                                    <div style={{ width: '1px', height: '24px', backgroundColor: '#ccc' }}></div>
                                    <div className="d-flex align-items-center gap-2"><i className="fa-sharp fa-light fa-block"></i>{project.unidades} Unidades</div>
                                </>) : null}
                            </div>
                            {project.fechaEntrega ? (
                                <div className="d-flex justify-content-center">
                                    <div className="d-flex align-items-center gap-2"><i className="fa-regular fa-calendar"></i>Entrega: {project.fechaEntrega}</div>
                                </div>
                            ) : null}
                        </div>
                        {/* Tour 360 */}
                        <a href={project.tour360} className="d-flex align-items-center gap-2 text-body text-decoration-none" style={{ fontSize: '16px', border: '1px solid black', borderRadius: '999px', padding: '8px 20px' }}>
                            <img src={tour} alt="tour" style={{ width: '24px' }} />
                            Tour 360
                        </a>
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
                    <div
                        className="position-absolute d-flex align-items-center gap-2"
                        style={{ bottom: '12px', left: '12px', backgroundColor: '#ffffffdd', borderRadius: '20px', padding: '4px 14px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                        onClick={e => { e.stopPropagation(); openLightbox(mainImg); }}
                    >
                        <i className="fa-regular fa-image"></i> +{project.imagenesThumbs.length} Fotos
                    </div>
                </div>
                {/* Thumbnails derecha */}
                <div className="d-flex flex-column gap-2" style={{ width: '32%', flexShrink: 0 }}>
                    {project.imagenesThumbs.map((img, i) => (
                        <div
                            key={i}
                            onClick={() => openLightbox(img)}
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
                    <div
                        className="position-absolute d-flex align-items-center gap-2"
                        style={{ bottom: '12px', left: '12px', backgroundColor: '#ffffffdd', borderRadius: '20px', padding: '4px 14px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                        onClick={e => { e.stopPropagation(); openLightbox(mainImg); }}
                    >
                        <i className="fa-regular fa-image"></i> +{project.imagenesThumbs.length} Fotos
                    </div>
                </div>
                {/* Thumbnails debajo */}
                <div className="d-flex gap-2">
                    {project.imagenesThumbs.map((img, i) => (
                        <div
                            key={i}
                            onClick={() => openLightbox(img)}
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

            {/* ── Contenido principal ── */}
            <Row className="g-5">
                {/* Columna izquierda */}
                <Col lg={7}>

                    {/* Descripción del edificio */}
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-building fs-2"></i> {t('Descripción del edificio', 'Building description')}
                        </div>
                        <div style={{ lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: project.descripcion || '' }} />

                        {/* Iconos principales */}
                        <div className="d-flex mb-4 py-3 border-top border-bottom justify-content-center align-items-center" style={{ gap: 'clamp(25px, 8vw, 70px)' }}>
                            <div>A partir de: </div>
                            <div className="text-center">
                                <i className="fa-solid fa-bed d-block mb-1" style={{ fontSize: '22px' }}></i>
                                <span style={{ fontSize: '20px', fontWeight: 600 }}>{project.camas}</span>
                            </div>
                            <div className="text-center">
                                <i className="fa-solid fa-bath d-block mb-1" style={{ fontSize: '22px' }}></i>
                                <span style={{ fontSize: '20px', fontWeight: 600 }}>{project.banos}</span>
                            </div>
                            <div className="text-center">
                                <i className="fa-solid fa-car-side d-block mb-1" style={{ fontSize: '22px' }}></i>
                                <span style={{ fontSize: '20px', fontWeight: 600 }}>{project.parqueo}</span>
                            </div>
                            <div className="text-center">
                                <i className="fa-solid fa-crop-simple d-block mb-1" style={{ fontSize: '22px' }}></i>
                                <span style={{ fontSize: '20px', fontWeight: 600 }}>{project.area}</span>
                            </div>
                        </div>
                    </div>

                    {/* Datos del proyecto */}
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-file-lines"></i> {t('Datos del proyecto', 'Project data')}
                        </div>
                        <Row className="gy-1">
                            <BulletRow label={t('Tipo', 'Type')} value={project.tipo} />
                            <BulletRow label={t('Nombre de la propiedad', 'Property name')} value={project.titulo} />
                            <BulletRow label={t('Precio desde (Q)', 'Starting price (Q)')} value={project.precioDesdeQ} />
                            <BulletRow label={t('Tasa ($)', 'Rate ($)')} value={project.tasaUSD} />
                            <BulletRow label={t('Precio desde ($)', 'Starting price ($)')} value={project.precioDesdeUSD} />
                        </Row>
                    </div>

                    {/* Ubicación y entorno */}
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-location-dot"></i> {t('Ubicación y entorno', 'Location and surroundings')}
                        </div>
                        <Row className="gy-1">
                            <BulletRow label="Departamento" value={project.location.departamento} />
                            <BulletRow label="Municipio" value={project.location.municipio} />
                            <BulletRow label="Zona" value={project.location.zona} />
                            <BulletRow label={t('Condominio', 'Condominium')} value={project.location.condominio} />
                            <BulletRow label={t('Dirección exacta', 'Exact address')} value={project.location.direccionExacta} />
                            <BulletRow label="Coordenadas GPS" value={project.location.gps} />
                            <BulletRow label={t('Relación con el agua', 'Water supply')} value={project.location.relacionAgua} />
                            <BulletRow label={t('Vista', 'View')} value={project.location.vista} />
                            <BulletRow label={t('Tipo de calle', 'Street type')} value={project.location.tipoCalle} />
                        </Row>
                    </div>

                    {/* Áreas y dimensiones */}
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-chart-area"></i> {t('Áreas y dimensiones', 'Areas and dimensions')}
                        </div>
                        <Row className="gy-1">
                            <BulletRow label="Área de terreno (m²)" value={project.areas.terrenoM2} />
                            <BulletRow label="Área de terreno (v²)" value={project.areas.terrenoV2} />
                            <BulletRow label="Área de construcción (m²)" value={project.areas.construccionM2} />
                            <BulletRow label={t('Número de pisos', 'Number of floors')} value={project.areas.numeroPisos} />
                        </Row>
                    </div>

                    {/* Estructura y obra gris */}
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-trowel-bricks"></i> {t('Estructura y obra gris', 'Structure and gray work')}
                        </div>
                        <Row className="gy-1">
                            <BulletRow label={t('Año de construcción', 'Year built')} value={project.estructura.anioConstruccion} />
                            <BulletRow label={t('Niveles del edificio', 'Building levels')} value={project.estructura.niveles} />
                            <BulletRow label={t('Muro perimetral', 'Perimeter wall')} value={project.estructura.muroPerimetral} />
                        </Row>
                    </div>

                    {/* Modelos disponibles */}
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-thin fa-diagram-lean-canvas"></i> {t('Modelos disponibles', 'Available models')}
                        </div>
                        <div
                            className="scroll-moderno-horizontal"
                            ref={scrollRef}
                            onMouseDown={handleMouseDown}
                            onMouseLeave={handleMouseLeave}
                            onMouseUp={handleMouseUp}
                            onMouseMove={handleMouseMove}
                            style={{ cursor: 'grab', userSelect: 'none' }}
                            onDragStart={e => e.preventDefault()}
                        >
                            {project.modelos.map((m, i) => (
                                <div key={i} style={{ flex: isLg ? '0 0 calc(50% - 0.5rem)' : '0 0 100%', width: isLg ? 'calc(50% - 0.5rem)' : '100%' }}>
                                    <Link
                                        to={getModelPath(id, m)}
                                        className="d-flex justify-content-center align-items-center gap-1 mt-2 text-body text-decoration-none"
                                        onClick={e => { if (dragState.current.dragged) { e.preventDefault(); dragState.current.dragged = false; } }}
                                    >
                                        <div className="border rounded-1 overflow-hidden w-100">
                                            <div className="position-relative">
                                                <img src={m.img} alt={m.nombre} className="w-100 object-fit-cover" style={{ aspectRatio: '4 / 4' }} draggable={false} />
                                            </div>
                                            <div className="p-3">
                                                <div className="fw-bold" style={{ fontSize: '24px' }}>{m.nombre}</div>
                                                <div className="text-muted" style={{ fontSize: '12px' }}>{t('Desde', 'From')}</div>
                                                <div className="fw-bold">{m.precioDesdeUSD}</div>
                                                <div className="text-muted" style={{ fontSize: '12px' }}>(Q {m.precioDesdeQ.replace('Q ', '')})</div>
                                                <hr />
                                                <div className="d-flex justify-content-around align-items-center gap-2 mt-2 text-muted" style={{ fontSize: '12px' }}>
                                                    <span><i className="fa-solid fa-crop-simple me-1"></i>{m.area}</span>
                                                    <span><i className="fa-solid fa-bed me-1"></i>{m.camas}</span>
                                                    <span><i className="fa-solid fa-bath me-1"></i>{m.banos}</span>
                                                </div>
                                                <hr />
                                                <div className="d-flex justify-content-center align-items-center gap-1 mt-2 text-body text-decoration-none">
                                                    {t('Ver disponibilidad', 'Check availability')} <i className="fa-solid fa-angle-right ms-1"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Amenidades del edificio */}
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-umbrella-beach"></i> {t('Amenidades del edificio', 'Building amenities')}
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                            {amenidades.map((a, i) => (
                                <span key={i} className="border border-black rounded-pill px-3 py-2" style={{ color: '#333', fontWeight: 400 }}>
                                    {a.nombre}{a.edificio ? ' *' : ''}
                                </span>
                            ))}
                        </div>
                        <div className="small text-muted mt-3" style={{ fontSize: '13px' }}>
                            * = {t('Amenidad exclusiva del edificio. El resto corresponden a los apartamentos.', 'Building-only amenity. The rest belong to the apartments.')}
                        </div>
                    </div>

                </Col>

                {/* Columna derecha — sidebar */}
                <Col lg={5}>
                    <div className="sticky-lg-top" style={{ top: '100px' }}>

                        {/* Desarrollado por */}
                        <div className="p-3 my-5">
                            <div className="mb-3 fs-3">{t('Desarrollado por', 'Developed by')}</div>
                            <div className="d-flex align-items-start justify-content-between align-items-lg-center flex-column flex-md-row gap-4">
                                <Link to="" className='text-body' aria-label="Ver desarrolladora del proyecto">
                                    <div className="d-flex align-items-center gap-2">
                                        <div className='rounded-circle' style={{ width: '60px', height: '60px' }}><img src={project.desarrolladora.logo} alt="Avatar" style={{ width: '60px', height: '60px' }} className='rounded-circle object-fit-cover' /></div>
                                        <div>
                                            <div className='lh-sm'>{project.desarrolladora.nombre}</div>
                                            <div style={{ fontSize: '12px' }}>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                                <div className="d-flex justify-content-md-end flex-column">
                                    <div className='mb-2 lh-1' style={{ fontSize: '20px' }}><FormattedMessage id="home.text12" /></div>
                                    <a href="" target='_blank' className="rounded-1 text-center border-0 py-1" style={{ backgroundColor: 'black', color: 'white', boxSizing: 'border-box', padding: '2px 8px' }} rel="noreferrer" aria-label="Contactar por WhatsApp a la desarrolladora"><i className="fa-brands fa-whatsapp me-2" aria-hidden="true"></i> <FormattedMessage id="home.text13" /></a>
                                </div>
                            </div>
                        </div>

                        {/* Solicitar información */}
                        <div className="mb-4">
                            <div className="mb-3 fs-3">{t('Solicitar información', 'Request information')}</div>
                            <div className="d-flex flex-column gap-2">
                                <label htmlFor={requestFieldIds.name} className="visually-hidden">Nombre</label>
                                <Form.Control id={requestFieldIds.name} placeholder="Nombre" aria-label="Nombre" style={{ fontSize: '14px', borderRadius: '4px' }} />
                                <label htmlFor={requestFieldIds.email} className="visually-hidden">Correo electrónico</label>
                                <Form.Control id={requestFieldIds.email} placeholder="Correo electrónico" aria-label="Correo electrónico" style={{ fontSize: '14px', borderRadius: '4px' }} />
                                <label htmlFor={requestFieldIds.phone} className="visually-hidden">Teléfono</label>
                                <Form.Control id={requestFieldIds.phone} placeholder="Teléfono" aria-label="Teléfono" style={{ fontSize: '14px', borderRadius: '4px' }} />
                                <label htmlFor={requestFieldIds.message} className="visually-hidden">Mensaje</label>
                                <Form.Control
                                    id={requestFieldIds.message}
                                    as="textarea"
                                    rows={3}
                                    defaultValue={`Estoy interesado en la propiedad: ${project.titulo}`}
                                    aria-label="Mensaje"
                                    style={{ fontSize: '14px', borderRadius: '4px' }}
                                />
                                <button className="btn btn-dark w-100 rounded-1 py-2 mt-1">ENVIAR</button>
                            </div>
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

            {/* ── Otras propiedades ── */}
            <div style={{ marginTop: 'clamp(2rem, 10vw, 6rem)', marginBottom: 'clamp(2rem, 10vw, 6rem)' }}>
                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-5 gap-3 gap-lg-0">
                    <div style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontFamily: 'AppleGaramond' }}>
                        {t('Otras propiedades', 'Other properties')}
                    </div>
                    <Link to="/proyectos" className="link-more-black d-flex align-items-center gap-2">
                        {t('Ver más', 'See more')} <i className="fa-solid fa-angle-right"></i>
                    </Link>
                </div>

                <div className="row gy-5">
                    {project.otrosPropiedades.map((item, i) => (
                        <div key={i} className="col-md-6 col-xl-4">
                            <div className="position-relative d-block">
                                <Link to={`/proyectos/apartamento/${item.id || 'torre-platino'}`} className="d-block propiedades-zoom">
                                    <img
                                        src={item.img}
                                        className="object-fit-cover w-100 border-radius-1"
                                        style={{ aspectRatio: '4 / 4' }}
                                        alt={item.titulo}
                                    />
                                    <div style={{ padding: '5%' }} className="position-absolute top-0 w-100 h-100 d-flex flex-column justify-content-between">
                                        <div className="d-flex gap-2 align-items-center" style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', padding: '3px 10px', fontSize: '14px' }}>
                                            <img src={diamond} style={{ width: '14px' }} alt="" /> {t('Destacado', 'Featured')}
                                        </div>
                                        <div className="d-flex justify-content-end align-items-center gap-2">
                                            <div className="favorite-icon unlike" style={{ cursor: 'pointer' }}>
                                                <i className="fa-solid fa-heart"></i>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                            <Link className="text-body text-decoration-none" to={`/proyectos/apartamento/${item.id || 'torre-platino'}`}>
                                <div className="mt-3">
                                    <div className="text-truncate" style={{ fontSize: 'clamp(34px, 6vw, 44px)', fontFamily: 'AppleGaramond' }}>
                                        {item.titulo}
                                    </div>
                                    <div>{item.ubicacion}</div>
                                    <div>Tipo: {item.tipo}</div>
                                    <div className="my-2" style={{ fontSize: '14px' }}>{t('A partir de:', 'Starting from:')}</div>
                                    <div className="d-flex icons-small-description gap-4">
                                        <div><i className="fa-solid fa-bed me-2"></i>{item.camas}</div>
                                        <div><i className="fa-solid fa-bath me-2"></i>{item.banos}</div>
                                        <div><i className="fa-solid fa-car-side me-2"></i>{item.parqueo}</div>
                                        <div><i className="fa-solid fa-crop-simple me-2"></i>{item.area}</div>
                                    </div>
                                    <div className="mt-2 fw-bold fs-4 text-dark d-flex align-items-center gap-4">
                                        {item.precio}
                                        <div className="d-flex align-items-center gap-2">
                                            <img src={venta} alt="modo" style={{ width: '20px' }} />
                                            <div className="bg-dark rounded-1 px-4 py-0 text-white fw-lighter" style={{ fontSize: '16px' }}>
                                                <FormattedMessage id="favorite.text3" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>

        </Container>
        </>
    );
}

export default Apartament;
