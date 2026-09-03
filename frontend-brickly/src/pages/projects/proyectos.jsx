import { useState, useMemo, useEffect } from "react";
import { Container, InputGroup, Form, Button, Dropdown, ButtonGroup } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import Select from "react-select";

import diamond from '../../assets/images/iconos/diamond.png';
import alquiler from '../../assets/images/iconos/alquiler.png';
import venta    from '../../assets/images/iconos/venta.png';
import '../../assets/css/propiedades.css';
import { useT } from '../../hooks/useT';
import { getProyectosPublicos } from '../../cpanel/services/proyectos';
import { mapProyectoToCard } from '../../utils/proyectosUtils';
import { useFavoriteProjects } from '../../hooks/useFavoriteProjects';
import { isAuthenticated } from '../../services/authService';

const PRICE_VISUAL_MAX = 20000000;
const MAX_SIZE_LIMIT = 10000000;
const PAGE_SIZE = 6;
const TIPO_PROYECTO_OPCIONES = ['Todos', 'Apartamento', 'Bodega', 'Casa', 'Oficinas'];
const tipoModeloDelFiltro = (tipo) => (tipo === 'Oficinas' ? 'Oficina' : tipo);

const formatUSDInput = (val) => {
  const num = String(val).replace(/[^0-9]/g, '');
  if (!num) return '';
  return '$ ' + num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const formatCurrencyShort = (value) => {
  if (value >= 1000000) return '$' + (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (value >= 1000) return '$' + (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return '$' + value.toString();
};

const isValidLocation = (val) => val && !['ninguno', 'nunguno', 'none'].includes(val.toLowerCase());

const selectStyles = {
    control: (base) => ({
        ...base,
        borderColor: '#000',
        '&:hover': { borderColor: '#000' },
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#000' : state.isFocused ? '#e9e9e9' : '#fff',
        color: state.isSelected ? '#fff' : '#000',
        ':active': { backgroundColor: '#000', color: '#fff' },
    }),
};

function Proyectos() {
    const t = useT();
    const { isFavorite, toggle: toggleFav, canFavorite } = useFavoriteProjects();

    const [filters, setFilters] = useState({
        search: '',
        mode: 'Todos',
        type: 'Todos',
        minPrice: 0,
        maxPrice: PRICE_VISUAL_MAX,
        beds: 'Cualquiera',
        baths: 'Cualquiera',
        department: null,
        municipality: null,
        zone: null,
        featured: false,
        exclusive: false,
        minSize: 0,
        maxSize: MAX_SIZE_LIMIT,
    });
    const [sliderPrice, setSliderPrice] = useState({ min: 0, max: PRICE_VISUAL_MAX });
    const [sliderSize, setSliderSize] = useState({ min: 0, max: MAX_SIZE_LIMIT });
    const [sortOption, setSortOption] = useState(null);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const [proyectos, setProyectos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    useEffect(() => {
        let active = true;
        setLoading(true);
        getProyectosPublicos()
            .then(({ success, data }) => {
                if (!active) return;
                if (success && Array.isArray(data)) {
                    setProyectos(data.map(mapProyectoToCard));
                }
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    // Opciones de ubicación derivadas de los datos
    const deptOptions = [...new Set(proyectos.map(p => p.department).filter(isValidLocation))].sort().map(d => ({ value: d, label: d }));
    const muniOptions = filters.department
        ? [...new Set(proyectos.filter(p => p.department === filters.department).map(p => p.municipality).filter(isValidLocation))].sort().map(m => ({ value: m, label: m }))
        : [];
    const zoneOptions = filters.municipality
        ? [...new Set(proyectos.filter(p => p.department === filters.department && p.municipality === filters.municipality).map(p => p.zone).filter(isValidLocation))].sort().map(z => ({ value: z, label: z }))
        : [];

    const isFiltering = useMemo(() => (
        filters.search !== '' ||
        filters.mode !== 'Todos' ||
        filters.type !== 'Todos' ||
        filters.beds !== 'Cualquiera' ||
        filters.baths !== 'Cualquiera' ||
        filters.department != null ||
        filters.municipality != null ||
        filters.zone != null ||
        filters.featured ||
        filters.exclusive ||
        filters.minPrice > 0 ||
        filters.maxPrice < PRICE_VISUAL_MAX ||
        filters.minSize > 0 ||
        filters.maxSize < MAX_SIZE_LIMIT
    ), [filters]);

    const filtered = useMemo(() => {
        return proyectos.filter(item => {
            const matchesSearch = !filters.search
                || item.titulo.toLowerCase().includes(filters.search.toLowerCase())
                || item.ubicacion.toLowerCase().includes(filters.search.toLowerCase());
            const matchesMode = filters.mode === 'Todos' || item.modo === filters.mode;
            const matchesType = filters.type === 'Todos'
                || (item.modelos || []).some((m) => m.tipo === tipoModeloDelFiltro(filters.type));
            const matchesPrice = item.priceNum >= filters.minPrice && item.priceNum <= filters.maxPrice;

            const bedsVal = parseInt(filters.beds);
            const skipBedsFilter = filters.type === 'Terreno' || filters.type === 'Finca';
            const matchesBeds = skipBedsFilter || filters.beds === 'Cualquiera' || item.camas >= bedsVal;
            const matchesBaths = skipBedsFilter || filters.baths === 'Cualquiera' || item.banos >= parseFloat(filters.baths);

            const matchesDept = !filters.department || item.department === filters.department;
            const matchesMuni = !filters.municipality || item.municipality === filters.municipality;
            const matchesZone = !filters.zone || item.zone === filters.zone;
            const matchesFeatured = !filters.featured || item.featured?.isActive === true;
            const matchesExclusive = !filters.exclusive || item.exclusive === true;
            const matchesSize = filters.type !== 'Bodega' || (item.areaNum >= filters.minSize && item.areaNum <= filters.maxSize);

            return matchesSearch && matchesMode && matchesType && matchesPrice && matchesBeds && matchesBaths && matchesDept && matchesMuni && matchesZone && matchesFeatured && matchesExclusive && matchesSize;
        });
    }, [filters, proyectos]);

    const dataOptions = [
        { value: 0, label: t('Destacadas', 'Featured') },
        { value: 10, label: t('Exclusivas', 'Exclusive') },
        { value: 1, label: t('Más recientes', 'Most recent') },
        { value: 2, label: t('Más antiguos', 'Older') },
        { value: 3, label: t('Precio venta: menor a mayor', 'Selling price: from lowest to highest') },
        { value: 4, label: t('Precio venta: mayor a menor', 'Selling price: highest to lowest') },
        { value: 5, label: t('Precio alquiler: menor a mayor', 'Rental price: from lowest to highest') },
        { value: 6, label: t('Precio alquiler: mayor a menor', 'Rental price: highest to lowest') },
        { value: 7, label: t('Más vistos', 'Most viewed') },
        { value: 8, label: t('Mayor área de terreno', 'Larger land area') },
        { value: 9, label: t('Menor area de terreno', 'Smaller land area') },
    ];

    const sortedProyectos = useMemo(() => {
        const list = [...filtered];

        const comparators = {
            0: (a, b) => (b.featured?.isActive ? 1 : 0) - (a.featured?.isActive ? 1 : 0) || (b.visitas - a.visitas),
            10: (a, b) => (b.exclusive ? 1 : 0) - (a.exclusive ? 1 : 0) || (b.visitas - a.visitas),
            1: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
            2: (a, b) => (a.createdAt || 0) - (b.createdAt || 0),
            3: (a, b) => (b.modo === 'Venta' ? 1 : 0) - (a.modo === 'Venta' ? 1 : 0) || (a.priceNum - b.priceNum),
            4: (a, b) => (b.modo === 'Venta' ? 1 : 0) - (a.modo === 'Venta' ? 1 : 0) || (b.priceNum - a.priceNum),
            5: (a, b) => (b.modo === 'Alquiler' ? 1 : 0) - (a.modo === 'Alquiler' ? 1 : 0) || (a.priceNum - b.priceNum),
            6: (a, b) => (b.modo === 'Alquiler' ? 1 : 0) - (a.modo === 'Alquiler' ? 1 : 0) || (b.priceNum - a.priceNum),
            7: (a, b) => b.visitas - a.visitas,
            8: (a, b) => b.areaNum - a.areaNum,
            9: (a, b) => a.areaNum - b.areaNum,
        };

        const cmp = sortOption ? comparators[sortOption.value] : comparators[0];
        return cmp ? list.sort(cmp) : list;
    }, [filtered, sortOption]);

    const handleSelect = (category, value) => {
        setVisibleCount(PAGE_SIZE);
        if (category === 'minPrice' || category === 'maxPrice') {
            const numeric = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) || 0 : value;
            const newMin = category === 'minPrice' ? numeric : sliderPrice.min;
            const newMax = category === 'maxPrice' ? numeric : sliderPrice.max;
            const clampedMin = category === 'minPrice' && numeric > newMax ? newMax : newMin;
            const clampedMax = category === 'maxPrice' && numeric < newMin ? newMin : newMax;
            setSliderPrice({ min: clampedMin, max: clampedMax });
            setFilters(prev => ({ ...prev, minPrice: clampedMin, maxPrice: clampedMax }));
            return;
        }
        if (category === 'minSize' || category === 'maxSize') {
            const numeric = typeof value === 'number' ? value : parseInt(value) || 0;
            const newMin = category === 'minSize' ? numeric : sliderSize.min;
            const newMax = category === 'maxSize' ? numeric : sliderSize.max;
            const clampedMin = category === 'minSize' && numeric > newMax ? newMax : newMin;
            const clampedMax = category === 'maxSize' && numeric < newMin ? newMin : newMax;
            setSliderSize({ min: clampedMin, max: clampedMax });
            setFilters(prev => ({ ...prev, minSize: clampedMin, maxSize: clampedMax }));
            return;
        }
        setSortOption(null);
        if (category === 'type' && (value === 'Finca' || value === 'Terreno')) {
            setFilters(prev => ({ ...prev, type: value, beds: 'Cualquiera', baths: 'Cualquiera' }));
        } else {
            setFilters(prev => ({ ...prev, [category]: value }));
        }
    };

    const handleClearFilters = () => {
        setFilters({
            search: '', mode: 'Todos', type: 'Todos',
            minPrice: 0, maxPrice: PRICE_VISUAL_MAX,
            beds: 'Cualquiera', baths: 'Cualquiera',
            department: null, municipality: null, zone: null,
            featured: false, exclusive: false,
            minSize: 0, maxSize: MAX_SIZE_LIMIT,
        });
        setSliderPrice({ min: 0, max: PRICE_VISUAL_MAX });
        setSliderSize({ min: 0, max: MAX_SIZE_LIMIT });
        setSortOption(null);
        setVisibleCount(PAGE_SIZE);
    };

    const isPriceFilterActive = () => filters.minPrice > 0 || filters.maxPrice < PRICE_VISUAL_MAX;

    const isEspacioTipo = filters.type === 'Oficinas' || filters.type === 'Local comercial' || filters.type === 'Casa';
    const showBedsBaths = filters.type === 'Apartamento' || isEspacioTipo;

    const handleShareFilters = () => {
        const params = new URLSearchParams();
        if (filters.mode && filters.mode !== 'Todos')        params.set('mode', filters.mode);
        if (filters.type && filters.type !== 'Todos')        params.set('type', filters.type);
        if (filters.department)                              params.set('dept', filters.department);
        if (filters.municipality)                            params.set('muni', filters.municipality);
        if (filters.zone)                                    params.set('zone', filters.zone);
        if (filters.search)                                  params.set('search', filters.search);
        if (filters.minPrice > 0)                            params.set('minPrice', String(filters.minPrice));
        if (filters.maxPrice < PRICE_VISUAL_MAX)             params.set('maxPrice', String(filters.maxPrice));
        if (filters.beds && filters.beds !== 'Cualquiera')   params.set('beds', filters.beds);
        if (filters.baths && filters.baths !== 'Cualquiera') params.set('baths', filters.baths);
        if (filters.featured)                                params.set('featured', '1');
        if (filters.exclusive)                               params.set('exclusive', '1');
        if (sortOption != null)                              params.set('sort', String(sortOption.value));

        const url = `${window.location.origin}/proyectos?${params.toString()}`;

        const copyFallback = () => {
            try {
                const el = document.createElement('textarea');
                el.value = url;
                el.style.position = 'fixed';
                el.style.opacity = '0';
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
            } catch { /* ignorar */ }
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url).catch(copyFallback);
        } else {
            copyFallback();
        }
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
    };

    const sortSelectStyles = {
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
        valueContainer: (base) => ({ ...base, flexWrap: 'nowrap', overflow: 'hidden', height: '35.33px', padding: '0', alignItems: 'center' }),
        menu: (base) => ({ ...base, minWidth: 'max-content' }),
        menuList: (base) => ({ ...base, maxHeight: 'none', overflowY: 'visible' }),
        option: (base, state) => ({
            ...base,
            fontSize: '14px',
            whiteSpace: 'nowrap',
            backgroundColor: state.isSelected ? '#000' : state.isFocused ? '#e9e9e9' : '#fff',
            color: state.isSelected ? '#fff' : '#000',
            cursor: 'pointer',
            ':active': { backgroundColor: '#000', color: '#fff' },
        }),
        width: 'fit-content',
    };

    const sortValueContainer = ({ children, ...props }) => (
        <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', flexWrap: 'nowrap', flex: 1, minWidth: 0, height: '35.33px', paddingLeft: '8px', paddingRight: '4px' }}>
            <i className="fa-solid fa-arrow-up-short-wide me-2" style={{ flexShrink: 0 }}></i>
            <div style={{ display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', overflow: 'hidden' }}>{children}</div>
        </div>
    );

    const sortSingleValue = ({ children }) => (
        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>{children}</div>
    );

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
                            aria-label={t('Buscar por nombre o zona', 'Search by name or area')}
                            value={filters.search}
                            onChange={e => handleSelect('search', e.target.value)}
                            style={{ fontSize: '14px' }}
                        />
                        <Button variant="dark" className="border-dark border-start-0" aria-label={t('Buscar proyectos', 'Search projects')}>
                            <i className="fa-solid fa-magnifying-glass"></i>
                        </Button>
                    </InputGroup>

                    {/* Botón Filtros en móvil */}
                    <Button variant="outline-dark" className="d-lg-none" onClick={() => setShowMobileFilters(true)}>
                        <i className="fa-solid fa-sliders me-2"></i>Filtros
                        {isFiltering && <span className="ms-2 badge bg-dark">•</span>}
                    </Button>

                    {/* Venta y Alquiler */}
                    <Dropdown className="d-none d-lg-block">
                        <Dropdown.Toggle variant={filters.mode !== 'Todos' ? 'dark' : 'outline-dark'} style={{ fontSize: '14px' }}>
                            {filters.mode === 'Todos' ? t('Venta y Alquiler', 'Sales and Rentals') : filters.mode}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            {['Todos', 'Venta', 'Alquiler'].map(m => (
                                <div key={m} className="" style={{ cursor: 'pointer' }}
                                    onClick={() => handleSelect('mode', m)}>
                                    <Form.Check
                                        type="radio" label={m === 'Todos' ? 'Venta y Alquiler' : m}
                                        name="mode" checked={filters.mode === m}
                                        onChange={() => {}} readOnly
                                    />
                                </div>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>

                    {/* Selector de Precio */}
                    <Dropdown autoClose="outside" className="d-none d-lg-block">
                        <Dropdown.Toggle variant={isPriceFilterActive() ? 'dark' : 'outline-dark'} style={{ textAlign: 'left', fontSize: '14px' }}>
                            {isPriceFilterActive()
                                ? `${formatCurrencyShort(filters.minPrice)} - ${formatCurrencyShort(filters.maxPrice)}`
                                : t('Precio', 'Price')}
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="p-3 shadow border-0" style={{ width: 'min(300px, 90vw)' }}>
                            <h6 className="mb-3">{ t('Rango de precio', 'Price range') } (USD)</h6>
                            <Form.Range
                                min={0} max={PRICE_VISUAL_MAX} step={100}
                                value={Math.min(sliderPrice.min, PRICE_VISUAL_MAX)}
                                onChange={(e) => handleSelect('minPrice', e.target.value)}
                            />
                            <Form.Range
                                min={0} max={PRICE_VISUAL_MAX} step={100}
                                value={Math.min(sliderPrice.max, PRICE_VISUAL_MAX)}
                                onChange={(e) => handleSelect('maxPrice', e.target.value)}
                            />
                            <div className="d-flex gap-2 align-items-center mt-3">
                                <Form.Control
                                    size="sm"
                                    type="text"
                                    value={formatUSDInput(sliderPrice.min)}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^0-9]/g, '');
                                        e.target.value = formatUSDInput(raw);
                                        handleSelect('minPrice', raw || '0');
                                    }}
                                    onClick={(e) => e.target.select()}
                                />
                                <span>–</span>
                                <Form.Control
                                    size="sm"
                                    type="text"
                                    value={formatUSDInput(sliderPrice.max)}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^0-9]/g, '');
                                        const clamped = Math.min(parseInt(raw || '0', 10), PRICE_VISUAL_MAX);
                                        e.target.value = formatUSDInput(clamped);
                                        handleSelect('maxPrice', String(clamped));
                                    }}
                                    onClick={(e) => e.target.select()}
                                />
                            </div>
                        </Dropdown.Menu>
                    </Dropdown>

                    {/* Tipo de Proyecto */}
                    <Dropdown className="d-none d-lg-block">
                        <Dropdown.Toggle variant={filters.type !== 'Todos' ? 'dark' : 'outline-dark'} style={{ fontSize: '14px' }}>
                            {filters.type === 'Todos' ? t('Tipo', 'Type') : filters.type}
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="p-2 shadow border-0">
                            {TIPO_PROYECTO_OPCIONES.map(type => (
                                <div key={type} className="px-3 py-1" style={{ cursor: 'pointer' }}
                                    onClick={() => handleSelect('type', type)}>
                                    <Form.Check
                                        type="radio" label={type} name="typeProp"
                                        checked={filters.type === type}
                                        onChange={() => {}} readOnly
                                    />
                                </div>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>

                    {/* Tamaño (solo para Bodega) */}
                    {filters.type === 'Bodega' && (
                        <Dropdown autoClose="outside" className="d-none d-lg-block">
                            <Dropdown.Toggle variant={!(filters.minSize === 0 && filters.maxSize >= MAX_SIZE_LIMIT) ? 'dark' : 'outline-dark'} style={{ fontSize: '14px' }}>
                                {!(filters.minSize === 0 && filters.maxSize >= MAX_SIZE_LIMIT)
                                    ? `${filters.minSize} - ${filters.maxSize} m²`
                                    : t('Tamaño', 'Size')}
                            </Dropdown.Toggle>
                            <Dropdown.Menu className="p-3 shadow border-0" style={{ width: 'min(300px, 90vw)' }}>
                                <h6 className="mb-3">{ t('Rango de tamaño (m²)', 'Size range (m²)') }</h6>
                                <Form.Range
                                    min={0} max={MAX_SIZE_LIMIT} step={10}
                                    value={Math.min(sliderSize.min, MAX_SIZE_LIMIT)}
                                    onChange={(e) => handleSelect('minSize', parseInt(e.target.value))}
                                />
                                <Form.Range
                                    min={0} max={MAX_SIZE_LIMIT} step={10}
                                    value={Math.min(sliderSize.max, MAX_SIZE_LIMIT)}
                                    onChange={(e) => handleSelect('maxSize', parseInt(e.target.value))}
                                />
                                <div className="d-flex gap-2 align-items-center mt-3">
                                    <Form.Control
                                        size="sm"
                                        type="number"
                                        value={sliderSize.min}
                                        onChange={(e) => handleSelect('minSize', parseInt(e.target.value) || 0)}
                                        onClick={(e) => e.target.select()}
                                    />
                                    <span>–</span>
                                    <Form.Control
                                        size="sm"
                                        type="number"
                                        value={sliderSize.max}
                                        onChange={(e) => handleSelect('maxSize', parseInt(e.target.value) || 0)}
                                        onClick={(e) => e.target.select()}
                                    />
                                </div>
                            </Dropdown.Menu>
                        </Dropdown>
                    )}

                    {/* Camas y Baños */}
                    {showBedsBaths && (
                        <Dropdown autoClose="outside" className="d-none d-lg-block">
                            <Dropdown.Toggle variant={(filters.beds !== 'Cualquiera' || filters.baths !== 'Cualquiera') ? 'dark' : 'outline-dark'} style={{ fontSize: '14px' }}>
                                {filters.beds === 'Cualquiera' && filters.baths === 'Cualquiera'
                                    ? (isEspacioTipo ? t('Espacios y Baños', 'Spaces and Bathroom') : t('Camas y Baños', 'Bedrooms and Bathroom'))
                                    : `${filters.beds} ${isEspacioTipo ? 'E' : 'C'}${filters.type !== 'Bodega' ? `, ${filters.baths} B` : ''}`}
                            </Dropdown.Toggle>
                            <Dropdown.Menu className="p-3 shadow border-0" style={{ width: 'fit-content' }}>
                                <p className="small fw-bold mb-2">{ isEspacioTipo ? t('Espacios', 'Spaces') : filters.type === 'Bodega' ? t('Ambientes', 'Spaces') : t('Habitaciones', 'Bedrooms') }</p>
                                <ButtonGroup size="sm" className="w-100 mb-3">
                                    {['Cualquiera', '1+', '2+', '3+', '4+', '5+'].map((text) => (
                                        <Button key={text} variant={filters.beds === text ? 'dark' : 'outline-dark'} onClick={() => handleSelect('beds', text)}>{text}</Button>
                                    ))}
                                </ButtonGroup>
                                {filters.type !== 'Bodega' && (
                                    <>
                                        <p className="small fw-bold mb-2">{ t('Baños', 'Baths') }</p>
                                        <ButtonGroup size="sm" className="w-100">
                                            {['Cualquiera', '1+', '1.5+', '2+', '3+', '4+'].map((text) => (
                                                <Button key={text} variant={filters.baths === text ? 'dark' : 'outline-dark'} onClick={() => handleSelect('baths', text)}>{text}</Button>
                                            ))}
                                        </ButtonGroup>
                                    </>
                                )}
                            </Dropdown.Menu>
                        </Dropdown>
                    )}

                    {/* Ubicaciones */}
                    <Dropdown autoClose="outside" className="d-none d-lg-block">
                        <Dropdown.Toggle variant={filters.department ? 'dark' : 'outline-dark'} style={{ fontSize: '14px' }}>
                            {filters.department ?? t('Ubicación', 'Location') }
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="p-3 shadow border-0" style={{ minWidth: '280px' }}>
                            <p className="small fw-bold mb-2">Departamento</p>
                            <Select
                                inputId="desktop-projects-department"
                                instanceId="desktop-projects-department"
                                aria-label={t('Departamento', 'Department')}
                                options={deptOptions}
                                value={filters.department ? { value: filters.department, label: filters.department } : null}
                                styles={selectStyles}
                                onChange={(v) => { handleSelect('department', v?.value ?? null); handleSelect('municipality', null); handleSelect('zone', null); }}
                                placeholder={t("Seleccione...", "Select...")}
                                isClearable
                            />
                            <p className="small fw-bold mb-2 mt-3">Municipio</p>
                            <Select
                                inputId="desktop-projects-municipality"
                                instanceId="desktop-projects-municipality"
                                aria-label={t('Municipio', 'Municipality')}
                                options={muniOptions}
                                value={filters.municipality ? { value: filters.municipality, label: filters.municipality } : null}
                                styles={selectStyles}
                                onChange={(v) => { handleSelect('municipality', v?.value ?? null); handleSelect('zone', null); }}
                                placeholder={t("Seleccione...", "Select...")}
                                isClearable
                                isDisabled={!filters.department}
                            />
                            <p className="small fw-bold mb-2 mt-3">Zona</p>
                            <Select
                                inputId="desktop-projects-zone"
                                instanceId="desktop-projects-zone"
                                aria-label={t('Zona', 'Zone')}
                                options={zoneOptions}
                                value={filters.zone ? { value: filters.zone, label: filters.zone } : null}
                                styles={selectStyles}
                                onChange={(v) => handleSelect('zone', v?.value ?? null)}
                                placeholder={t("Seleccione...", "Select...")}
                                isClearable
                                isDisabled={!filters.municipality}
                            />
                        </Dropdown.Menu>
                    </Dropdown>

                    {/* Ordenar por */}
                    <Select
                        options={dataOptions}
                        placeholder={t('Ordenar por', 'Order by')}
                        value={sortOption}
                        isSearchable={false}
                        inputId="projects-sort-order"
                        aria-label={t('Ordenar proyectos', 'Sort projects')}
                        onChange={(v) => { setSortOption(v); setVisibleCount(PAGE_SIZE); }}
                        styles={sortSelectStyles}
                        components={{
                            ValueContainer: sortValueContainer,
                            SingleValue: sortSingleValue,
                        }}
                    />
                </div>

                {/* Chips de filtros activos */}
                {isFiltering && (() => {
                    const chips = [];

                    if (filters.search)
                        chips.push({ key: 'search', label: `"${filters.search}"`, onRemove: () => handleSelect('search', '') });
                    if (filters.mode !== 'Todos')
                        chips.push({ key: 'mode', label: filters.mode, onRemove: () => handleSelect('mode', 'Todos') });
                    if (filters.type !== 'Todos')
                        chips.push({ key: 'type', label: filters.type, onRemove: () => handleSelect('type', 'Todos') });
                    if (filters.beds !== 'Cualquiera')
                        chips.push({ key: 'beds', label: `${filters.beds} hab.`, onRemove: () => handleSelect('beds', 'Cualquiera') });
                    if (filters.baths !== 'Cualquiera')
                        chips.push({ key: 'baths', label: `${filters.baths} baños`, onRemove: () => handleSelect('baths', 'Cualquiera') });
                    if (filters.department)
                        chips.push({ key: 'department', label: filters.department, onRemove: () => { handleSelect('department', null); handleSelect('municipality', null); handleSelect('zone', null); } });
                    if (filters.municipality)
                        chips.push({ key: 'municipality', label: filters.municipality, onRemove: () => { handleSelect('municipality', null); handleSelect('zone', null); } });
                    if (filters.zone)
                        chips.push({ key: 'zone', label: filters.zone, onRemove: () => handleSelect('zone', null) });
                    if (filters.featured)
                        chips.push({ key: 'featured', label: t('Destacadas', 'Featured'), onRemove: () => handleSelect('featured', false) });
                    if (filters.exclusive)
                        chips.push({ key: 'exclusive', label: t('Exclusivas', 'Exclusive'), onRemove: () => handleSelect('exclusive', false) });
                    if (isPriceFilterActive())
                        chips.push({
                            key: 'price',
                            label: `${formatCurrencyShort(filters.minPrice)} – ${formatCurrencyShort(filters.maxPrice)}`,
                            onRemove: () => { handleSelect('minPrice', 0); handleSelect('maxPrice', PRICE_VISUAL_MAX); }
                        });
                    if (filters.type === 'Bodega' && (filters.minSize > 0 || filters.maxSize < MAX_SIZE_LIMIT))
                        chips.push({
                            key: 'size',
                            label: `${filters.minSize} – ${filters.maxSize} m²`,
                            onRemove: () => { handleSelect('minSize', 0); handleSelect('maxSize', MAX_SIZE_LIMIT); }
                        });

                    if (chips.length === 0) return null;

                    return (
                        <div className="d-flex flex-wrap gap-2 mt-2">
                            {chips.map(chip => (
                                <span
                                    key={chip.key}
                                    className="d-inline-flex align-items-center gap-1 px-3 py-1 rounded-pill"
                                    style={{ backgroundColor: '#1a1a1a', color: '#fff', fontSize: '13px', fontWeight: 500 }}
                                >
                                    {chip.label}
                                    <button
                                        onClick={chip.onRemove}
                                        aria-label={`Quitar filtro ${chip.label}`}
                                        style={{ background: 'none', border: 'none', color: '#fff', padding: '0 0 0 4px', cursor: 'pointer', lineHeight: 1, fontSize: '12px', opacity: 0.8 }}
                                        title="Quitar filtro"
                                    >
                                        <i className="fa-solid fa-xmark"></i>
                                    </button>
                                </span>
                            ))}
                            <button
                                onClick={handleClearFilters}
                                className="d-inline-flex align-items-center gap-1 px-3 py-1 rounded-pill"
                                style={{ backgroundColor: 'transparent', border: '1px solid #1a1a1a', color: '#1a1a1a', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                            >
                                {t('Limpiar todo', 'Clear all')} <i className="fa-solid fa-xmark ms-1"></i>
                            </button>
                            <button
                                onClick={handleShareFilters}
                                className="d-inline-flex align-items-center gap-1 px-3 py-1 rounded-pill"
                                title={t('Copiar enlace con filtros activos', 'Copy link with active filters')}
                                style={{ backgroundColor: shareCopied ? '#1a1a1a' : 'transparent', border: '1px solid #1a1a1a', color: shareCopied ? '#fff' : '#1a1a1a', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'background-color 0.2s, color 0.2s' }}
                            >
                                {shareCopied
                                    ? <><i className="fa-solid fa-check me-1"></i>{t('¡Enlace copiado!', 'Link copied!')}</>
                                    : <><i className="fa-solid fa-share-nodes me-1"></i>{t('Compartir', 'Share')}</>
                                }
                            </button>
                        </div>
                    );
                })()}
            </div>

            {/* Panel de filtros móvil */}
            {showMobileFilters && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1050,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                }} onClick={() => setShowMobileFilters(false)}>
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        backgroundColor: 'white', borderRadius: '16px 16px 0 0',
                        maxHeight: '90vh', overflowY: 'auto', padding: '24px 20px',
                    }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="mb-0 fw-bold">Filtros</h5>
                            <button className="btn btn-link text-dark p-0" onClick={() => setShowMobileFilters(false)} aria-label={t('Cerrar filtros', 'Close filters')}>
                                <i className="fa-solid fa-xmark fs-5"></i>
                            </button>
                        </div>

                        {/* Modo */}
                        <div className="mb-4">
                            <p className="fw-bold mb-2">Tipo de operación</p>
                            <ButtonGroup className="w-100">
                                {['Todos', 'Venta', 'Alquiler'].map(m => (
                                    <Button key={m} variant={filters.mode === m ? 'dark' : 'outline-dark'}
                                        onClick={() => handleSelect('mode', m)}>
                                        {m === 'Todos' ? 'Todos' : m}
                                    </Button>
                                ))}
                            </ButtonGroup>
                        </div>

                        {/* Precio */}
                        <div className="mb-4">
                            <p className="fw-bold mb-2">{t('Rango de precio', 'Price range')} (USD)</p>
                            <Form.Range min={0} max={PRICE_VISUAL_MAX} step={100}
                                aria-label={t('Precio mínimo', 'Minimum price')}
                                value={Math.min(sliderPrice.min, PRICE_VISUAL_MAX)}
                                onChange={(e) => handleSelect('minPrice', e.target.value)} />
                            <Form.Range min={0} max={PRICE_VISUAL_MAX} step={100}
                                aria-label={t('Precio máximo', 'Maximum price')}
                                value={Math.min(sliderPrice.max, PRICE_VISUAL_MAX)}
                                onChange={(e) => handleSelect('maxPrice', e.target.value)} />
                            <div className="d-flex gap-2 align-items-center mt-2">
                                <Form.Control size="sm" type="text"
                                    aria-label={t('Precio mínimo', 'Minimum price')}
                                    value={formatUSDInput(sliderPrice.min)}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^0-9]/g, '');
                                        e.target.value = formatUSDInput(raw);
                                        handleSelect('minPrice', raw || '0');
                                    }} onClick={(e) => e.target.select()} />
                                <span>–</span>
                                <Form.Control size="sm" type="text"
                                    aria-label={t('Precio máximo', 'Maximum price')}
                                    value={formatUSDInput(sliderPrice.max)}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^0-9]/g, '');
                                        const clamped = Math.min(parseInt(raw || '0', 10), PRICE_VISUAL_MAX);
                                        e.target.value = formatUSDInput(clamped);
                                        handleSelect('maxPrice', String(clamped));
                                    }} onClick={(e) => e.target.select()} />
                            </div>
                        </div>

                        {/* Tipo de proyecto */}
                        <div className="mb-4">
                            <p className="fw-bold mb-2">Tipo de proyecto</p>
                            <div className="d-flex flex-wrap gap-2">
                                {TIPO_PROYECTO_OPCIONES.map(type => (
                                    <Button key={type} size="sm"
                                        variant={filters.type === type ? 'dark' : 'outline-dark'}
                                        onClick={() => handleSelect('type', type)}>{type}</Button>
                                ))}
                            </div>
                        </div>

                        {/* Tamaño (solo para Bodega) */}
                        {filters.type === 'Bodega' && (
                            <div className="mb-4">
                                <p className="fw-bold mb-2">{t('Rango de tamaño (m²)', 'Size range (m²)')}</p>
                                <Form.Range min={0} max={MAX_SIZE_LIMIT} step={10}
                                    aria-label={t('Tamaño mínimo', 'Minimum size')}
                                    value={Math.min(sliderSize.min, MAX_SIZE_LIMIT)}
                                    onChange={(e) => handleSelect('minSize', parseInt(e.target.value))} />
                                <Form.Range min={0} max={MAX_SIZE_LIMIT} step={10}
                                    aria-label={t('Tamaño máximo', 'Maximum size')}
                                    value={Math.min(sliderSize.max, MAX_SIZE_LIMIT)}
                                    onChange={(e) => handleSelect('maxSize', parseInt(e.target.value))} />
                                <div className="d-flex gap-2 align-items-center mt-2">
                                    <Form.Control size="sm" type="number"
                                        aria-label={t('Tamaño mínimo', 'Minimum size')}
                                        value={sliderSize.min}
                                        onChange={(e) => handleSelect('minSize', parseInt(e.target.value) || 0)} onClick={(e) => e.target.select()} />
                                    <span>–</span>
                                    <Form.Control size="sm" type="number"
                                        aria-label={t('Tamaño máximo', 'Maximum size')}
                                        value={sliderSize.max}
                                        onChange={(e) => handleSelect('maxSize', parseInt(e.target.value) || 0)} onClick={(e) => e.target.select()} />
                                </div>
                            </div>
                        )}

                        {/* Camas */}
                        {showBedsBaths && (
                            <div className="mb-4">
                                <p className="fw-bold mb-2">{ isEspacioTipo ? t('Espacios', 'Spaces') : t('Habitaciones', 'Bedrooms') }</p>
                                <ButtonGroup size="sm" className="w-100">
                                    {['Cualquiera', '1+', '2+', '3+', '4+', '5+'].map(text => (
                                        <Button key={text} variant={filters.beds === text ? 'dark' : 'outline-dark'}
                                            onClick={() => handleSelect('beds', text)}>{text}</Button>
                                    ))}
                                </ButtonGroup>
                            </div>
                        )}

                        {/* Baños */}
                        {showBedsBaths && (
                            <div className="mb-4">
                                <p className="fw-bold mb-2">{t('Baños', 'Baths')}</p>
                                <ButtonGroup size="sm" className="w-100">
                                    {['Cualquiera', '1+', '1.5+', '2+', '3+', '4+'].map(text => (
                                        <Button key={text} variant={filters.baths === text ? 'dark' : 'outline-dark'}
                                            onClick={() => handleSelect('baths', text)}>{text}</Button>
                                    ))}
                                </ButtonGroup>
                            </div>
                        )}

                        {/* Ubicación */}
                        <div className="mb-4">
                            <p className="fw-bold mb-2">Ubicación</p>
                            <div className="mb-2">
                                <label className="small text-muted mb-1">Departamento</label>
                                <Select options={deptOptions}
                                    inputId="mobile-projects-department"
                                    instanceId="mobile-projects-department"
                                    aria-label="Departamento"
                                    value={filters.department ? { value: filters.department, label: filters.department } : null}
                                    styles={selectStyles}
                                    onChange={(v) => { handleSelect('department', v?.value ?? null); handleSelect('municipality', null); handleSelect('zone', null); }}
                                    placeholder={t("Seleccione...", "Select...")} isClearable />
                            </div>
                            <div className="mb-2">
                                <label className="small text-muted mb-1">Municipio</label>
                                <Select options={muniOptions}
                                    inputId="mobile-projects-municipality"
                                    instanceId="mobile-projects-municipality"
                                    aria-label="Municipio"
                                    value={filters.municipality ? { value: filters.municipality, label: filters.municipality } : null}
                                    styles={selectStyles}
                                    onChange={(v) => { handleSelect('municipality', v?.value ?? null); handleSelect('zone', null); }}
                                    placeholder={t("Seleccione...", "Select...")} isClearable isDisabled={!filters.department} />
                            </div>
                            <div>
                                <label className="small text-muted mb-1">Zona</label>
                                <Select options={zoneOptions}
                                    inputId="mobile-projects-zone"
                                    instanceId="mobile-projects-zone"
                                    aria-label="Zona"
                                    value={filters.zone ? { value: filters.zone, label: filters.zone } : null}
                                    styles={selectStyles}
                                    onChange={(v) => handleSelect('zone', v?.value ?? null)}
                                    placeholder={t("Seleccione...", "Select...")} isClearable isDisabled={!filters.municipality} />
                            </div>
                        </div>

                        {/* Acciones */}
                        <div className="d-flex gap-3 pt-2 border-top">
                            <Button variant="outline-dark" className="flex-grow-1" onClick={() => { handleClearFilters(); setShowMobileFilters(false); }}>
                                Limpiar filtros
                            </Button>
                            <Button variant="dark" className="flex-grow-1" onClick={() => setShowMobileFilters(false)}>
                                Ver resultados
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Grid de proyectos ── */}
            {loading ? (
                <div style={{ marginTop: '8rem', marginBottom: '8rem' }} className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                </div>
            ) : sortedProyectos.length > 0 ? (
                <div style={{ marginTop: 'clamp(2rem, 3vw, 3rem)' }}>
                    <div className="row gy-5" style={{ marginBottom: 'clamp(5rem, 10vw, 9rem)' }}>
                        {sortedProyectos.slice(0, visibleCount).map((item, index) => {
                            const isVenta = item.modo === 'Venta';
                            return (
                                <div className="col-md-6 col-xl-4 d-flex flex-column" key={index}>
                                    <Link to={`/proyectos/apartamento/${item.id}`} className="position-relative d-block propiedades-zoom">
                                        <img
                                            src={item.img}
                                            className="object-fit-cover w-100 border-radius-1"
                                            style={{ aspectRatio: '4 / 4' }}
                                            alt={item.titulo}
                                        />
                                        <div style={{ padding: '5%' }} className="position-absolute top-0 w-100 h-100 d-flex flex-column justify-content-between">
                                            <div className="d-flex gap-2 flex-wrap">
                                                {item.featured?.isActive ? (
                                                    <div className="d-flex gap-2 align-items-center rounded-4" style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', padding: '3px 10px', fontSize: '14px' }}>
                                                        <img src={diamond} style={{ width: '14px' }} alt="" />
                                                        <FormattedMessage id="home.text31" />
                                                    </div>
                                                ) : null}
                                                {item.exclusive ? (
                                                    <div className="d-flex gap-2 align-items-center rounded-4" style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', padding: '3px 10px', fontSize: '14px' }}>
                                                        <FormattedMessage id="home.text7" />
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div className="d-flex justify-content-end align-items-center gap-2">
                                                <div className={`favorite-icon ${isFavorite(item.idRaw) ? 'like' : 'unlike'}`} style={{ cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (isAuthenticated() && !canFavorite) return; toggleFav(item.idRaw); }}>
                                                    <i className="fa-solid fa-heart"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Info */}
                                    <Link to={`/proyectos/apartamento/${item.id}`} className="mt-3 text-body d-flex flex-column flex-grow-1">
                                        <div className="text-truncate" style={{ fontSize: 'clamp(34px, 6vw, 44px)', fontFamily: 'AppleGaramond' }}>
                                            {item.titulo}
                                        </div>
                                        <div>
                                            <i className="fa-solid fa-location-dot me-2" style={{ width: 'fit-content' }}></i>{item.ubicacion}
                                        </div>
                                        <div><FormattedMessage id="home.text9" />: {item.tipo}</div>

                                        {/* Iconos */}
                                        <div className="d-flex gap-4 my-3" style={{ fontSize: '16px' }}>
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
                                        <div className="mt-auto">
                                            <div className="text-muted" style={{ fontSize: '13px' }}>Desde</div>
                                            <div className="fw-bold fs-4 text-dark d-flex align-items-center gap-4">
                                                {item.precio}
                                                <div className="d-flex align-items-center gap-2">
                                                    <img src={isVenta ? venta : alquiler} alt="modo" style={{ width: '20px' }} />
                                                    <div
                                                        className={`${isVenta ? 'bg-dark' : ''} rounded-1 px-4 py-0 text-white fw-lighter`}
                                                        style={{ fontSize: '16px', ...(!isVenta && { backgroundColor: '#B65740' }) }}
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
            ) : (
                <div style={{ marginTop: '8rem', marginBottom: '8rem' }} className="text-center">
                    <div className="fs-2 text-muted">{t('No coinciden proyectos con estos filtros', 'No projects match these filters')}</div>
                    <Button variant="link" className="text-dark" onClick={handleClearFilters}>{t('Limpiar filtros', 'Clean filters')}</Button>
                </div>
            )}

            {/* Ver más (si hay más proyectos disponibles) */}
            {sortedProyectos.length > visibleCount && (
                <div className="d-flex justify-content-center" style={{ marginBottom: 'clamp(3rem, 6vw, 6rem)' }}>
                    <button className="link-more-black d-flex align-items-center gap-2" onClick={() => setVisibleCount(v => v + PAGE_SIZE)} style={{ background: 'none', cursor: 'pointer' }}>
                        {t('Ver más', 'View more')} <i className="fa-solid fa-angle-right"></i>
                    </button>
                </div>
            )}

        </Container>
    );
}

export default Proyectos;
