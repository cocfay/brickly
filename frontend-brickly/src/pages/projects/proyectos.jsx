import { useState } from "react";
import { Container, InputGroup, Form, Button, Dropdown, ButtonGroup } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import Select from "react-select";

import img1  from '../../assets/images/proyecto/edificio.png';
import img2  from '../../assets/images/proyecto/AP.png';
import img3  from '../../assets/images/proyecto/RP.png';
import img4  from '../../assets/images/imagenes_de_casas/img7.webp';
import img5 from '../../assets/images/imagenes_de_casas/Casa1.webp';
import img6  from '../../assets/images/imagenes_de_casas/img6.webp';
import img7 from '../../assets/images/imagenes_de_casas/Casa2.webp';
import img8  from '../../assets/images/imagenes_de_casas/img8.webp';
import img9  from '../../assets/images/imagenes_de_casas/img9.webp';

import diamond from '../../assets/images/iconos/diamond.png';
import alquiler from '../../assets/images/iconos/alquiler.png';
import venta    from '../../assets/images/iconos/venta.png';
import { useT } from '../../hooks/useT';

const BASE = [
    {
        id: 'torre-platino',
        titulo: 'Torre Platino',
        ubicacion: 'Guatemala, Santa Catarina Pínula, Zona 10',
        tipo: 'Casa',
        precio: '$3,301.28',
        modo: 'Venta',
        camas: 4, banos: 5, parqueo: 2, area: '260m²',
        visitas: 7,
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
    },
];

const IMGS = [img1, img2, img3, img1, img2, img3, img1, img2, img3];

const TODOS = IMGS.map((img, i) => ({ ...BASE[i % 3], img }));

function Proyectos() {
    const [search, setSearch]   = useState('');
    const [mode,   setMode]     = useState('Todos');
    const [tipo,   setTipo]     = useState('Todos');
    const [beds,   setBeds]     = useState('Cualquiera');
    const [baths,  setBaths]    = useState('Cualquiera');

    const t = useT();

    return (
        <Container>
            {/* Título */}
            <div className="mt-3 mt-lg-5">
                <div style={{ fontSize: 'clamp(20px, 3vw, 28px)' }}>
                    {t('Explora proyectos únicos', 'Explore unique projects')}
                </div>
            </div>

            {/* ── Barra de filtros — idéntica a propiedades ── */}
            <div className="mt-0 mt-lg-4 bg-white py-4 sticky-top-ajustado">
                <div className="d-flex gap-2 align-items-center flex-wrap filterProperties">

                    {/* Buscador */}
                    <InputGroup className="flex-grow-1" style={{ maxWidth: '400px' }}>
                        <Form.Control
                            placeholder={t('Buscar por nombre o zona', 'Search by name or area')}
                            className="border-dark border-end-0"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ fontSize: '14px' }}
                        />
                        <Button variant="dark" className="border-dark border-start-0">
                            <i className="fa-solid fa-magnifying-glass"></i>
                        </Button>
                    </InputGroup>

                    {/* Botón filtros móvil */}
                    <Button variant="outline-dark" className="d-lg-none">
                        <i className="fa-solid fa-sliders me-2"></i>Filtros
                    </Button>

                    {/* Venta y Alquiler */}
                    <Dropdown className="d-none d-lg-block">
                        <Dropdown.Toggle variant={mode !== 'Todos' ? 'dark' : 'outline-dark'} style={{ fontSize: '14px' }}>
                            {mode === 'Todos' ? t('Venta y Alquiler', 'Sales and Rentals') : mode}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            {['Todos', 'Venta', 'Alquiler'].map(m => (
                                <div key={m} className="px-3 py-1" style={{ cursor: 'pointer' }} onClick={() => setMode(m)}>
                                    <Form.Check type="radio" label={m === 'Todos' ? t('Venta y Alquiler', 'Sales and Rentals') : m}
                                        name="mode" checked={mode === m} onChange={() => {}} readOnly />
                                </div>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>

                    {/* Precio (visual) */}
                    <Dropdown autoClose="outside" className="d-none d-lg-block">
                        <Dropdown.Toggle variant="outline-dark" style={{ fontSize: '14px' }}>
                            {t('Precio', 'Price')}
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="p-3 shadow border-0" style={{ width: 'min(300px, 90vw)' }}>
                            <h6 className="mb-3">{t('Rango de precio', 'Price range')}</h6>
                            <Form.Range min={0} max={1000000} defaultValue={0} />
                            <Form.Range min={0} max={1000000} defaultValue={1000000} />
                            <div className="d-flex gap-2 align-items-center mt-3">
                                <Form.Control size="sm" defaultValue="Q 0.00" readOnly />
                                <span>–</span>
                                <Form.Control size="sm" defaultValue="Q 1,000,000.00" readOnly />
                            </div>
                        </Dropdown.Menu>
                    </Dropdown>

                    {/* Tipo */}
                    <Dropdown className="d-none d-lg-block">
                        <Dropdown.Toggle variant={tipo !== 'Todos' ? 'dark' : 'outline-dark'} style={{ fontSize: '14px' }}>
                            {tipo === 'Todos' ? t('Tipo', 'Type') : tipo}
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="p-2 shadow border-0">
                            {['Todos', 'Casa', 'Apartamento', 'Bodega', 'Terreno', 'Oficina'].map(tp => (
                                <div key={tp} className="px-3 py-1" style={{ cursor: 'pointer' }} onClick={() => setTipo(tp)}>
                                    <Form.Check type="radio" label={tp} name="typeProp"
                                        checked={tipo === tp} onChange={() => {}} readOnly />
                                </div>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>

                    {/* Camas y Baños */}
                    <Dropdown autoClose="outside" className="d-none d-lg-block">
                        <Dropdown.Toggle
                            variant={(beds !== 'Cualquiera' || baths !== 'Cualquiera') ? 'dark' : 'outline-dark'}
                            style={{ fontSize: '14px' }}
                        >
                            {beds === 'Cualquiera' && baths === 'Cualquiera'
                                ? t('Camas y Baños', 'Bedrooms and Bathroom')
                                : `${beds} C, ${baths} B`}
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="p-3 shadow border-0" style={{ width: 'fit-content' }}>
                            <p className="small fw-bold mb-2">{t('Habitaciones', 'Bedrooms')}</p>
                            <ButtonGroup size="sm" className="w-100 mb-3">
                                {['Cualquiera', '1+', '2+', '3+', '4+', '5+'].map(v => (
                                    <Button key={v} variant={beds === v ? 'dark' : 'outline-dark'} onClick={() => setBeds(v)}>{v}</Button>
                                ))}
                            </ButtonGroup>
                            <p className="small fw-bold mb-2">{t('Baños', 'Baths')}</p>
                            <ButtonGroup size="sm" className="w-100">
                                {['Cualquiera', '1+', '1.5+', '2+', '3+', '4+'].map(v => (
                                    <Button key={v} variant={baths === v ? 'dark' : 'outline-dark'} onClick={() => setBaths(v)}>{v}</Button>
                                ))}
                            </ButtonGroup>
                        </Dropdown.Menu>
                    </Dropdown>

                    {/* Ubicación */}
                    <Dropdown autoClose="outside" className="d-none d-lg-block">
                        <Dropdown.Toggle variant="outline-dark" style={{ fontSize: '14px' }}>
                            {t('Ubicación', 'Location')}
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="p-3 shadow border-0" style={{ minWidth: '280px' }}>
                            <p className="small fw-bold mb-2">Departamento</p>
                            <Select placeholder="Seleccione..." isClearable options={[]} />
                            <p className="small fw-bold mb-2 mt-3">Municipio</p>
                            <Select placeholder="Seleccione..." isClearable isDisabled options={[]} />
                            <p className="small fw-bold mb-2 mt-3">Zona</p>
                            <Select placeholder="Seleccione..." isClearable isDisabled options={[]} />
                        </Dropdown.Menu>
                    </Dropdown>

                    {/* Ordenar por */}
                    <Select
                        options={[
                            { value: 1, label: t('Más recientes', 'Most recent') },
                            { value: 2, label: t('Más antiguos', 'Older') },
                            { value: 3, label: t('Precio: menor a mayor', 'Price: lowest to highest') },
                            { value: 4, label: t('Precio: mayor a menor', 'Price: highest to lowest') },
                        ]}
                        placeholder={t('Ordenar por', 'Order by')}
                        isSearchable={false}
                        styles={{
                            control: (base) => ({
                                ...base,
                                flexWrap: 'nowrap',
                                fontSize: '14px',
                                minHeight: 'unset',
                                height: '35.33px',
                                borderColor: '#000',
                                boxShadow: 'none',
                                outline: 'none',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                '&:hover': { borderColor: '#000' },
                            }),
                            indicatorsContainer: (base) => ({ ...base, height: '35.33px', alignItems: 'center' }),
                            indicatorSeparator: (base) => ({ ...base, alignSelf: 'center', height: '60%' }),
                            valueContainer: (base) => ({ ...base, flexWrap: 'nowrap', overflow: 'hidden', height: '35.33px', padding: '0 8px', alignItems: 'center' }),
                            menu: (base) => ({ ...base, minWidth: 'max-content' }),
                            option: (base, state) => ({
                                ...base,
                                fontSize: '14px',
                                whiteSpace: 'nowrap',
                                backgroundColor: state.isSelected ? '#000' : state.isFocused ? '#e9e9e9' : '#fff',
                                color: state.isSelected ? '#fff' : '#000',
                            }),
                        }}
                        components={{
                            ValueContainer: ({ children, ...props }) => (
                                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', flexWrap: 'nowrap', flex: 1, minWidth: 0, height: '35.33px', paddingLeft: '8px', paddingRight: '4px' }}>
                                <i className="fa-solid fa-arrow-up-short-wide me-2" style={{ flexShrink: 0 }}></i>
                                <div style={{ display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', overflow: 'hidden' }}>{children}</div>
                                </div>
                            ),
                            SingleValue: ({ children }) => (
                                <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>{children}</div>
                            )
                        }}
                    />
                </div>
            </div>

            {/* ── Grid de proyectos ── */}
            <div style={{ marginTop: 'clamp(2rem, 3vw, 3rem)' }}>
                <div className="row gy-5" style={{ marginBottom: 'clamp(5rem, 10vw, 9rem)' }}>
                    {TODOS.map((item, index) => {
                        const isVenta = item.modo === 'Venta';
                        return (
                            <div className="col-md-6 col-xl-4" key={index}>
                                <Link to={`/proyectos/apartamento/${item.id}`} className="text-body">
                                    {/* Imagen */}
                                    <div className="position-relative d-block propiedades-zoom">
                                        <img
                                            src={item.img}
                                            className="object-fit-cover w-100 border-radius-1"
                                            style={{ aspectRatio: '4 / 4' }}
                                            alt={item.titulo}
                                        />
                                        <div style={{ padding: '5%' }} className="position-absolute top-0 w-100 h-100 d-flex flex-column justify-content-between">
                                            <div className="d-flex gap-2 align-items-center" style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', padding: '3px 10px', fontSize: '14px' }}>
                                                <img src={diamond} style={{ width: '14px' }} alt="" />
                                                <FormattedMessage id="home.text31" />
                                            </div>
                                            <div className="d-flex justify-content-end align-items-center gap-2">
                                                <div style={{ backgroundColor: '#000000c7', color: 'white', padding: '3px 10px', fontSize: '12px' }}>
                                                    <FormattedMessage id="home.text8" />: {item.visitas}
                                                </div>
                                                <div className="favorite-icon unlike" style={{ cursor: 'pointer' }}>
                                                    <i className="fa-solid fa-heart"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="mt-3">
                                        <div className="text-truncate" style={{ fontSize: 'clamp(34px, 6vw, 44px)', fontFamily: 'AppleGaramond' }}>
                                            {item.titulo}
                                        </div>
                                        <div><i className="fa-solid fa-location-dot me-1"></i>{item.ubicacion}</div>
                                        <div><FormattedMessage id="home.text9" />: {item.tipo}</div>

                                        {/* A partir de */}
                                        <div className="mt-3 text-muted" style={{ fontSize: '14px' }}>
                                            {t('A partir de', 'Starting from')}
                                        </div>

                                        {/* Iconos */}
                                        <div className="d-flex icons-small-description gap-4">
                                            <div title={t('Habitaciones', 'Bedrooms')}>
                                                <i className="fa-solid fa-bed me-2"></i>{item.camas}
                                            </div>
                                            <div title={t('Baños', 'Baths')}>
                                                <i className="fa-solid fa-bath me-2"></i>{item.banos}
                                            </div>
                                            <div title={t('Parqueo', 'Parking')}>
                                                <i className="fa-solid fa-car-side me-2"></i>{item.parqueo}
                                            </div>
                                            <div title={t('Área', 'Area')}>
                                                <i className="fa-solid fa-crop-simple me-2"></i>{item.area}
                                            </div>
                                        </div>

                                        {/* Precio + modo */}
                                        <div className="mt-2 fw-bold fs-4 text-dark d-flex align-items-center gap-4">
                                            {item.precio}
                                            <div className="d-flex align-items-center gap-2">
                                                <img src={isVenta ? venta : alquiler} alt="modo" style={{ width: '20px' }} />
                                                <div
                                                    className="rounded-1 px-4 py-0 text-white fw-lighter"
                                                    style={{ fontSize: '16px', backgroundColor: isVenta ? '#000' : '#B65740' }}
                                                >
                                                    {isVenta
                                                        ? <FormattedMessage id="favorite.text3" />
                                                        : <FormattedMessage id="favorite.text4" />
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Ver todas */}
            <div className="d-flex justify-content-center" style={{ marginBottom: 'clamp(3rem, 6vw, 6rem)' }}>
                <Link to="/propiedades" className="link-more-black d-flex align-items-center gap-2">
                    {t('VER TODAS', 'VIEW ALL')} <i className="fa-solid fa-angle-right"></i>
                </Link>
            </div>

        </Container>
    );
}

export default Proyectos;
