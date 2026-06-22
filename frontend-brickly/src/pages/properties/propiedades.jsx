import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Container, Dropdown, Form, Button, InputGroup, ButtonGroup } from 'react-bootstrap';
import { FormattedMessage } from 'react-intl';
import { useCurrency } from '../../context/CurrencyContext';
import { getDisplayPrice } from '../../utils/priceUtils';
import Select from 'react-select';
import ReactDOM from 'react-dom';
import { useFavorites } from '../../hooks/useFavorites';
import like from '../../assets/images/iconos/Like.png';

import diamond from '../../assets/images/iconos/diamond.png';
import noLike from '../../assets/images/iconos/noLike.png';

import alquiler from '../../assets/images/iconos/alquiler.png';
import venta from '../../assets/images/iconos/venta.png';
import space from '../../assets/images/iconos/spaces.png';
import arrow from '../../assets/images/iconos/arrow.png'

import SEO from '../../components/SEO';
import { API_URL, isAuthenticated } from '../../services/authService'; 
import { useT } from '../../hooks/useT';
import { fetchPropertiesPage, fetchAllPages } from '../../utils/fetchAll';
import { getPropertyRanges } from '../../services/propertyRanges';

import '../../assets/css/propiedades.css';

const PRICE_VISUAL_MAX = 20000000;

// Auxiliares de formato (puedes moverlas a un archivo utils si prefieres)
  // Formato para mostrar en inputs de precio (sin decimales, con símbolo)
  const formatGTQInput = (val) => {
    const num = String(val).replace(/[^0-9]/g, '');
    if (!num) return '';
    return 'Q ' + num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatUSDInput = (val) => {
    const num = String(val).replace(/[^0-9]/g, '');
    if (!num) return '';
    return '$ ' + num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatoGTQ = (valor) => {
    return new Intl.NumberFormat('es-GT', {
      currency: 'GTQ',
      minimumFractionDigits: 2
    }).format(valor || 0);
  };

  const formatoUSD = (valor) => {
    return new Intl.NumberFormat('en-US', {
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(valor || 0);
  };

const formatPrice = (value, currency) => {
  const num = parseFloat(value) || 0;
  if (currency === 'GTQ') {
    return 'Q ' + new Intl.NumberFormat('es-GT', { minimumFractionDigits: 0 }).format(num);
  }
  return '$ ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(num);
};

// Dropdown con posición fija que no se mueve al hacer scroll
function FixedDropdown({ label, children, minWidth = '130px' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = () => {
    if (!open) updatePos();
    setOpen(o => !o);
  };

  const menu = open ? ReactDOM.createPortal(
    <div ref={menuRef} style={{
      position: 'fixed', top: pos.top, left: pos.left,
      zIndex: 9999, backgroundColor: 'white',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      borderRadius: '4px', padding: '8px 0',
      minWidth: '200px', maxWidth: '90vw',
    }}>
      {children(setOpen)}
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="btn btn-outline-dark"
        style={{ minWidth }}
      >
        {label} <span className="ms-1">▾</span>
      </button>
      {menu}
    </>
  );
}

function Propiedades() {
  const t = useT();

  const location = useLocation();
  const navigate = useNavigate();
  const priceState = location.state;
  const { currency: currencyMode } = useCurrency();
  const { isFavorite, toggle: toggleFav, canFavorite } = useFavorites();

  // Modo agente/agencia: filtrar propiedades
  const agentId = priceState?.agentId ?? null;
  const userId = priceState?.userId ?? null;
  const agentName = priceState?.agentName ?? null;

  const [propiedades, setpropiedades] = useState([]);
  const [filteredPropiedades, setFilteredPropiedades] = useState([]);
  const [loadingShow, setloading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [maxPriceLimit, setMaxPriceLimit] = useState(PRICE_VISUAL_MAX);
  const [maxSizeLimit, setMaxSizeLimit] = useState(10000000);
  const [isFiltering, setIsFiltering] = useState(false);
  const [sortOption, setSortOption] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const itemsPerPage = 21;

  // Clave para sessionStorage — incluye agentId para aislar contextos
  const ownerFilterId = userId ?? agentId ?? 'all';
  const SESSION_KEY = `propiedades_filters_${ownerFilterId}`;
  const STATE_KEY = `propiedades_state_${ownerFilterId}`;

  const filterTimeoutRef = useRef(null);

  // Leer filtros guardados en sessionStorage (al volver desde detalle)
  const getSavedFilters = () => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };

  const savedFilters = !priceState ? getSavedFilters() : null;

  const [filters, setFilters] = useState({
    search:     savedFilters?.search     ?? priceState?.search     ?? '',
    mode:       savedFilters?.mode       ?? priceState?.mode       ?? 'Todos',
    type:       savedFilters?.type       ?? priceState?.type       ?? 'Todos',
    minPrice:   savedFilters?.minPrice   ?? priceState?.minPrice   ?? 0,
    maxPrice:   savedFilters?.maxPrice   ?? priceState?.maxPrice   ?? PRICE_VISUAL_MAX,
    beds:       savedFilters?.beds       ?? 'Cualquiera',
    baths:      savedFilters?.baths      ?? 'Cualquiera',
    department: savedFilters?.department ?? priceState?.department ?? null,
    municipality: savedFilters?.municipality ?? priceState?.municipality ?? null,
    zone:       savedFilters?.zone       ?? priceState?.zone       ?? null,
    minSize:    savedFilters?.minSize    ?? 0,
    maxSize:    savedFilters?.maxSize    ?? 10000000,
    featured:   savedFilters?.featured   ?? priceState?.featured   ?? false,
    exclusive:  savedFilters?.exclusive  ?? priceState?.exclusive  ?? false,
  });

  // Restaurar isFiltering si había filtros guardados
  useEffect(() => {
    if (savedFilters) {
      const hasActive =
        savedFilters.search !== '' ||
        savedFilters.mode !== 'Todos' ||
        savedFilters.type !== 'Todos' ||
        savedFilters.beds !== 'Cualquiera' ||
        savedFilters.baths !== 'Cualquiera' ||
        savedFilters.department != null ||
        savedFilters.municipality != null ||
        savedFilters.zone != null ||
        savedFilters.featured === true ||
        savedFilters.exclusive === true;
      if (hasActive) setIsFiltering(true);
    }
  }, []);

  // Persistir filtros en sessionStorage cada vez que cambian
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(filters));
    } catch { /* ignorar */ }
  }, [filters]);

  // Sincronizar filtros cuando el usuario navega con nuevo estado (ej: desde home o perfil de agente)
  useEffect(() => {
    const st = location.state;
    if (!st) return; // Si no hay state nuevo, no sobreescribir (se mantienen los guardados)
    setFilters(prev => ({
      ...prev,
      mode: st.mode ?? 'Todos',
      type: st.type ?? 'Todos',
      minPrice: st.minPrice ?? 0,
      maxPrice: st.maxPrice ?? prev.maxPrice,
      department: st.department ?? null,
      municipality: st.municipality ?? null,
      zone: st.zone ?? null,
      featured: st.featured ?? false,
      exclusive: st.exclusive ?? false,
    }));
    if (st.mode != null && st.mode !== 'Todos' ||
        st.type != null ||
        st.department != null ||
        st.featured === true ||
        st.exclusive === true ||
        st.minPrice != null ||
        st.maxPrice != null) {
      setIsFiltering(true);
    }
  }, [location.state]);

  const URL = API_URL;

  // Obtener rangos de precio y tamaño desde API optimizada al montar el componente
  useEffect(() => {
    const loadRanges = async () => {
      const rangesRes = await getPropertyRanges();
      if (rangesRes.success) {
        // El máximo del control visual se queda fijo en 20M.
        // Si el usuario llega a 20M, el filtro se interpreta como 20M o más.
        const priceLimit = PRICE_VISUAL_MAX;
        
        const sizeLimit = Math.ceil(rangesRes.data.size.maxSizeConstructionM2 / 10) * 10;

        setMaxPriceLimit(priceLimit);
        setMaxSizeLimit(sizeLimit);
        setFilters(prev => ({
          ...prev,
          maxPrice: priceState?.maxPrice ?? priceLimit,
          maxSize: priceState?.maxSize ?? sizeLimit,
        }));
      }
    };
    loadRanges();
  }, [currencyMode]);

  // Construir URL base con filtros activos para enviar al backend
  const buildApiUrl = useCallback(() => {
    let url = `${API_URL}/properties?status=published`;

    // Búsqueda por texto: se envía a la API para que filtre del lado del servidor
    if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;

    // Filtro de ubicación
    if (filters.department) url += `&location.department=${encodeURIComponent(filters.department)}`;
    if (filters.municipality) url += `&location.municipality=${encodeURIComponent(filters.municipality)}`;
    if (filters.zone) url += `&location.zone=${encodeURIComponent(filters.zone)}`;

    // Filtro de modo (Venta / Alquiler)
    if (filters.mode && filters.mode !== 'Todos') url += `&market.mode=${filters.mode}`;

    // Filtro de tipo
    if (filters.type && filters.type !== 'Todos') url += `&market.type=${encodeURIComponent(filters.type)}`;


    // Filtro featured / exclusive
    if (filters.featured) url += `&featured.isActive=true`;
    if (filters.exclusive) url += `&exclusive=true`;

    // Filtro por agencia propietaria o agente asignado
    if (userId) {
      url += `&userId=${userId}`;
    }

    if (agentId) {
      url += `&agents=${agentId}`;
    }

    // Filtro de precio: se envía a la API para filtrar del lado del servidor
    // Solo se envía min si es > 0; max solo si es < PRICE_VISUAL_MAX (igual que en cpanel)
    if (filters.minPrice > 0) {
      const param = currencyMode === 'GTQ' ? 'priceMin' : 'priceUSDMin';
      url += `&${param}=${filters.minPrice}`;
    }
    if (filters.maxPrice < PRICE_VISUAL_MAX) {
      const param = currencyMode === 'GTQ' ? 'priceMax' : 'priceUSDMax';
      url += `&${param}=${filters.maxPrice}`;
    }

    return url;
  }, [filters, currencyMode, agentId, userId]);

  // Cargar propiedades con paginación (solo la página indicada)
  const loadPropertiesPage = useCallback(async (page, append = false) => {
    try {
      const url = buildApiUrl(page);
      const result = await fetchPropertiesPage(url, page, itemsPerPage);

      // Reconvertir: agregar priceRaw y priceUSDRaw
      const mapped = result.data.map(p => ({
        ...p,
        market: {
          ...p.market,
          priceRaw: p.market?.price || 0,
          priceUSDRaw: p.market?.priceUSD || 0,
        },
      }));

      if (append) {
        setpropiedades(prev => [...prev, ...mapped]);
        // Actualizar filteredPropiedades también para que los nuevos datos se vean de inmediato
        setFilteredPropiedades(prev => [...prev, ...mapped]);
      } else {
        setpropiedades(mapped);
        setFilteredPropiedades(mapped);
      }

      setTotalPages(result.totalPages);
      setCurrentPage(page);

      // Si es la primera carga y no hay filtros, marcar isFiltering según state
      if (page === 1 && !append) {
        if (agentId || userId || priceState?.minPrice != null || priceState?.maxPrice != null ||
            priceState?.type != null || priceState?.department != null ||
            (priceState?.mode != null && priceState?.mode !== 'Todos')) {
          setIsFiltering(true);
        }
      }

    } catch (errors) {
      console.error('Error:', errors);
    } finally {
      if (!append) setloading(false);
      setLoadingMore(false);
    }
  }, [buildApiUrl, agentId, userId, priceState]);

  // Refs para valores de sliders mientras se arrastra (evitan re-renders del Dropdown)
  const sliderPriceRef = useRef({ minPrice: filters.minPrice, maxPrice: filters.maxPrice });
  const sliderSizeRef = useRef({ minSize: filters.minSize, maxSize: filters.maxSize });
  const sliderCommitTimer = useRef(null);

  // Estado de display para sliders (actualiza en tiempo real el thumb, sin afectar filtrado)
  const [sliderPrice, setSliderPrice] = useState({ min: filters.minPrice, max: filters.maxPrice });
  const [sliderSize, setSliderSize] = useState({ min: filters.minSize, max: filters.maxSize });

  // Sincronizar sliderPrice/sliderSize cuando filters cambia desde fuera (ej: limpiar filtros, restaurar)
  useEffect(() => {
    setSliderPrice({ min: filters.minPrice, max: filters.maxPrice });
    sliderPriceRef.current = { minPrice: filters.minPrice, maxPrice: filters.maxPrice };
  }, [filters.minPrice, filters.maxPrice]);

  useEffect(() => {
    setSliderSize({ min: filters.minSize, max: filters.maxSize });
    sliderSizeRef.current = { minSize: filters.minSize, maxSize: filters.maxSize };
  }, [filters.minSize, filters.maxSize]);

  // Sincronizar filteredPropiedades cuando cambian las propiedades o filtros locales
  useEffect(() => {
    if (loadingShow) return;

    if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);

    filterTimeoutRef.current = setTimeout(() => {
      const resultado = propiedades.filter(item => {
        const matchesMode = filters.mode === 'Todos' || item.market?.mode === filters.mode;
        const matchesType = filters.type === 'Todos' || item.market?.type === filters.type;

        const numericPrice = parseFloat(currencyMode === 'GTQ' ? item.market?.priceRaw : item.market?.priceUSDRaw) || 0;
        const hasUpperLimit = filters.maxPrice < PRICE_VISUAL_MAX;
        const matchesPrice = hasUpperLimit
          ? numericPrice >= filters.minPrice && numericPrice <= filters.maxPrice
          : numericPrice >= filters.minPrice;

        const bedsVal = parseInt(filters.beds);
        const skipBedsFilter = filters.type === 'Terreno' || filters.type === 'Finca';
        const matchesBeds = skipBedsFilter || filters.beds === 'Cualquiera' || item.layout?.bedrooms >= bedsVal;

        const totalBaths = (item.layout?.bathrooms || 0) + (item.layout?.halfBathrooms || 0);
        const matchesBaths = skipBedsFilter || filters.baths === 'Cualquiera' || totalBaths >= parseFloat(filters.baths);

        const matchesDept = !filters.department || item.location?.department === filters.department;
        const matchesMuni = !filters.municipality || item.location?.municipality === filters.municipality;
        const matchesZone = !filters.zone || item.location?.zone === filters.zone;
        const matchesFeatured = !filters.featured || item.featured?.isActive === true;
        const matchesExclusive = !filters.exclusive || item.exclusive === true;

        const itemSize = parseFloat(item.dimensions?.constructionM2) || 0;
        const matchesSize = filters.type !== 'Bodega' || (itemSize >= filters.minSize && itemSize <= filters.maxSize);

        return matchesMode && matchesType && matchesPrice && matchesBeds && matchesBaths && matchesDept && matchesMuni && matchesZone && matchesFeatured && matchesExclusive && matchesSize;
      });
      setFilteredPropiedades(resultado);
    }, 120);

    return () => {
      if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
    };
  }, [filters, propiedades, loadingShow, currencyMode]);

  const handleSelect = (category, value) => {
    // Sliders de precio: actualizar display inmediatamente, commitear a filters con debounce
    if (category === 'minPrice' || category === 'maxPrice') {
        try { sessionStorage.removeItem(STATE_KEY); } catch { /* ignorar */ }
        setIsFiltering(true);
        setSortOption(null);
        const numeric = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) || 0 : value;
        const newMin = category === 'minPrice' ? numeric : sliderPriceRef.current.minPrice;
        const newMax = category === 'maxPrice' ? numeric : sliderPriceRef.current.maxPrice;
        // Agarre: no cruzar
        const clampedMin = category === 'minPrice' && numeric > newMax ? newMax : newMin;
        const clampedMax = category === 'maxPrice' && numeric < newMin ? newMin : newMax;
        sliderPriceRef.current = { minPrice: clampedMin, maxPrice: clampedMax };
        setSliderPrice({ min: clampedMin, max: clampedMax }); // mueve el thumb visualmente

        if (sliderCommitTimer.current) clearTimeout(sliderCommitTimer.current);
        sliderCommitTimer.current = setTimeout(() => {
          setFilters(prev => ({ ...prev, minPrice: sliderPriceRef.current.minPrice, maxPrice: sliderPriceRef.current.maxPrice }));
        }, 300);
        return;
    }
    if (category === 'minSize' || category === 'maxSize') {
        const numeric = typeof value === 'number' ? value : parseInt(value) || 0;
        const newMin = category === 'minSize' ? numeric : sliderSizeRef.current.minSize;
        const newMax = category === 'maxSize' ? numeric : sliderSizeRef.current.maxSize;
        const clampedMin = category === 'minSize' && numeric > newMax ? newMax : newMin;
        const clampedMax = category === 'maxSize' && numeric < newMin ? newMin : newMax;
        sliderSizeRef.current = { minSize: clampedMin, maxSize: clampedMax };
        setSliderSize({ min: clampedMin, max: clampedMax });

        if (sliderCommitTimer.current) clearTimeout(sliderCommitTimer.current);
        sliderCommitTimer.current = setTimeout(() => {
          setFilters(prev => ({ ...prev, minSize: sliderSizeRef.current.minSize, maxSize: sliderSizeRef.current.maxSize }));
        }, 300);
        return;
    }
    // Para el resto de filtros: limpiar estado guardado y marcar que hay filtros activos
    try { sessionStorage.removeItem(STATE_KEY); } catch { /* ignorar */ }
    setIsFiltering(true);
    setSortOption(null);
    if (category === 'type' && (value === 'Finca' || value === 'Terreno')) {
        // Resetear beds y baths al seleccionar tipos sin habitaciones
        setFilters(prev => ({ ...prev, type: value, beds: 'Cualquiera', baths: 'Cualquiera' }));
    } else {
        setFilters(prev => ({ ...prev, [category]: value }));
    }
  };

  const handleClearFilters = (keepSort = false) => {
    navigate('/propiedades', { replace: true, state: null });
    setIsFiltering(false);
    const cleared = {
      search: '', mode: 'Todos', type: 'Todos',
      minPrice: 0, maxPrice: maxPriceLimit,
      beds: 'Cualquiera', baths: 'Cualquiera',
      department: null, municipality: null, zone: null, featured: false, exclusive: false,
      minSize: 0, maxSize: maxSizeLimit,
    };
    setFilters(cleared);
    setSortOption(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignorar */ }
  };

  // Función para filtrar valores inválidos de ubicación (Ninguno, nungino, none)
  const isValidLocation = (val) => val && !['ninguno', 'nunguno', 'none'].includes(val.toLowerCase());

  // Opciones de ubicación derivadas de propiedades cargadas
  const deptOptions = [...new Set(propiedades.map(p => p.location?.department).filter(isValidLocation))].sort().map(d => ({ value: d, label: d }));
  const muniOptions = filters.department
    ? [...new Set(propiedades.filter(p => p.location?.department === filters.department).map(p => p.location?.municipality).filter(isValidLocation))].sort().map(m => ({ value: m, label: m }))
    : [];
  const zoneOptions = filters.municipality
    ? [...new Set(propiedades.filter(p => p.location?.department === filters.department && p.location?.municipality === filters.municipality).map(p => p.location?.zone).filter(isValidLocation))].sort().map(z => ({ value: z, label: z }))
    : [];

  const formatCurrencyShort = (value) => {
    const symbol = currencyMode === 'GTQ' ? 'Q' : '$';
    if (value >= 1000000) return symbol + (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (value >= 1000) return symbol + (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return symbol + value.toString();
  };

  const isPriceFilterActive = () => {
    return !loadingShow && (filters.minPrice > 0 || filters.maxPrice < maxPriceLimit);
  };


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
  ]

  const sortedPropiedades = [...filteredPropiedades].sort((a, b) => {
    // Por defecto: destacadas primero, luego por updatedAt descendente
    if (!sortOption) {
      const aFeatured = a.featured?.isActive ? 1 : 0;
      const bFeatured = b.featured?.isActive ? 1 : 0;
      if (bFeatured !== aFeatured) return bFeatured - aFeatured;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    }
    switch (sortOption.value) {
      case 0: {
        const aFeat = a.featured?.isActive ? 1 : 0;
        const bFeat = b.featured?.isActive ? 1 : 0;
        if (bFeat !== aFeat) return bFeat - aFeat;
        const dateA = a.featured?.expiresAt ? new Date(a.featured.expiresAt).getTime() : 0;
        const dateB = b.featured?.expiresAt ? new Date(b.featured.expiresAt).getTime() : 0;
        return dateA - dateB;
      }
      case 1: return new Date(b.createdAt) - new Date(a.createdAt);
      case 2: return new Date(a.createdAt) - new Date(b.createdAt);
      case 10: {
        const aExc = a.exclusive ? 1 : 0;
        const bExc = b.exclusive ? 1 : 0;
        if (bExc !== aExc) return bExc - aExc;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
      case 3: {
        const aIsVenta = a.market?.mode === 'Venta';
        const bIsVenta = b.market?.mode === 'Venta';
        if (aIsVenta && !bIsVenta) return -1;
        if (!aIsVenta && bIsVenta) return 1;
        return (parseFloat(a.market?.priceRaw) || 0) - (parseFloat(b.market?.priceRaw) || 0);
      }
      case 4: {
        const aIsVenta = a.market?.mode === 'Venta';
        const bIsVenta = b.market?.mode === 'Venta';
        if (aIsVenta && !bIsVenta) return -1;
        if (!aIsVenta && bIsVenta) return 1;
        return (parseFloat(b.market?.priceRaw) || 0) - (parseFloat(a.market?.priceRaw) || 0);
      }
      case 5: {
        const aIsAlq = a.market?.mode === 'Alquiler';
        const bIsAlq = b.market?.mode === 'Alquiler';
        if (aIsAlq && !bIsAlq) return -1;
        if (!aIsAlq && bIsAlq) return 1;
        return (parseFloat(a.market?.priceRaw) || 0) - (parseFloat(b.market?.priceRaw) || 0);
      }
      case 6: {
        const aIsAlq = a.market?.mode === 'Alquiler';
        const bIsAlq = b.market?.mode === 'Alquiler';
        if (aIsAlq && !bIsAlq) return -1;
        if (!aIsAlq && bIsAlq) return 1;
        return (parseFloat(b.market?.priceRaw) || 0) - (parseFloat(a.market?.priceRaw) || 0);
      }
      case 7: return (b.visitCounter || 0) - (a.visitCounter || 0);
      case 8: return (parseFloat(b.dimensions?.landM2) || 0) - (parseFloat(a.dimensions?.landM2) || 0);
      case 9: return (parseFloat(a.dimensions?.landM2) || 0) - (parseFloat(b.dimensions?.landM2) || 0);
      default: return 0;
    }
  });

  // IDs a ocultar (cuando viene desde ultimaspropiedades)
  const hiddenIds = location.state?.hiddenIds || [];

  // Filtrar propiedades ocultas
  const filteredSorted = sortedPropiedades.filter(p => !hiddenIds.includes(p._id));

  const hasMore = currentPage < totalPages;

  // "Ver más" - carga la siguiente página y acumula (como propiedadesLabs)
  const handleLoadMore = async () => {
    if (loadingMore || currentPage >= totalPages) return;
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    await loadPropertiesPage(nextPage, true);
  };

  // ========== PRESERVAR SCROLL / ESTADO AL IR A DETALLE Y VOLVER ==========

  // Ref permanente: true mientras los datos fueron restaurados desde sessionStorage.
  // Usar ref (no estado) para que no cause re-renders ni se resetee entre ejecuciones del load effect.
  const restoredRef = useRef(false);

  // Ref para saber si el usuario navegó a una propiedad (no limpiar STATE_KEY en ese caso)
  const navigatedToPropertyRef = useRef(false);

  // Guardar estado completo antes de navegar a una propiedad
  const saveStateBeforeNavigate = useCallback((propertyId) => {
    navigatedToPropertyRef.current = true;
    try {
      const state = {
        scrollY: window.scrollY,
        lastPropertyId: propertyId,
        propiedades,
        filteredPropiedades,
        currentPage,
        totalPages,
        sortOption,
        isFiltering,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch { /* ignorar */ }
  }, [propiedades, filteredPropiedades, currentPage, totalPages, sortOption, isFiltering, STATE_KEY]);

  // Restaurar estado al montar (volviendo de detalle)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STATE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (Date.now() - parsed.timestamp > 5 * 60 * 1000) {
        sessionStorage.removeItem(STATE_KEY);
        return;
      }

      // Restaurar datos
      setpropiedades(parsed.propiedades || []);
      setFilteredPropiedades(parsed.filteredPropiedades || []);
      setCurrentPage(parsed.currentPage || 1);
      setTotalPages(parsed.totalPages || 1);
      if (parsed.sortOption) setSortOption(parsed.sortOption);
      setIsFiltering(parsed.isFiltering || false);
      setloading(false);

      // Marcar como restaurado
      restoredRef.current = true;

      // Scroll al elemento de la propiedad clickeada, o al scrollY guardado como fallback
      const lastId = parsed.lastPropertyId;
      const scrollY = parsed.scrollY || 0;

      const doScroll = () => {
        if (lastId) {
          const el = document.getElementById(`prop-${lastId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
            return;
          }
        }
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      };

      // Esperar a que el DOM se pinte con las propiedades restauradas
      requestAnimationFrame(() => requestAnimationFrame(doScroll));

      // NO borrar STATE_KEY aquí — el load effect lo borra cuando lo lee como guardia
    } catch {
      sessionStorage.removeItem(STATE_KEY);
    }
  }, []); // Solo al montar

  // Efecto para cargar datos: siempre con paginación (la API maneja la búsqueda por ?search=)
  useEffect(() => {
    // Guardia primaria: STATE_KEY en sessionStorage (datos recién restaurados, primera ejecución)
    try {
      const saved = sessionStorage.getItem(STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timestamp && Date.now() - parsed.timestamp <= 5 * 60 * 1000) {
          sessionStorage.removeItem(STATE_KEY); // consumir el guardia
          restoredRef.current = true; // activar guardia secundaria para re-ejecuciones inmediatas
          return;
        }
        sessionStorage.removeItem(STATE_KEY);
      }
    } catch { /* ignorar */ }

    // Guardia secundaria: restoredRef protege contra re-ejecuciones inmediatas del effect
    // causadas por cambios en loadPropertiesPage/buildApiUrl justo después de la restauración
    if (restoredRef.current) {
      restoredRef.current = false;
      return;
    }

    setloading(true);
    setpropiedades([]);
    setCurrentPage(1);
    setTotalPages(1);
    loadPropertiesPage(1, false);
  }, [filters.search, filters.mode, filters.type, filters.department, filters.municipality, filters.zone, filters.featured, filters.exclusive, filters.minPrice, filters.maxPrice, currencyMode, agentId, userId, loadPropertiesPage]);

  // Limpiar sessionStorage al salir de la página de propiedades (navegar a otra ruta)
  // pero NO si el usuario navegó a una propiedad (para poder restaurar al volver)
  useEffect(() => {
    return () => {
      if (!navigatedToPropertyRef.current) {
        try {
          sessionStorage.removeItem(STATE_KEY);
          sessionStorage.removeItem(SESSION_KEY);
        } catch { /* ignorar */ }
      }
      navigatedToPropertyRef.current = false;
    };
  }, []);

  return (

    <>
        <SEO
          title="Propiedades"
          description="Explora nuestra amplia selección de propiedades en venta y alquiler en Guatemala. Casas, apartamentos, terrenos, oficinas y más. Filtra por precio, ubicación y tipo."
          url="https://www.bricklyhomes.com/propiedades"
        />
        <Container>
      <div className="mt-3 mt-lg-5">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <div style={{ fontSize: 'clamp(20px, 3vw, 28px)'}}>
            {agentName
              ? t(`Propiedades de ${agentName}`, `Properties of ${agentName}`)
              : <FormattedMessage id='property.text1' />
            }
          </div>
          {(agentName || location.state?.fromLocationSection) && (
            <Link onClick={() => navigate(-1)} title={t('Atrás', 'Back')}>
              <img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" srcSet="" />
            </Link>
          )}
        </div>
      </div>

      <div className="mt-0 mt-lg-4 bg-white py-4 sticky-top-ajustado">
        <div className="d-flex gap-2 align-items-center flex-wrap filterProperties">
          
          {/* Buscador */}
          <InputGroup className="flex-grow-1" style={{ maxWidth: '400px' }}>
            <Form.Control
              placeholder={t('Buscar por nombre o zona', 'Search by name or area')}
              className="border-dark border-end-0"
              aria-label={t('Buscar por nombre o zona', 'Search by name or area')}
              value={filters.search}
              onChange={(e) => handleSelect('search', e.target.value)}
              style={{ fontSize: '14px' }}
            />
            <Button variant="dark" className="border-dark border-start-0" aria-label={t('Buscar propiedades', 'Search properties')}>
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            </Button>
          </InputGroup>

          {/* Botón Filtros en móvil */}
          <Button variant="outline-dark" className="d-lg-none" onClick={() => setShowMobileFilters(true)}>
            <i className="fa-solid fa-sliders me-2"></i>Filtros
            {isFiltering && <span className="ms-2 badge bg-dark">•</span>}
          </Button>

          {/* Filtros desktop */}
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

          {/* Selector de Precio "Estilo Zillow" */}
          <Dropdown autoClose="outside" className="d-none d-lg-block">
            <Dropdown.Toggle variant={isPriceFilterActive() ? 'dark' : 'outline-dark'} style={{ textAlign: 'left', fontSize: '14px' }}>
              {isPriceFilterActive()
                ? `${formatCurrencyShort(filters.minPrice)} - ${formatCurrencyShort(filters.maxPrice)}`
                : t('Precio', 'Price')}
            </Dropdown.Toggle>
            <Dropdown.Menu className="p-3 shadow border-0" style={{ width: 'min(300px, 90vw)' }}>
              <h6 className="mb-3">{ t('Rango de precio', 'Price range') } ({currencyMode})</h6>

              {loadingShow ? (
                <div className="text-center py-2"><div className="spinner-border spinner-border-sm"></div></div>
              ) : (
                <>
                  <Form.Range 
                    min={0} max={maxPriceLimit} step={currencyMode === 'GTQ' ? 1000 : 100}
                    value={Math.min(sliderPrice.min, maxPriceLimit)}
                    onChange={(e) => handleSelect('minPrice', e.target.value)}
                  />
                  <Form.Range 
                    min={0} max={maxPriceLimit} step={currencyMode === 'GTQ' ? 1000 : 100}
                    value={Math.min(sliderPrice.max, maxPriceLimit)}
                    onChange={(e) => handleSelect('maxPrice', e.target.value)}
                  />
                  <div className="d-flex gap-2 align-items-center mt-3">
                    <Form.Control 
                      size="sm" 
                      type="text"
                      value={currencyMode === 'GTQ' ? formatGTQInput(sliderPrice.min) : formatUSDInput(sliderPrice.min)} 
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        e.target.value = currencyMode === 'GTQ' ? formatGTQInput(raw) : formatUSDInput(raw);
                        handleSelect('minPrice', raw || '0');
                      }}
                      onClick={(e) => e.target.select()}
                    />
                    <span>–</span>
                    <Form.Control 
                      size="sm" 
                      type="text"
                      value={currencyMode === 'GTQ' ? formatGTQInput(sliderPrice.max) : formatUSDInput(sliderPrice.max)} 
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        const clamped = Math.min(parseInt(raw || '0', 10), PRICE_VISUAL_MAX);
                        e.target.value = currencyMode === 'GTQ' ? formatGTQInput(clamped) : formatUSDInput(clamped);
                        handleSelect('maxPrice', String(clamped));
                      }}
                      onClick={(e) => e.target.select()}
                    />
                  </div>
                </>
              )}
            </Dropdown.Menu>
          </Dropdown>

          {/* Tipo de Propiedad */}
          <Dropdown className="d-none d-lg-block">
            <Dropdown.Toggle variant={filters.type !== 'Todos' ? 'dark' : 'outline-dark'} style={{ fontSize: '14px' }}>
              {filters.type === 'Todos' ? t('Tipo', 'Type') : filters.type}
            </Dropdown.Toggle>
            <Dropdown.Menu className="p-2 shadow border-0">
              {['Todos', 'Apartamento', 'Bodega', 'Casa', 'Edificio', 'Finca', 'Local comercial', 'Oficina', 'Terreno'].map(type => (
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
            <Dropdown.Toggle variant={(!loadingShow && !(filters.minSize === 0 && filters.maxSize >= maxSizeLimit)) ? 'dark' : 'outline-dark'} style={{ fontSize: '14px' }}>
              {(!loadingShow && !(filters.minSize === 0 && filters.maxSize >= maxSizeLimit))
                ? `${filters.minSize} - ${filters.maxSize} m²`
                : t('Tamaño', 'Size')}
            </Dropdown.Toggle>
            <Dropdown.Menu className="p-3 shadow border-0" style={{ width: 'min(300px, 90vw)' }}>
              <h6 className="mb-3">{ t('Rango de tamaño (m²)', 'Size range (m²)') }</h6>
              {loadingShow ? (
                <div className="text-center py-2"><div className="spinner-border spinner-border-sm"></div></div>
              ) : (
                <>
                  <Form.Range
                    min={0} max={maxSizeLimit} step={10}
                    value={Math.min(filters.minSize, maxSizeLimit)}
                    onChange={(e) => handleSelect('minSize', parseInt(e.target.value))}
                  />
                  <Form.Range
                    min={0} max={maxSizeLimit} step={10}
                    value={Math.min(filters.maxSize, maxSizeLimit)}
                    onChange={(e) => handleSelect('maxSize', parseInt(e.target.value))}
                  />
                  <div className="d-flex gap-2 align-items-center mt-3">
                    <Form.Control
                      size="sm"
                      type="number"
                      value={filters.minSize}
                      onChange={(e) => handleSelect('minSize', parseInt(e.target.value) || 0)}
                      onClick={(e) => e.target.select()}
                    />
                    <span>–</span>
                    <Form.Control
                      size="sm"
                      type="number"
                      value={filters.maxSize}
                      onChange={(e) => handleSelect('maxSize', parseInt(e.target.value) || 0)}
                      onClick={(e) => e.target.select()}
                    />
                  </div>
                </>
              )}
            </Dropdown.Menu>
          </Dropdown>
          )}

          {/* Camas y Baños */}
          {filters.type !== 'Terreno' && filters.type !== 'Finca' && (
          <Dropdown autoClose="outside" className="d-none d-lg-block">
            <Dropdown.Toggle variant={(filters.beds !== 'Cualquiera' || filters.baths !== 'Cualquiera') ? 'dark' : 'outline-dark'} style={{ fontSize: '14px' }}>
              {filters.beds === 'Cualquiera' && filters.baths === 'Cualquiera'
                ? ((filters.type === 'Oficina' || filters.type === 'Local comercial') ? t('Espacios y Baños', 'Spaces and Bathroom') : filters.type === 'Bodega' ? t('Ambientes', 'Spaces') : t('Camas y Baños', 'Bedrooms and Bathroom'))
                : `${filters.beds} C${filters.type !== 'Bodega' ? `, ${filters.baths} B` : ''}`}
            </Dropdown.Toggle>
            <Dropdown.Menu className="p-3 shadow border-0" style={{ width: 'fit-content' }}>
              <p className="small fw-bold mb-2">{ (filters.type === 'Oficina' || filters.type === 'Local comercial') ? t('Espacios', 'Spaces') : filters.type === 'Bodega' ? t('Ambientes', 'Spaces') : t('Habitaciones', 'Bedrooms') }</p>
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
                inputId="desktop-properties-department"
                instanceId="desktop-properties-department"
                aria-label={t('Departamento', 'Department')}
                options={deptOptions}
                value={filters.department ? { value: filters.department, label: filters.department } : null}
                styles={{ 
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
                  })
                }}
                onChange={(v) => { handleSelect('department', v?.value ?? null); handleSelect('municipality', null); handleSelect('zone', null); }}
                placeholder={t("Seleccione...", "Select...")}
                isClearable
              />
              <p className="small fw-bold mb-2 mt-3">Municipio</p>
              <Select
                inputId="desktop-properties-municipality"
                instanceId="desktop-properties-municipality"
                aria-label={t('Municipio', 'Municipality')}
                options={muniOptions}
                value={filters.municipality ? { value: filters.municipality, label: filters.municipality } : null}
                styles={{ 
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
                  })
                }}
                onChange={(v) => { handleSelect('municipality', v?.value ?? null); handleSelect('zone', null); }}
                placeholder={t("Seleccione...", "Select...")}
                isClearable
                isDisabled={!filters.department}
              />
              <p className="small fw-bold mb-2 mt-3">Zona</p>
              <Select
                inputId="desktop-properties-zone"
                instanceId="desktop-properties-zone"
                aria-label={t('Zona', 'Zone')}
                options={zoneOptions}
                value={filters.zone ? { value: filters.zone, label: filters.zone } : null}
                styles={{ 
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
                  })
                }}
                onChange={(v) => handleSelect('zone', v?.value ?? null)}
                placeholder={t("Seleccione...", "Select...")}
                isClearable
                isDisabled={!filters.municipality}
              />
            </Dropdown.Menu>
          </Dropdown>

          <Select
            options={dataOptions}
            placeholder={t('Ordenar por', 'Order by')}
            value={sortOption}
            isSearchable={false}
            inputId="properties-sort-order"
            aria-label={t('Ordenar propiedades', 'Sort properties')}
            onChange={(v) => {
              setSortOption(v);
            }}
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
              width: 'fit-content'
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
              onRemove: () => { handleSelect('minPrice', 0); handleSelect('maxPrice', maxPriceLimit); }
            });

          if (!loadingShow && filters.type === 'Bodega' && (filters.minSize > 0 || filters.maxSize < maxSizeLimit))
            chips.push({
              key: 'size',
              label: `${filters.minSize} – ${filters.maxSize} m²`,
              onRemove: () => { handleSelect('minSize', 0); handleSelect('maxSize', maxSizeLimit); }
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
                onClick={() => handleClearFilters()}
                className="d-inline-flex align-items-center gap-1 px-3 py-1 rounded-pill"
                style={{ backgroundColor: 'transparent', border: '1px solid #1a1a1a', color: '#1a1a1a', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >
                {t('Limpiar todo', 'Clear all')} <i className="fa-solid fa-xmark ms-1"></i>
              </button>
            </div>
          );
        })()}
      </div>

      {/* Panel de filtros móvil tipo Zillow */}
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
                <i className="fa-solid fa-xmark fs-5" aria-hidden="true"></i>
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
              <p className="fw-bold mb-2">{t('Rango de precio', 'Price range')} ({currencyMode})</p>
              {!loadingShow && <>
                <Form.Range min={0} max={maxPriceLimit} step={currencyMode === 'GTQ' ? 1000 : 100}
                  aria-label={t('Precio mínimo', 'Minimum price')}
                  value={Math.min(sliderPrice.min, maxPriceLimit)}
                  onChange={(e) => handleSelect('minPrice', e.target.value)} />
                <Form.Range min={0} max={maxPriceLimit} step={currencyMode === 'GTQ' ? 1000 : 100}
                  aria-label={t('Precio máximo', 'Maximum price')}
                  value={Math.min(sliderPrice.max, maxPriceLimit)}
                  onChange={(e) => handleSelect('maxPrice', e.target.value)} />
                <div className="d-flex gap-2 align-items-center mt-2">
                  <Form.Control size="sm" type="text"
                    aria-label={t('Precio mínimo', 'Minimum price')}
                    value={currencyMode === 'GTQ' ? formatGTQInput(sliderPrice.min) : formatUSDInput(sliderPrice.min)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      e.target.value = currencyMode === 'GTQ' ? formatGTQInput(raw) : formatUSDInput(raw);
                      handleSelect('minPrice', raw || '0');
                    }} onClick={(e) => e.target.select()} />
                  <span>–</span>
                  <Form.Control size="sm" type="text"
                    aria-label={t('Precio máximo', 'Maximum price')}
                    value={currencyMode === 'GTQ' ? formatGTQInput(sliderPrice.max) : formatUSDInput(sliderPrice.max)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      const clamped = Math.min(parseInt(raw || '0', 10), PRICE_VISUAL_MAX);
                      e.target.value = currencyMode === 'GTQ' ? formatGTQInput(clamped) : formatUSDInput(clamped);
                      handleSelect('maxPrice', String(clamped));
                    }} onClick={(e) => e.target.select()} />
                </div>
              </>}
            </div>

            {/* Tipo de propiedad */}
            <div className="mb-4">
              <p className="fw-bold mb-2">Tipo de propiedad</p>
              <div className="d-flex flex-wrap gap-2">
                {['Todos', 'Apartamento', 'Bodega', 'Casa', 'Edificio', 'Finca', 'Local comercial', 'Oficina', 'Terreno'].map(type => (
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
              {!loadingShow && <>
                <Form.Range min={0} max={maxSizeLimit} step={10}
                  aria-label={t('Tamaño mínimo', 'Minimum size')}
                  value={Math.min(sliderSize.min, maxSizeLimit)}
                  onChange={(e) => handleSelect('minSize', parseInt(e.target.value))} />
                <Form.Range min={0} max={maxSizeLimit} step={10}
                  aria-label={t('Tamaño máximo', 'Maximum size')}
                  value={Math.min(sliderSize.max, maxSizeLimit)}
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
              </>}
            </div>
            )}

            {/* Camas */}
            {filters.type !== 'Terreno' && filters.type !== 'Finca' && (
            <div className="mb-4">
              <p className="fw-bold mb-2">{ (filters.type === 'Oficina' || filters.type === 'Local comercial') ? t('Espacios', 'Spaces') : filters.type === 'Bodega' ? t('Ambientes', 'Spaces') : t('Habitaciones', 'Bedrooms') }</p>
              <ButtonGroup size="sm" className="w-100">
                {['Cualquiera', '1+', '2+', '3+', '4+', '5+'].map(text => (
                  <Button key={text} variant={filters.beds === text ? 'dark' : 'outline-dark'}
                    onClick={() => handleSelect('beds', text)}>{text}</Button>
                ))}
              </ButtonGroup>
            </div>
            )}

            {/* Baños */}
            {filters.type !== 'Terreno' && filters.type !== 'Finca' && filters.type !== 'Bodega' && (
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
                  inputId="mobile-properties-department"
                  aria-label="Departamento"
                  value={filters.department ? { value: filters.department, label: filters.department } : null}
                  onChange={(v) => { handleSelect('department', v?.value ?? null); handleSelect('municipality', null); handleSelect('zone', null); }}
                  placeholder={t("Seleccione...", "Select...")} isClearable />
              </div>
              <div className="mb-2">
                <label className="small text-muted mb-1">Municipio</label>
                <Select options={muniOptions}
                  inputId="mobile-properties-municipality"
                  aria-label="Municipio"
                  value={filters.municipality ? { value: filters.municipality, label: filters.municipality } : null}
                  onChange={(v) => { handleSelect('municipality', v?.value ?? null); handleSelect('zone', null); }}
                  placeholder={t("Seleccione...", "Select...")} isClearable isDisabled={!filters.department} />
              </div>
              <div>
                <label className="small text-muted mb-1">Zona</label>
                <Select options={zoneOptions}
                  inputId="mobile-properties-zone"
                  aria-label="Zona"
                  value={filters.zone ? { value: filters.zone, label: filters.zone } : null}
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

      {loadingShow ? (
        <div className="text-center py-5" style={{ minHeight: '60vh' }}>
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <div className="mt-3 text-muted">{t('Cargando propiedades...', 'Loading properties...')}</div>
        </div>
      ) : filteredPropiedades && filteredPropiedades.length > 0 ? (
        <div style={{ marginTop: 'clamp(2rem, 3vw, 3rem)'}}>
          <div className="row gy-5" style={{ marginBottom: 'clamp(5rem, 8vw, 7rem)' }}>
            {filteredSorted.map((item, index) => (
              <div className="col-md-6 col-xl-4 d-flex flex-column" key={item._id || index} id={`prop-${item._id}`}>
                <Link to={`/propiedad/${item._id}`} className="position-relative d-block propiedades-zoom" onClick={() => saveStateBeforeNavigate(item._id)}>
                  <img
                    src={URL + '/' + item.media?.photos[0]?.path}
                    className="object-fit-cover w-100 border-radius-1"
                    style={{ aspectRatio: '4 / 4' }}
                    alt=""
                    loading="lazy"
                  />
                  <div style={{ padding: '5%' }} className='position-absolute top-0 w-100 h-100 d-flex flex-column justify-content-between'>
                      <div className='d-flex gap-2 flex-wrap'>
                        {item.featured?.isActive ? (
                          <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', padding: '3px 10px', fontSize: '14px' }}>
                            <img src={diamond} style={{ width: '14px' }} alt="" /><FormattedMessage id="home.text31" />
                          </div>
                        ) : null}
                        {item.exclusive ? (
                          <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', padding: '3px 10px', fontSize: '14px' }}>
                            <FormattedMessage id="home.text7" />
                          </div>
                        ) : null}
                      </div>
                      <div className='d-flex justify-content-end align-items-center gap-2'>
                        <div className='rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', padding: '3px 10px', fontSize: '12px' }}><FormattedMessage id="home.text8" />: { item.visitCounter } </div>
                        <div className={`favorite-icon ${isFavorite(item._id) ? 'like' : 'unlike'}` } style={{ cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); if (isAuthenticated() && !canFavorite) return; const iconElement = e.currentTarget.querySelector('i'); iconElement.style.transform = 'scale(1.3)'; setTimeout(() => { iconElement.style.transform = 'scale(1)'; toggleFav(item._id); }, 200); }}>
                          <i className="fa-solid fa-heart"></i>
                        </div>
                      </div>
                  </div>
                </Link>
                <Link to={`/propiedad/${item._id}`} className="mt-3 text-body d-flex flex-column flex-grow-1" onClick={() => saveStateBeforeNavigate(item._id)}>
                  <div className='text-truncate' style={{ fontSize: 'clamp(34px, 6vw, 44px)', fontFamily: 'AppleGaramond' }}>{ item.market?.title }</div>
                  <div>
                    <i className='fa-solid fa-location-dot me-2' style={{ width: 'fit-content' }}></i>
                    {item?.location?.department && item?.location?.department.toLowerCase() !== "ninguno" && (
                      <>{item?.location?.department}</>
                    )}
                    {item?.location?.department && item?.location?.department.toLowerCase() !== "ninguno" &&
                      item?.location?.municipality && item?.location?.municipality.toLowerCase() !== "ninguno" && (
                      <>, {item?.location?.municipality}</>
                    )}
                    {item?.location?.municipality && item?.location?.municipality.toLowerCase() !== "ninguno" &&
                      item?.location?.zone && item?.location?.zone.toLowerCase() !== "ninguno" && (
                      <>, {item?.location?.zone}</>
                    )}
                  </div>
                  <div><FormattedMessage id="home.text9" />: { item.market?.type }</div>
                  { (item.layout?.bedrooms > 0 || item.layout?.bathrooms > 0 || item.layout?.parkingSpots > 0 || item.dimensions?.landM2 > 0 || item?.dimensions?.landV2 > 0) && 
                    <div className='d-flex gap-4 my-3' style={{ fontSize: '16px' }}>
                      {item.layout?.bedrooms > 0 && (
                        (item?.market?.type?.toLowerCase() === 'oficina' || item?.market?.type?.toLowerCase() === 'local comercial') && item?.layout?.totalRooms > 0 ? (
                          <div className='d-flex align-items-center gap-2' title='Total de ambientes'><img src={space} alt="icon" style={{ width: '14px' }} /> {item.layout?.totalRooms}</div>
                        ) : (
                          <div title='Total de habitaciones'><i className="fa-solid fa-bed me-2"></i> {item?.layout?.bedrooms || 0}</div>
                        ))}
                      {item.layout?.bathrooms > 0 &&
                        <div title='Total de baños'><i className="fa-solid fa-bath me-2"></i> {(item.layout?.bathrooms || 0) + (item.layout?.halfBathrooms || 0)}</div>
                      }
                      {item.layout?.parkingSpots > 0 &&
                        <div title='Parqueo / Driveway'><i className="fa-solid fa-car-side me-2"></i> {item.layout?.parkingSpots || 0}</div>
                      }
                      {(item?.dimensions?.landM2 > 0 || item?.dimensions?.landV2 > 0) &&
                        <div title={item?.dimensions?.landM2 > 0 ? 'Área de terreno (m²)' : 'Área de terreno (v²)'}><i className="fa-solid fa-crop-simple me-2"></i> {item?.dimensions?.landM2 > 0 ? `${item.dimensions.landM2}m²` : `${item.dimensions.landV2}v²`}</div>
                      }
                    </div>
                  }
                  <div className='mt-auto fw-bold fs-4 text-dark d-flex align-items-center gap-4'>
                    {(() => {
                      const dp = getDisplayPrice(item.market, currencyMode);
                      return dp ? formatPrice(dp.value, dp.currency) : null;
                    })()}
                    { item.market.mode && (() => {
                      let modeImg = ""
                      let modeColor = ""
                      let modeText = ""
                      if(item.market.mode == "Venta"){
                        modeImg = venta
                        modeColor = "bg-dark"
                        modeText = "text3"
                      }else if (item.market.mode == "Alquiler"){
                        modeImg = alquiler
                        modeColor = "#B65740"
                        modeText = "text4"
                      }

                      return (
                        <div className='d-flex align-items-center gap-2'><img src={modeImg} alt="icons" style={{ width: '20px' }} /> <div className={`${modeText == "text3" ? "bg-dark " : ""} rounded-1 px-4 py-0 text-white fw-lighter`} style={{ fontSize: '16px', ...(modeText == "text4" && { backgroundColor: modeColor })  }}><FormattedMessage id={`favorite.${modeText}`} /></div></div>
                      )
                    })()}
                  </div>
                </Link>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="d-flex justify-content-center" style={{ marginBottom: 'clamp(3rem, 6vw, 6rem)' }}>
              <button className="link-more-black d-flex align-items-center gap-2" onClick={handleLoadMore} disabled={loadingMore} style={{ background: 'none', cursor: loadingMore ? 'wait' : 'pointer' }}>
                {loadingMore ? (
                  <><span className="spinner-border spinner-border-sm me-2" role="status"></span>{t('Cargando...', 'Loading...')}</>
                ) : (
                  <>{t('Ver más', 'View more')} <i className="fa-solid fa-angle-right"></i></>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: '8rem', marginBottom: '8rem' }} className="text-center">
            <div className="fs-2 text-muted">{t('No coinciden propiedades con estos filtros', 'No properties match these filters')}</div>
            <Button variant="link" className="text-dark" onClick={handleClearFilters}>{t('Limpiar filtros', 'Clean filters')}</Button>
        </div>
      )}
    </Container>
    </>
  );
}

export default Propiedades;