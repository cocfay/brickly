import { useState, useEffect } from "react";
import { Container, Row, Col, Breadcrumb, Button, Form } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.min.css';

import img0  from '../../assets/images/proyecto/edificio.png';
import M2  from '../../assets/images/proyecto/m1.png';
import M3  from '../../assets/images/proyecto/m2.png';
import M4  from '../../assets/images/proyecto/m3.png';
import M5  from '../../assets/images/proyecto/m4.png';
import img9  from '../../assets/images/imagenes_de_casas/img9.webp';
import Casa1 from '../../assets/images/proyecto/T3.png';
import m1  from '../../assets/images/proyecto/Modelo1.png';
import m2 from '../../assets/images/proyecto/Modelo2.png';
import m3  from '../../assets/images/proyecto/Modelo3.png';

import tour    from '../../assets/images/iconos/IconoTour.png';
import arrow   from '../../assets/images/iconos/arrow.png';
import company from '../../assets/images/proyecto/logo.png';
import { useT } from '../../hooks/useT';

// ── Datos hardcodeados ──────────────────────────────────────────
const MODELO = {
    nombre: 'Modelo Horizonte',
    piso: 'Piso 0',
    descripcion: 'El Modelo Horizonte redefine el concepto de habitar Guatemala. Con 210 metros cuadrados cuidadosamente diseñados, este apartamento de tres recámaras con habitación de servicio no es solo un espacio: es una experiencia sensorial que equilibra la calma del altiplano con la energía vibrante de la Zona Viva. La sala principal se integra al comedor mediante una pared de espejos biselados que duplica la sensación de amplitud y multiplica las vistas. El piso es de porcelanato rectificado en tono humo que imita la piedra volcánica, mientras que el plafón incorpora iluminación LED regulable con escenas preprogramadas: Amanecer, Cocktail y Noche estrellada. La cocina, abierta pero discreta, está equipada con isla central de cuarzo blanco, grifería negra mate, electrodomésticos integrados Bosch y una despensa oculta con sistema de organización vertical. Una barra desayunadora con asientos de cuero respira hacia el área social, permitiendo conversar mientras se cocina con vista a los volcanes.',
    camas: 4,
    banos: 5,
    parqueo: 3,
    area: '890 m²',
    distribucion: {
        totalAmbientes: 5,
        parqueo: 2,
        areaLavanderia: 'Al aire libre',
        salaTaller: 'Sala de Principal',
        habitacionServicio: 'Con baño propio',
        numeroPisos: 6,
        estudiosOPPA: 51,
    },
    dimensiones: {
        areaConstruccion: '475',
        capacidadAlmacenamiento: '5',
    },
    precio: '$1,350,000',
    unidad: 'Torre 1 (Descripción)',
};

const PISOS = [
    {
        piso: 'Piso 2',
        nombre: 'Modelo Horizonte',
        unidad: 'Torre 1 - Apartamento B3039',
        precio: '$1,350,000',
        disponibles: 14,
        area: '460 m²',
        camas: 3,
        banos: 2,
        img: m1,
    },
    {
        piso: 'Piso 4',
        nombre: 'Modelo Horizonte',
        unidad: 'Torre 3 - Apartamento 1001A',
        precio: '$1,450,000',
        disponibles: 8,
        area: '460 m²',
        camas: 3,
        banos: 2,
        img: m2,
    },
    {
        piso: 'Piso 6',
        nombre: 'Modelo Horizonte',
        unidad: 'Torre 4 - Apartamento C4837',
        precio: '$1,550,000',
        disponibles: 5,
        area: '460 m²',
        camas: 6,
        banos: 4,
        img: m3,
    },
];

const MAS_MODELOS = [
    { nombre: 'Modelo Horizonte', precio: '$1,350,000', area: '480 m²', camas: 3, banos: 2, img: m1 },
    { nombre: 'Modelo Ópalo',     precio: '$1,445,000', area: '495 m²', camas: 3, banos: 2, img: m2 },
    { nombre: 'Modelo Horizonte', precio: '$1,350,000', area: '480 m²', camas: 3, banos: 2, img: m3 },
];

// Galería principal
const GALERIA = [m1, M2, M3, M4, M5];

function Floor() {
    const [mainImg, setMainImg] = useState(GALERIA[0]);
    const [isLg, setIsLg] = useState(window.innerWidth >= 992);
    const t = useT();
    const location = useLocation();
    const apartamentoId = location.state?.apartamentoId ?? 'torre-platino';

    useEffect(() => {
        const handleResize = () => setIsLg(window.innerWidth >= 992);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const openLightbox = (startImg) => {
        const elements = GALERIA.map(img => ({ href: img, type: 'image' }));
        const startAt = GALERIA.indexOf(startImg);
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

    return (
        <Container style={{ marginTop: 'clamp(1.5rem, 3vw, 3rem)', marginBottom: 'clamp(3rem, 6vw, 6rem)' }}>

            {/* Breadcrumb */}
            <Breadcrumb className='px-3 py-1 rounder-1' style={{ "--bs-breadcrumb-divider": "'>'", fontSize: '14px', width: 'fit-content', background: '#f0f0f0' }} >
                <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>Inicio</Breadcrumb.Item>
                <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/proyectos' }}>Proyectos</Breadcrumb.Item>
                <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/proyectos' }}>Torre Platino</Breadcrumb.Item>
                <Breadcrumb.Item active>Modelo Horizonte</Breadcrumb.Item>
            </Breadcrumb>

            {/* Botón atrás */}
            <div className="d-flex justify-content-end mb-3 mt-4 mt-lg-0">
                <Link to={`/proyectos/apartamento/${apartamentoId}`} title="Atrás">
                    <img src={arrow} style={{ width: '36px' }} alt="Atrás" />
                </Link>
            </div>


            {/* Info proyecto */}
            <div className="mb-4">
                <div style={{ fontSize: 'clamp(28px, 4vw, 50px)', fontFamily: 'AppleGaramond', lineHeight: 1.1 }}>
                    Torre Platino
                </div>
                <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: '20px' }}>
                    <i className="fa-solid fa-location-dot me-1"></i>
                    Guatemala, Guatemala, Zona 10
                </div>
                <div style={{ fontSize: '20px' }}>Tipo: Apartamento</div>
            </div>
            <Row className="g-5">
                {/* ── Columna izquierda ── */}
                <Col lg={4}>
                    {/* Lista de pisos/modelos */}
                    <div
                        className={isLg ? "scroll-moderno pe-3" : "d-flex gap-3 pb-2 scroll-moderno-horizontal"}
                        style={isLg ? { maxHeight: '550px', overflowY: 'auto' } : { overflowX: 'auto', flexWrap: 'nowrap' }}
                    >
                        {PISOS.map((piso, i) => (
                        <Link
                            to="/proyectos/apartament/floor"
                            className="text-body card-floor"
                            style={!isLg ? { flex: '0 0 100%', minWidth: '100%' } : {}}
                        >
                             <div className="position-relative mt-5">
                                <div className="position-absolute start-0" style={{ top: '-24px' }}>
                                    <div className="label text-white px-4 pt-0 pb-4 rounded-2">{piso.piso}</div>
                                </div>
                                <div
                                    key={i}
                                    className="border rounded-4 p-3 mb-3 position-relative"
                                    style={{ cursor: 'pointer', backgroundColor: '#fff', zIndex: '2' }} >
                                    <div className="fw-bold text-truncate" style={{ fontSize: '20px' }}>{piso.nombre}</div>
                                    <div className="text-muted" style={{ fontSize: '14px' }}>{piso.unidad}</div>
                                    <div className="d-flex align-items-center justify-content-between my-3">
                                        <div className="fw-bold mt-1" style={{  }}>{piso.precio}</div>
                                        {/* <div className="text-muted d-flex align-items-center gap-1 mt-1" style={{ fontSize: '12px' }}>
                                            <i className="fa-duotone fa-solid fa-key me-1"></i>
                                            {piso.disponibles} unidades disponibles
                                        </div> */}
                                    </div>
                                    <hr />
                                    <div className="d-flex justify-content-around gap-3 mt-2" style={{ fontSize: '14px' }}>
                                        <span><i className="fa-solid fa-crop-simple me-1"></i>{piso.area}</span>
                                        <span><i className="fa-solid fa-bed me-1"></i>{piso.camas} Habitaciones</span>
                                        <span><i className="fa-solid fa-bath me-1"></i>{piso.banos} Baños</span>
                                    </div>
                                    <hr />
                                </div>
                            </div>
                        </Link>
                        ))}
                    </div>

                    {/* Desarrollado por */}
                    <div className="p-3 my-5">
                        <div className="mb-3 fs-3">Desarrollado por</div>
                        <div className="d-flex align-items-center gap-3">
                            <img src={company} alt="company" className="object-fit-conver rounded-circle" style={{ width: '60px', height: '60px' }} />
                            <div className="d-flex flex-column align-items-start gap-2">
                                <span>Desarrolladora Inmobiliarias <br /> Alta Vista</span>
                                <button className="btn btn-dark btn-sm rounded-1 px-3">
                                    <i className="fa-brands fa-whatsapp me-2"></i>Contactar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Solicitar información */}
                    <div>
                        <div className="mb-3 fs-3" >Solicitar información</div>
                        <div className="d-flex flex-column gap-2">
                            <Form.Control placeholder="Nombre" style={{ fontSize: '14px', borderRadius: '4px' }} />
                            <Form.Control placeholder="Correo electrónico" style={{ fontSize: '14px', borderRadius: '4px' }} />
                            <Form.Control placeholder="Teléfono" style={{ fontSize: '14px', borderRadius: '4px' }} />
                            <Form.Control
                                as="textarea"
                                rows={4}
                                defaultValue={`Estoy interesado en la propiedad: Torre Platino, Modelo Horizonte`}
                                style={{ fontSize: '14px', borderRadius: '4px' }}
                            />
                            <button className="btn btn-dark w-100 rounded-1 py-2 mt-1">ENVIAR</button>
                        </div>
                    </div>
                </Col>

                {/* ── Columna derecha ── */}
                <Col lg={8}>
                    {/* Título + tour virtual */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="lh-1" style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontFamily: 'AppleGaramond' }}>
                            {MODELO.nombre}
                        </div>
                        <a href="#" className="d-flex align-items-center gap-2 text-body text-decoration-none" style={{ fontSize: '18px' }}>
                            <img src={tour} alt="tour" style={{ width: '30px' }} />
                            Tour virtual
                        </a>
                    </div>

                    {/* Galería */}
                    {isLg ? (
                    <div className="d-flex gap-2 mb-4" style={{ height: 'clamp(320px, 45vw, 520px)' }}>
                        {/* Thumbnails izquierda */}
                        <div className="d-flex flex-column gap-2" style={{ width: '28%', flexShrink: 0 }}>
                            {GALERIA.slice(1, 4).map((img, i) => (
                                <div
                                    key={i}
                                    onClick={() => { setMainImg(img); openLightbox(img); }}
                                    style={{
                                        flex: 1,
                                        minHeight: 0,
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        cursor: 'zoom-in',
                                        transition: 'border 0.2s, opacity 0.2s',
                                    }}
                                >
                                    <img
                                        src={img}
                                        alt=""
                                        className="object-fit-cover w-100 h-100"
                                        style={{ display: 'block' }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Imagen principal derecha */}
                        <div
                            className="flex-grow-1 position-relative"
                            style={{ borderRadius: '14px', overflow: 'hidden', cursor: 'zoom-in' }}
                            onClick={() => openLightbox(m1)}
                        >
                            <img
                                src={m1}
                                alt="Principal"
                                className="w-100 h-100 object-fit-cover"
                                style={{ display: 'block' }}
                            />
                            {/* Badge fotos */}
                            <div
                                className="position-absolute d-flex align-items-center gap-2"
                                style={{
                                    bottom: '12px', left: '12px',
                                    backgroundColor: '#ffffffdd',
                                    borderRadius: '20px',
                                    padding: '4px 14px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                                onClick={e => { e.stopPropagation(); openLightbox(m1); }}
                            >
                                <i className="fa-regular fa-image"></i>
                                +{GALERIA.length - 1} Fotos
                            </div>
                            {/* Favorito */}
                            <div
                                className="position-absolute favorite-icon unlike"
                                style={{ bottom: '12px', right: '12px', cursor: 'pointer' }}
                                onClick={e => e.stopPropagation()}
                            >
                                <i className="fa-solid fa-heart"></i>
                            </div>
                        </div>
                    </div>
                    ) : (
                    <div className="d-flex flex-column gap-2 mb-4">
                        {/* Imagen principal arriba */}
                        <div
                            className="position-relative w-100"
                            style={{ borderRadius: '14px', overflow: 'hidden', cursor: 'zoom-in', aspectRatio: '16/9' }}
                            onClick={() => openLightbox(m1)}
                        >
                            <img
                                src={m1}
                                alt="Principal"
                                className="w-100 h-100 object-fit-cover"
                                style={{ display: 'block' }}
                            />
                            {/* Badge fotos */}
                            <div
                                className="position-absolute d-flex align-items-center gap-2"
                                style={{
                                    bottom: '12px', left: '12px',
                                    backgroundColor: '#ffffffdd',
                                    borderRadius: '20px',
                                    padding: '4px 14px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                                onClick={e => { e.stopPropagation(); openLightbox(m1); }}
                            >
                                <i className="fa-regular fa-image"></i>
                                +{GALERIA.length - 1} Fotos
                            </div>
                            {/* Favorito */}
                            <div
                                className="position-absolute favorite-icon unlike"
                                style={{ bottom: '12px', right: '12px', cursor: 'pointer' }}
                                onClick={e => e.stopPropagation()}
                            >
                                <i className="fa-solid fa-heart"></i>
                            </div>
                        </div>
                        {/* Thumbnails debajo */}
                        <div className="d-flex gap-2">
                            {GALERIA.slice(1, 4).map((img, i) => (
                                <div
                                    key={i}
                                    onClick={() => { setMainImg(img); openLightbox(img); }}
                                    style={{
                                        flex: 1,
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        cursor: 'zoom-in',
                                        aspectRatio: '4/4',
                                        transition: 'border 0.2s, opacity 0.2s',
                                    }}
                                >
                                    <img
                                        src={img}
                                        alt=""
                                        className="object-fit-cover w-100 h-100"
                                        style={{ display: 'block' }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    )}

                    {/* Descripción */}
                    <div className="mb-4">
                        <div className="d-flex align-items-center gap-2 mb-2 fs-3">
                            <i className="fa-sharp fa-regular fa-building"></i> Descripción
                        </div>
                        <p style={{lineHeight: 1.7 }}>{MODELO.descripcion}</p>
                    </div>

                    {/* Iconos principales */}
                    <div className="d-flex mb-4 py-3 border-top border-bottom justify-content-center" style={{ gap: 'clamp(45px, 8vw, 100px)' }}>
                        <div className="text-center">
                            <i className="fa-solid fa-bed d-block mb-1" style={{ fontSize: '22px' }}></i>
                            <span style={{ fontSize: '20px', fontWeight: 600 }}>{MODELO.camas}</span>
                        </div>
                        <div className="text-center">
                            <i className="fa-solid fa-bath d-block mb-1" style={{ fontSize: '22px' }}></i>
                            <span style={{ fontSize: '20px', fontWeight: 600 }}>{MODELO.banos}</span>
                        </div>
                        <div className="text-center">
                            <i className="fa-solid fa-car-side d-block mb-1" style={{ fontSize: '22px' }}></i>
                            <span style={{ fontSize: '20px', fontWeight: 600 }}>{MODELO.parqueo}</span>
                        </div>
                        <div className="text-center">
                            <i className="fa-solid fa-crop-simple d-block mb-1" style={{ fontSize: '22px' }}></i>
                            <span style={{ fontSize: '20px', fontWeight: 600 }}>{MODELO.area}</span>
                        </div>
                    </div>

                    {/* Distribución de ambientes */}
                    <div className="mb-4">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3">
                            <i className="fa-sharp fa-regular fa-tree-city"></i> Distribución de ambientes
                        </div>
                        <Row className="gy-2">
                            <Col md={6} className="d-flex flex-column gap-2">
                                <div className="d-flex align-items-center gap-1"><span className="fs-2 lh-1">•</span> Total de Ambientes: {MODELO.distribucion.totalAmbientes}</div>
                                <div className="d-flex align-items-center gap-1"><span className="fs-2 lh-1">•</span> Área de lavandería: {MODELO.distribucion.areaLavanderia}</div>
                                <div className="d-flex align-items-center gap-1"><span className="fs-2 lh-1">•</span> Sala taller: {MODELO.distribucion.salaTaller}</div>
                            </Col>
                            <Col md={6} className="d-flex flex-column gap-2">
                                <div className="d-flex align-items-center gap-1"><span className="fs-2 lh-1">•</span> Habitación de servicio: {MODELO.distribucion.habitacionServicio}</div>
                                <div className="d-flex align-items-center gap-1"><span className="fs-2 lh-1">•</span> Número de pisos: {MODELO.distribucion.numeroPisos}</div>
                                <div className="d-flex align-items-center gap-1"><span className="fs-2 lh-1">•</span> Estudios/OPPA: {MODELO.distribucion.estudiosOPPA}</div>
                            </Col>
                        </Row>
                    </div>

                    {/* Dimensiones y áreas */}
                    <div className="mb-4">
                        <div className="d-flex align-items-center gap-2 mb-3 fs-3" >
                            <i className="fa-sharp fa-regular fa-chart-area"></i> Dimensiones y áreas
                        </div>
                        <div className="d-flex flex-column gap-3">
                            <div className="d-flex align-items-center gap-1"><span className="fs-2 lh-1">•</span> Área de construcción (m²): {MODELO.dimensiones.areaConstruccion}</div>
                            <div className="d-flex align-items-center gap-1"><span className="fs-2 lh-1">•</span> Capacidad de almacenamiento (m²): {MODELO.dimensiones.capacidadAlmacenamiento}</div>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* ── Explora más modelos ── */}
            <div style={{ marginTop: 'clamp(2rem, 10vw, 6rem)', marginBottom: 'clamp(2rem, 10vw, 6rem)' }}>
                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-5 gap-3 gap-lg-0">
                    <div style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontFamily: 'AppleGaramond' }}>
                        Explora más modelos
                    </div>
                    <Link to="/proyectos" className="link-more-black d-flex align-items-center gap-2">
                        Ver todos <i className="fa-solid fa-angle-right"></i>
                    </Link>
                </div>

                <div className="row gy-5 align-items-start">
                    {MAS_MODELOS.map((m, i) => (
                        <div key={i} className="col-md-6 col-xl-4">
                            <Link to="/proyectos/apartament" className="d-block text-body border rounded-3">
                                <div className="position-relative d-block propiedades-zoom">
                                    <img
                                        src={m.img}
                                        className="object-fit-cover w-100 border-radius-1"
                                        alt={m.nombre}
                                        style={{ aspectRatio: '4 / 4' }}
                                    />
                                   {/*  <div style={{ padding: '5%' }} className="position-absolute top-0 w-100 h-100 d-flex flex-column justify-content-between">
                                        <div></div>
                                        <div className="d-flex justify-content-end align-items-center gap-2">
                                            <div className="favorite-icon unlike" style={{ cursor: 'pointer' }}>
                                                <i className="fa-solid fa-heart"></i>
                                            </div>
                                        </div>
                                    </div> */}
                                </div>
                                <div className="mt-3 px-4 pb-4">
                                    <div className="text-truncate" style={{ fontSize: 'clamp(34px, 6vw, 46px)', fontFamily: 'AppleGaramond' }}>
                                        {m.nombre}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '14px' }}>Desde</div>
                                    <div className="mt-2 fw-bold fs-4 text-dark">{m.precio}</div>
                                    <hr />
                                    <div className="d-flex justify-content-around icons-small-description gap-4 mt-2">
                                        <div><i className="fa-solid fa-crop-simple me-2"></i>{m.area}</div>
                                        <div><i className="fa-solid fa-bed me-2"></i>{m.camas} Habitaciones</div>
                                        <div><i className="fa-solid fa-bath me-2"></i>{m.banos} Baños</div>
                                    </div>
                                    <hr />
                                    <div className="d-flex justify-content-center align-items-center gap-1 mt-3 text-body">
                                        Ver disponibilidad <i className="fa-solid fa-angle-right ms-1"></i>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>

        </Container>
    );
}

export default Floor;
