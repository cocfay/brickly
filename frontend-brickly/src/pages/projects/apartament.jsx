import { useState, useEffect, useRef } from "react";
import { Container, Row, Col, Breadcrumb, Form, Badge } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.min.css';

import '../../assets/css/proyectos.css'

import img1  from '../../assets/images/proyecto/edificio.png';
import img2  from '../../assets/images/proyecto/Modelo1.png';
import img3  from '../../assets/images/proyecto/Modelo2.png';
import img5 from '../../assets/images/proyecto/Modelo3.png';

import i1  from '../../assets/images/proyecto/T1.png';
import i2  from '../../assets/images/proyecto/T2.png';
import i3  from '../../assets/images/proyecto/T3.png';
import i4  from '../../assets/images/proyecto/T4.png';
import i5  from '../../assets/images/proyecto/A1.png';
import i6  from '../../assets/images/proyecto/A2.png';
import i7  from '../../assets/images/proyecto/A3.png';
import i8  from '../../assets/images/proyecto/R1.png';
import i9  from '../../assets/images/proyecto/R2.png';
import i10  from '../../assets/images/proyecto/R3.png';

import a2  from '../../assets/images/proyecto/RP.png';
import a3  from '../../assets/images/proyecto/AP.png';


import diamond from '../../assets/images/iconos/diamond.png';
import venta   from '../../assets/images/iconos/venta.png';
import company from '../../assets/images/proyecto/logo.png';
import arrow   from '../../assets/images/iconos/arrow.png';
import { useT } from '../../hooks/useT';

// ── Datos de proyectos base ─────────────────────────────────────
// Cada proyecto puede definir sus propios campos opcionales:
//   descripcion       → texto libre para la sección "Descripción"
//   imagenPrincipal   → imagen principal de la galería (import o URL)
//   imagenesThumbs    → array de imágenes para los thumbnails laterales
//   imagenesGaleria   → array completo de imágenes para el lightbox
//   ubicacionEntorno  → array de strings para "Ubicación y entorno"
//   estructuras       → array de strings para "Estructuras y áreas"
// Si alguno de estos campos no se define, se usará el valor generado automáticamente.
const BASE_PROJECTS = [
    {
        id: 'torre-platino',
        titulo: 'Torre Platino',
        ubicacion: 'Guatemala, Santa Catarina Pínula, Zona 10',
        tipo: 'Casa',
        precio: '$3,301.28',
        modo: 'Venta',
        camas: 4, banos: 5, parqueo: 2, area: '260m²',
        visitas: 7,
        // ── Contenido personalizado ──────────────────────────────
        descripcion: 'Enclavada entre la elegancia de la Zona Viva y la imponente presencia de los volcanes, se alza la Torre Platino. Con 16 niveles de altura, su fachada de cristal reflectante y acero pulido evoca su nombre: un monolito contemporáneo que captura la luz del altiplano y la convierte en un símbolo de prestigio.Rodeada de los epicentros del poder y el ocio, la torre se encuentra a pasos de centros comerciales como Centro Comercial Las Majadas y Zona Viva, donde los restaurantes de alta cocina, los bares más exclusivos y las galerías de arte marcan el pulso cosmopolita. A unos minutos, el Hotel Real Intercontinental y la Torre Los Proceres refuerzan el carácter corporativo y distinguido del área, mientras que el Edificio Europlaza y la Zona de Bancos aseguran que todo, desde una reunión de negocios hasta un brunch de domingo, ocurra a la distancia de un ascensor.Amenidades como un gimnasio de última generación con vista al sur, una piscina climatizada en la azotea (la única en su tipo en la zona), sala de coworking con café de especialidad, sky lounge para eventos y un servicio de conserjería las 24 horas completan una propuesta que no solo es un hogar, sino una declaración de estatus', // ej: 'Torre Platino es una residencia exclusiva...'
        imagenPrincipal: img1,       // ej: img1
        imagenesThumbs: [i2, i3],        // ej: [img2, img3]
        imagenesGaleria: [img1, i1, i2, i3, i4],       // ej: [img1, img2, img3]
        ubicacionEntorno: undefined,      // ej: ['Zona Viva', 'Vista a los volcanes']
        estructuras: undefined,           // ej: ['Altura de techo: 3.20m', 'Pisos: 12']
    },
    {
        id: 'altura-verde',
        titulo: 'Altura Verde',
        ubicacion: 'Guatemala, Guatemala, Zona 10',
        tipo: 'Apartamento',
        precio: '$243,135.38',
        modo: 'Venta',
        camas: 5, banos: 4, parqueo: 1, area: '480m²',
        visitas: 2,
        // ── Contenido personalizado ──────────────────────────────
        descripcion: undefined,
        imagenPrincipal: a3,
        imagenesThumbs: [i5, i6],
        imagenesGaleria: [a3, i5, i6, i7],
        ubicacionEntorno: undefined,
        estructuras: undefined,
    },
    {
        id: 'residencia-alma',
        titulo: 'Residencia Alma',
        ubicacion: 'Guatemala, Guatemala, Zona 15',
        tipo: 'Apartamento',
        precio: '$1,200.00',
        modo: 'Venta',
        camas: 3, banos: 2, parqueo: 2, area: '125m²',
        visitas: 9,
        // ── Contenido personalizado ──────────────────────────────
        descripcion: undefined,
        imagenPrincipal: a2,
        imagenesThumbs: [i8, i9],
        imagenesGaleria: [a2, i8, i9, i10],
        ubicacionEntorno: undefined,
        estructuras: undefined,
    },
];

// ── Funciones de generación de datos ───────────────────────────
const getProjectById = (id) => {
    return BASE_PROJECTS.find(project => project.id === id);
};

const generateDescription = (project) => {
    if (project.tipo === 'Casa') {
        return `${project.titulo} es una residencia exclusiva ubicada en ${project.ubicacion}. Esta ${project.tipo.toLowerCase()} cuenta con ${project.camas} habitaciones, ${project.banos} baños y ${project.parqueo} espacios de parqueo en un área de ${project.area}. Diseñada con los más altos estándares de calidad y confort, ofrece un estilo de vida premium en una ubicación privilegiada.`;
    } else {
        return `${project.titulo} se ubica en ${project.ubicacion} como un desarrollo de vanguardia. Sus apartamentos cuentan con ventanales de piso a techo, terrazas privadas y acabados de lujo. Cada unidad ofrece ${project.camas} habitaciones, ${project.banos} baños y ${project.parqueo} espacios de parqueo en un área de ${project.area}. Un vestíbulo de recepción y seguridad 24/7 garantizan privacidad y tranquilidad.`;
    }
};

const generateModels = (project) => {
    const baseModels = [
        { nombre: 'Modelo Horizonte', precio: '$1,350,000', area: '480 m²', camas: 3, banos: 2, img: img2 },
        { nombre: 'Modelo Ópalo', precio: '$1,445,000', area: '495 m²', camas: 3, banos: 2, img: img3 },
        { nombre: 'Modelo Otagon', precio: '$1,285,000', area: '585 m²', camas: 4, banos: 5, img: img3 },
    ];
    
    // Personalizar modelos según el proyecto
    return baseModels.map((model, index) => ({
        ...model,
        nombre: `Modelo ${model.nombre.split(' ')[1]}`,
        precio: `$${(parseFloat(project.precio.replace(/[^0-9.]/g, '')) * (0.8 + index * 0.2)).toFixed(2)}`,
        area: `${parseInt(project.area) + (index * 50)} m²`,
        camas: project.camas + index,
        banos: project.banos + index,
    }));
};

const generateLocationFeatures = (ubicacion) => {
    const features = [];
    if (ubicacion.includes('Zona 10')) {
        features.push('Zona Viva', 'Plaza Fontabella', 'Tipo de calle: Adoquinada', 'Vista: A los volcanes');
    } else if (ubicacion.includes('Zona 15')) {
        features.push('Área residencial exclusiva', 'Parques cercanos', 'Tipo de calle: Asfaltada', 'Vista: Panorámica');
    } else {
        features.push('Entorno tranquilo', 'Acceso a servicios', 'Tipo de calle: Mixta', 'Vista: Natural');
    }
    return features;
};

const generateStructures = (area, camas) => {
    return [
        `Altura de techo (m): ${parseInt(area) > 300 ? '3.20' : '2.80'}`,
        'Muro perimetral: Sí',
        `Número de pisos: ${camas > 4 ? '16' : '12'}`,
        `Capacidad de almacenamiento (m²): ${parseInt(area) / 100}`,
    ];
};

const generateAmenities = (tipo) => {
    const baseAmenities = [
        'Gimnasio equipado', 'Piscina infinity', 'Seguridad 24/7', 'Acabados de lujo',
        'Elevadores de alta velocidad', 'Lobby / Recepción', 'Roof top / Terraza',
    ];
    
    if (tipo === 'Casa') {
        return [...baseAmenities, 'Jardín privado', 'Terraza propia', 'Cocina integral'];
    } else {
        return [...baseAmenities, 'Business Center / Co-working', 'Parqueo de visitas', 'Sala de eventos'];
    }
};

const generateOtherProperties = (currentProjectId) => {
    return BASE_PROJECTS
        .filter(project => project.id !== currentProjectId)
        .map(project => ({
            id: project.id,
            titulo: project.titulo,
            ubicacion: project.ubicacion,
            tipo: project.tipo,
            precio: project.precio,
            modo: project.modo,
            visitas: project.visitas,
            img: project.imagenPrincipal,
        }));
};

const generateProjectData = (baseProject) => {
    return {
        ...baseProject,
        // Usa el valor personalizado si está definido, si no genera uno automático
        descripcion:      baseProject.descripcion      ?? generateDescription(baseProject),
        ubicacionEntorno: baseProject.ubicacionEntorno ?? generateLocationFeatures(baseProject.ubicacion),
        estructuras:      baseProject.estructuras      ?? generateStructures(baseProject.area, baseProject.camas),
        // Imágenes: usa las del proyecto o las globales por defecto
        imagenPrincipal:  baseProject.imagenPrincipal  ?? img1,
        imagenesThumbs:   baseProject.imagenesThumbs   ?? [i2, i3],
        imagenesGaleria:  baseProject.imagenesGaleria  ?? [i2, i3, i4],
        // Campos siempre generados
        entrega: `$${(parseFloat(baseProject.precio.replace(/[^0-9.]/g, '')) * 0.05).toFixed(2)}`,
        modelos: generateModels(baseProject),
        amenidades: generateAmenities(baseProject.tipo),
        otrosPropiedades: generateOtherProperties(baseProject.id),
    };
};

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
            const baseProject = getProjectById(id);
            if (baseProject) {
                const enrichedProject = generateProjectData(baseProject);
                setProject(enrichedProject);
                setMainImg(enrichedProject.imagenPrincipal);
            }
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
                        <div className="d-flex align-items-center gap-3">
                            <span className="fw-bold" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>{project.precio}</span>
                            <div className='d-flex align-items-center gap-2'><img src={venta} alt="icons" style={{ width: '20px' }} /> <div className= "bg-dark rounded-1 px-4 py-0 text-white fw-lighter" style={{ fontSize: '16px' }}>{project.modo}</div></div>
                        </div>
                    </div>
                    <div className="d-flex flex-column align-items-center gap-4 me-lg-5 mt-5">
                        <div style={{ border: '1px solid black' }} className="py-2 px-4 rounded-4">APARTAMENTOS EN PREVENTA</div>
                        {/* Desktop: 3 items en fila */}
                        <div className="d-none d-lg-flex align-items-center justify-content-center gap-5">
                            <div className="d-flex align-items-center gap-2"><i className="fa-graphite fa-thin fa-buildings"></i>14 Niveles</div>
                            <div style={{ width: '1px', height: '24px', backgroundColor: '#ccc' }}></div>
                            <div className="d-flex align-items-center gap-2"><i className="fa-sharp fa-light fa-block"></i>105 Unidades</div>
                            <div style={{ width: '1px', height: '24px', backgroundColor: '#ccc' }}></div>
                            <div className="d-flex align-items-center gap-2"><i className="fa-regular fa-calendar"></i>Entrega: 12/2027</div>
                        </div>
                        {/* Móvil/tablet: 2 columnas */}
                        <div className="d-lg-none w-100">
                            <div className="d-flex align-items-center justify-content-center gap-4 mb-3">
                                <div className="d-flex align-items-center gap-2"><i className="fa-graphite fa-thin fa-buildings"></i>14 Niveles</div>
                                <div style={{ width: '1px', height: '24px', backgroundColor: '#ccc' }}></div>
                                <div className="d-flex align-items-center gap-2"><i className="fa-sharp fa-light fa-block"></i>105 Unidades</div>
                            </div>
                            <div className="d-flex justify-content-center">
                                <div className="d-flex align-items-center gap-2"><i className="fa-regular fa-calendar"></i>Entrega: 12/2027</div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* <div className="d-flex flex-wrap align-items-center gap-3 mt-3">
                    <span className="fw-bold" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>{PROYECTO.precio}</span>
                    <div className='d-flex align-items-center gap-2'><img src={venta} alt="icons" style={{ width: '20px' }} /> <div className= "bg-dark rounded-1 px-4 py-0 text-white fw-lighter" style={{ fontSize: '16px' }}>Venta</div></div>
                    <span className="badge bg-dark rounded-1 px-3 py-2" style={{ fontSize: '13px' }}>
                        <i className="fa-solid fa-building me-1"></i> Apartamentos disponibles: 14
                    </span>
                    <span className="badge bg-secondary rounded-1 px-3 py-2" style={{ fontSize: '13px' }}>
                        <i className="fa-solid fa-info-circle me-1"></i> Información
                    </span>
                    <span className="badge rounded-1 px-3 py-2" style={{ fontSize: '13px', backgroundColor: '#005051' }}>
                        <i className="fa-solid fa-key me-1"></i> Al día de entrega
                    </span>
                    <span className="fw-bold" style={{ fontSize: '16px' }}>Entrega {PROYECTO.entrega}</span>
                </div> */}
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

                    {/* Descripción */}
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-building fs-2"></i> Descripción
                        </div>
                        <p style={{ lineHeight: 1.8 }}>{project.descripcion}</p>

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

                    {/* Modelos disponibles */}
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-thin fa-diagram-lean-canvas"></i> Modelos disponibles
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
                                        to="/proyectos/apartamento/piso"
                                        state={{ apartamentoId: id }}
                                        className="d-flex justify-content-center align-items-center gap-1 mt-2 text-body text-decoration-none"
                                        onClick={e => { if (dragState.current.dragged) { e.preventDefault(); dragState.current.dragged = false; } }}
                                    >
                                        <div className="border rounded-1 overflow-hidden w-100">
                                            <div className="position-relative">
                                                <img src={m.img} alt={m.nombre} className="w-100 object-fit-cover" style={{ aspectRatio: '4 / 4' }} draggable={false} />
                                            </div>
                                            <div className="p-3">
                                                <div className="fw-bold" style={{ fontSize: '24px' }}>{m.nombre}</div>
                                                <div className="text-muted" style={{ fontSize: '12px' }}>Desde</div>
                                                <div className="fw-bold">{m.precio}</div>
                                                <hr />
                                                <div className="d-flex justify-content-around align-items-center gap-2 mt-2 text-muted" style={{ fontSize: '12px' }}>
                                                    <span><i className="fa-solid fa-crop-simple me-1"></i>{m.area}</span>
                                                    <span><i className="fa-solid fa-bed me-1"></i>{m.camas}</span>
                                                    <span><i className="fa-solid fa-bath me-1"></i>{m.banos}</span>
                                                </div>
                                                <hr />
                                                <div className="d-flex justify-content-center align-items-center gap-1 mt-2 text-body text-decoration-none">
                                                    Ver disponibilidad <i className="fa-solid fa-angle-right ms-1"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Ubicación y entorno */}
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-location-dot"></i> Ubicación y entorno
                        </div>
                        <Row className="gy-1">
                            {project.ubicacionEntorno.map((item, i) => (
                                <Col md={6} key={i}><div className="d-flex align-items-center gap-1"><span className="fs-2 lh-1">•</span> {item}</div></Col>
                            ))}
                        </Row>
                    </div>

                    {/* Estructuras y áreas */}
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-trowel-bricks"></i> Estructuras y áreas
                        </div>
                        <Row className="gy-1">
                            {project.estructuras.map((item, i) => (
                                <Col md={6} key={i}><div className="d-flex align-items-center gap-1"><span className="fs-2 lh-1">•</span> {item}</div></Col>
                            ))}
                        </Row>
                    </div>

                    {/* Amenidades */}
                    <div className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-umbrella-beach"></i> Amenidades
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                            {project.amenidades.map((a, i) => (
                                <span key={i} className="border border-black rounded-pill px-3 py-2" style={{color: '#333', fontWeight: 400 }}>
                                    {a}
                                </span>
                            ))}
                        </div>
                    </div>

                </Col>

                {/* Columna derecha — sidebar */}
                <Col lg={5}>
                    <div className="sticky-lg-top" style={{ top: '100px' }}>

                        {/* Desarrollado por */}
                        <div className="p-3 my-5">
                            <div className="mb-3 fs-3">Desarrollado por</div>
                            <div className="d-flex align-items-start justify-content-between align-items-lg-center flex-column flex-md-row gap-4">
                                <Link to="" className='text-body' aria-label="Ver desarrolladora del proyecto">
                                    <div className="d-flex align-items-center gap-2">
                                        <div className='rounded-circle' style={{ width: '60px', height: '60px' }}><img src={company} alt="Avatar" style={{ width: '60px', height: '60px' }} className='rounded-circle object-fit-cover' /></div>
                                        <div>
                                            <div className='lh-sm'>Desarrollos Inmobiliarios  <br /> <span>Alta Vista</span></div>
                                            <div style={{ fontSize: '12px' }}>
                                                {/* <StarRating rating={items.ratingAverage} size='11px' /> */}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                                <div className="d-flex justify-content-md-end flex-column">
                                    <div className='mb-2 lh-1' style={{fontSize: '20px'}}><FormattedMessage id="home.text12" /></div>
                                    <a href="" target='_blank' className="rounded-1 text-center border-0 py-1" style={{ backgroundColor: 'black', color: 'white', boxSizing: 'border-box', padding: '2px 8px' }} rel="noreferrer" aria-label="Contactar por WhatsApp a la desarrolladora"><i className="fa-brands fa-whatsapp me-2" aria-hidden="true"></i> <FormattedMessage id="home.text13" /></a>
                                </div>
                            </div>
                        </div>
                        {/* <div className="p-3 my-5">
                            <div className="mb-3" style={{ fontSize: '20px' }}>Desarrollado por</div>
                            <div className="d-flex align-items-center gap-3">
                                <img src={company} alt="company" className="object-fit-conver rounded-circle" style={{ width: '60px', height: '60px' }} />
                                <div className="d-flex flex-column align-items-start gap-2">
                                    <span>Desarrolladora Inmobiliaria Alta Vista</span>
                                    <button className="btn btn-dark btn-sm rounded-1 px-3">
                                        <i className="fa-brands fa-whatsapp me-2"></i>Contactar
                                    </button>
                                </div>
                            </div>
                        </div> */}

                        {/* Solicitar información */}
                        <div className="mb-4">
                            <div className="mb-3 fs-3">Solicitar información</div>
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
                                <i className="fa-regular fa-earth-africa me-2"></i>Ubicación geográfica
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
                        Otras propiedades
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
                                            <img src={diamond} style={{ width: '14px' }} alt="" /> Destacado
                                        </div>
                                        <div className="d-flex justify-content-end align-items-center gap-2">
                                            <div style={{ backgroundColor: '#000000c7', color: 'white', padding: '3px 10px', fontSize: '12px' }}>
                                                Visualizaciones: {item.visitas}
                                            </div>
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
                                    <div className="my-2" style={{ fontSize: '14px' }}>A partir de:</div>
                                    <div className="d-flex icons-small-description gap-4">
                                        <div><i className="fa-solid fa-bed me-2"></i>3</div>
                                        <div><i className="fa-solid fa-bath me-2"></i>4</div>
                                        <div><i className="fa-solid fa-car-side me-2"></i>2</div>
                                        <div><i className="fa-solid fa-crop-simple me-2"></i>480m²</div>
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
