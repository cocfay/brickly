import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import Select from 'react-select';
import { getPropiedades } from '../cpanel/services/propiedades';
import { getPropertyRanges } from '../services/propertyRanges';
import { useCurrency } from '../context/CurrencyContext';

const darkStyles = {
  control: (base) => ({
    ...base, backgroundColor: 'transparent', border: 'none', borderRadius: 0,
    boxShadow: 'none', minHeight: '44px', cursor: 'pointer',
  }),
  singleValue: (base) => ({ ...base, color: 'white', fontSize: '14px' }),
  placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,0.85)', fontSize: '14px', whiteSpace: 'nowrap' }),
  menu: (base) => ({ ...base, backgroundColor: '#1a1a1a', borderRadius: 0, zIndex: 9999 }),
  option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#333' : '#1a1a1a', color: 'white', cursor: 'pointer', fontSize: '14px' }),
  dropdownIndicator: (base) => ({ ...base, color: 'rgba(255,255,255,0.7)', padding: '0 10px' }),
  indicatorSeparator: () => ({ display: 'none' }),
  clearIndicator: (base) => ({ ...base, color: 'rgba(255,255,255,0.7)' }),
  input: (base) => ({ ...base, color: 'white' }),
  valueContainer: (base) => ({ ...base, paddingLeft: '14px' }),
};

const innerStyles = {
  ...darkStyles,
  control: (base) => ({
    ...darkStyles.control(base),
    minHeight: '38px', minWidth: '100%',
    backgroundColor: '#2a2a2a', border: '1px solid #444',
  }),
};

const TIPOS = ['Apartamento', 'Bodega', 'Casa', 'Edificio', 'Finca', 'Local comercial', 'Oficina', 'Terreno'];
const TIPOS_OPTIONS = TIPOS.map(t => ({ value: t, label: t }));

// Dropdown simple sin listener propio — el padre controla todo
function SearchDropdown({ id, label, children, fullWidthPanel = false, openId, setOpenId }) {
  const isOpen = openId === id;
  const btnRef = useRef(null);
  const [panelTop, setPanelTop] = useState(0);

  const handleButtonClick = (e) => {
    e.stopPropagation();
    if (!isOpen && fullWidthPanel && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPanelTop(rect.bottom + window.scrollY);
    }
    setOpenId(isOpen ? null : id);
  };

  return (
    <div style={{ position: 'relative', minWidth: '180px' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleButtonClick}
        style={{
          width: '100%', background: 'transparent', border: 'none', color: 'white',
          padding: '0 16px', height: '50px', fontSize: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', whiteSpace: 'nowrap', gap: '8px',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        <i className="fa fa-chevron-down" style={{ fontSize: '0.7rem', opacity: 0.75, flexShrink: 0 }} />
      </button>
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={fullWidthPanel ? {
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100vw - 2rem)',
            zIndex: 9999,
            marginTop: '4px',
            backgroundColor: '#1a1a1a', padding: '16px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.7)',
          } : {
            position: 'absolute', top: '100%', left: 0, zIndex: 9999,
            marginTop: '10px',
            backgroundColor: '#1a1a1a', padding: '16px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.7)',
            width: '300px', maxWidth: '95vw',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const SearchBar = () => {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const containerRef = useRef(null);

  const [propiedades, setPropiedades] = useState([]);
  const [tipo, setTipo] = useState(null);
  const [departamento, setDepartamento] = useState(null);
  const [municipio, setMunicipio] = useState(null);
  const [zona, setZona] = useState(null);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(null);
  const [maxPriceLimit, setMaxPriceLimit] = useState(10000000);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);


  // Cerrar al hacer click fuera del searchbar completo
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cargar todas las propiedades publicadas para poblar los selects de tipo/ubicación
  // y obtener rangos de precio desde la API optimizada var-ranges

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Obtener rangos de precio desde API optimizada (sin descargar propiedades)
      const rangesRes = await getPropertyRanges();
      if (rangesRes.success) {
        const rawMax = currency === 'GTQ'
          ? rangesRes.data.price.maxPrice
          : rangesRes.data.price.maxPriceUSD;
        const step = currency === 'GTQ' ? 1000 : 100;
        const limit = Math.ceil(rawMax / step) * step;
        setMaxPriceLimit(limit);
        setMaxPrice(limit);
      }

      // Cargar TODAS las propiedades publicadas para poblar los selects de tipo/ubicación
      // (usa fetchAllPages internamente para recorrer todas las páginas)
      const res = await getPropiedades({ status: 'published' });

      if (res.success) {
        // La respuesta paginada viene como { data: { data: [...], total, page, limit, totalPages } }
        const props = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setPropiedades(props);
      }

      setLoading(false);
    };
    loadData();
  }, [currency]);



  const tiposDisponibles = TIPOS_OPTIONS;

  const departamentosDisponibles = [...new Set(propiedades.map(p => p.location?.department).filter(Boolean))]
    .sort().map(d => ({ value: d, label: d }));

  const municipiosDisponibles = departamento
    ? [...new Set(propiedades.filter(p => p.location?.department === departamento.value).map(p => p.location?.municipality).filter(Boolean))].sort().map(m => ({ value: m, label: m }))
    : [];

  const zonasDisponibles = municipio
    ? [...new Set(propiedades.filter(p => p.location?.department === departamento?.value && p.location?.municipality === municipio.value).map(p => p.location?.zone).filter(Boolean))].sort().map(z => ({ value: z, label: z }))
    : [];

  const sym = currency === 'GTQ' ? 'Q' : '$';
  const formatShort = (val) => {
    if (!val && val !== 0) return sym + '0';
    if (val >= 1000000) return sym + (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (val >= 1000) return sym + (val / 1000).toFixed(0) + 'K';
    return sym + val;
  };

  const step = currency === 'GTQ' ? 1000 : 100;
  const curMax = maxPrice ?? maxPriceLimit;
  const locationLabel = zona?.label ?? municipio?.label ?? departamento?.label ?? null;
  const priceActive = minPrice > 0 || curMax < maxPriceLimit;

  const handleSearch = () => {
    setOpenId(null);
    navigate('/propiedades', {
      state: {
        type: tipo?.value ?? null,
        department: departamento?.value ?? null,
        municipality: municipio?.value ?? null,
        zone: zona?.value ?? null,
        minPrice,
        maxPrice: curMax,
      }
    });
  };

  const ubicacionPanel = (
    <>
      <div className="mb-3">
        <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '6px', display: 'block' }}>Departamento</label>
        <Select options={departamentosDisponibles} value={departamento}
          onChange={(v) => { setDepartamento(v); setMunicipio(null); setZona(null); }}
          placeholder="Seleccione..." isClearable styles={innerStyles} />
      </div>
      <div className="mb-3">
        <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '6px', display: 'block' }}>Municipio</label>
        <Select options={municipiosDisponibles} value={municipio}
          onChange={(v) => { setMunicipio(v); setZona(null); }}
          placeholder="Seleccione..." isClearable isDisabled={!departamento} styles={innerStyles} />
      </div>
      <div>
        <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '6px', display: 'block' }}>Zona</label>
        <Select options={zonasDisponibles} value={zona} onChange={setZona}
          placeholder="Seleccione..." isClearable isDisabled={!municipio} styles={innerStyles} />
      </div>
    </>
  );

  const precioPanel = (
    <>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '10px' }}>
        {formatShort(minPrice)} – {formatShort(curMax)}
      </div>
      <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Mínimo</label>
      <input type="range" className="form-range mb-3" min={0} max={maxPriceLimit} step={step}
        value={minPrice} onChange={e => setMinPrice(Number(e.target.value))} />
      <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Máximo</label>
      <input type="range" className="form-range" min={0} max={maxPriceLimit} step={step}
        value={curMax} onChange={e => setMaxPrice(Number(e.target.value))} />
    </>
  );

  const divider = (horizontal) => (
    <div style={horizontal
      ? { width: '1px', backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'stretch' }
      : { height: '1px', backgroundColor: 'rgba(255,255,255,0.25)', width: '100%' }
    } />
  );

  const sharedProps = { openId, setOpenId };

  // ---- DESKTOP ----
  const desktop = (
    <div className="d-none d-lg-flex align-items-stretch"
      style={{ border: '1px solid rgba(255,255,255,0.35)', backgroundColor: 'rgba(0,0,0,0.3)', width: 'fit-content' }}>

      <div style={{ display: 'flex', alignItems: 'center', minWidth: '180px' }}>
        <Select className='w-100' options={tiposDisponibles} value={tipo} onChange={setTipo}
          placeholder={<FormattedMessage id='select.text1' />} isClearable styles={darkStyles} />

      </div>

      {divider(true)}

      <SearchDropdown id="ubicacion" label={locationLabel ?? <FormattedMessage id='select.text2' />} {...sharedProps}>
        {ubicacionPanel}
      </SearchDropdown>

      {divider(true)}

      <SearchDropdown id="precio" label={priceActive ? `${formatShort(minPrice)} – ${formatShort(curMax)}` : <FormattedMessage id='select.text3' />} {...sharedProps}>
        {precioPanel}
      </SearchDropdown>

      {divider(true)}

      <button className="btn btn-dark rounded-0 px-4 text-uppercase" onClick={handleSearch}>
        <FormattedMessage id='select.text4' />
      </button>
    </div>
  );

  // ---- MÓVIL ----
  const mobile = (
    <div className="d-flex flex-column gap-2 d-lg-none w-100">

      <div style={{ border: '1px solid rgba(255,255,255,0.35)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <SearchDropdown id="tipo-m" label={tipo ? tipo.label : <FormattedMessage id='select.text1' />} fullWidthPanel {...sharedProps}>
          <div>
            {tiposDisponibles.map(t => (
              <div key={t.value}
                onClick={() => { setTipo(tipo?.value === t.value ? null : t); setOpenId(null); }}
                style={{
                  padding: '10px 4px', color: 'white', cursor: 'pointer', fontSize: '14px',
                  borderBottom: '1px solid #333',
                  backgroundColor: tipo?.value === t.value ? '#333' : 'transparent',
                }}>
                {t.label}
              </div>
            ))}
            {tipo && (
              <div onClick={() => { setTipo(null); setOpenId(null); }}
                style={{ padding: '10px 4px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '13px', marginTop: '4px' }}>
                ✕ Limpiar
              </div>
            )}
          </div>
        </SearchDropdown>
      </div>

      <div style={{ border: '1px solid rgba(255,255,255,0.35)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <SearchDropdown id="ubicacion-m" label={locationLabel ?? <FormattedMessage id='select.text2' />} fullWidthPanel {...sharedProps}>
          {ubicacionPanel}
        </SearchDropdown>
      </div>

      <div style={{ border: '1px solid rgba(255,255,255,0.35)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <SearchDropdown id="precio-m" label={priceActive ? `${formatShort(minPrice)} – ${formatShort(curMax)}` : <FormattedMessage id='select.text3' />} fullWidthPanel {...sharedProps}>
          {precioPanel}
        </SearchDropdown>
      </div>

      <button className="btn btn-dark rounded-0 py-3 text-uppercase" onClick={handleSearch}>
        <FormattedMessage id='select.text4' />
      </button>
    </div>
  );

  return (
    <div className="mt-4" ref={containerRef}>
      {desktop}
      {mobile}
    </div>
  );
};

export default SearchBar;
