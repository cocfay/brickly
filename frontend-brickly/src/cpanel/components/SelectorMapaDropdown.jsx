// components/SelectorMapaDropdown.jsx
import { useState, useEffect, useRef } from 'react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

function SelectorMapaDropdown({ value, onChange, placeholder = "Buscar dirección..." }) {
    const [inputValue, setInputValue]     = useState('');
    const [suggestions, setSuggestions]   = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading]           = useState(false);
    const debounceRef = useRef(null);
    const wrapperRef  = useRef(null);

    // Inicializar texto si ya viene un valor guardado (coordenadas)
    useEffect(() => {
        if (value && !inputValue) {
            const partes = value.split(',').map(s => s.trim());
            if (partes.length === 2 && !isNaN(Number(partes[0])) && !isNaN(Number(partes[1]))) {
                // Reverse geocode para mostrar el nombre
                fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${partes[1]}&lon=${partes[0]}&format=json&accept-language=es`
                )
                    .then(r => r.json())
                    .then(data => {
                        const name = data?.display_name;
                        if (name) setInputValue(name);
                    })
                    .catch(() => {});
            }
        }
    }, [value]);

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputValue(val);

        if (!val.trim()) {
            setSuggestions([]);
            setShowDropdown(false);
            onChange('');
            return;
        }

        // Debounce 300ms
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                // Nominatim (OpenStreetMap) — mejor cobertura de POIs en Guatemala
                const url = `https://nominatim.openstreetmap.org/search`
                    + `?q=${encodeURIComponent(val)}`
                    + `&format=json`
                    + `&addressdetails=1`
                    + `&limit=6`
                    + `&countrycodes=gt`
                    + `&accept-language=es`
                    + `&featuretype=settlement`
                    + `&dedupe=1`;

                const res  = await fetch(url, {
                    headers: { 'Accept-Language': 'es' }
                });
                const data = await res.json();

                // Mapear al mismo formato que antes
                const features = data.map(item => ({
                    id: item.place_id,
                    text: item.name || item.display_name.split(',')[0],
                    place_name: item.display_name,
                    geometry: {
                        coordinates: [parseFloat(item.lon), parseFloat(item.lat)]
                    },
                    category: item.type,
                }));

                setSuggestions(features);
                setShowDropdown(true);
            } catch {
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 300);
    };

    const handleSelect = (feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const name = feature.place_name || feature.text || '';
        setInputValue(name);
        setSuggestions([]);
        setShowDropdown(false);
        onChange(`${lng.toFixed(6)},${lat.toFixed(6)}`);
    };

    const handleClear = () => {
        setInputValue('');
        setSuggestions([]);
        setShowDropdown(false);
        onChange('');
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            {/* Input */}
            <div style={{ position: 'relative' }}>
                <i
                    className="fa-solid fa-magnifying-glass"
                    style={{
                        position: 'absolute', left: '14px', top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#aaa', fontSize: '13px', pointerEvents: 'none',
                    }}
                />
                <input
                    type="text"
                    className="form-control"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                    placeholder={placeholder}
                    style={{ paddingLeft: '36px', paddingRight: value ? '32px' : '12px' }}
                    autoComplete="off"
                />
                {/* Spinner */}
                {loading && (
                    <span
                        className="spinner-border spinner-border-sm"
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }}
                    />
                )}
                {/* Botón limpiar */}
                {!loading && value && (
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{
                            position: 'absolute', right: '10px', top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none', border: 'none',
                            cursor: 'pointer', color: '#999',
                            fontSize: '16px', lineHeight: 1, padding: '0 2px',
                        }}
                    >×</button>
                )}
            </div>

            {/* Dropdown de sugerencias */}
            {showDropdown && suggestions.length > 0 && (
                <ul
                    style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                        zIndex: 9999,
                        backgroundColor: '#fff',
                        border: '1px solid #ced4da',
                        borderRadius: '12px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        listStyle: 'none',
                        margin: 0, padding: '6px 0',
                        maxHeight: '260px',
                        overflowY: 'auto',
                    }}
                >
                    {suggestions.map((feature) => (
                        <li
                            key={feature.id}
                            onMouseDown={() => handleSelect(feature)}
                            style={{
                                padding: '10px 16px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                borderBottom: '1px solid #f0f0f0',
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <div style={{ fontWeight: 600, color: '#212529' }}>
                                <i className="fa-solid fa-location-dot me-2" style={{ color: '#aaa', fontSize: '12px' }} />
                                {feature.text}
                            </div>
                            <div style={{ color: '#888', fontSize: '12px', marginLeft: '20px' }}>
                                {feature.place_name?.replace(feature.text + ', ', '')}
                            </div>
                        </li>
                    ))}
                    {/* <li style={{ padding: '6px 16px', fontSize: '11px', color: '#bbb', textAlign: 'right' }}>
                        © OpenStreetMap contributors
                    </li> */}
                </ul>
            )}

            {/* Coordenadas guardadas */}
            {value && (
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                    <i className="fa-solid fa-location-dot me-1" style={{ fontSize: '10px' }} />
                    {value}
                </div>
            )}
        </div>
    );
}

export default SelectorMapaDropdown;
