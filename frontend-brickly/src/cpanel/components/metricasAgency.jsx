import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getMetricasAgency, getTotalLeads } from '../services/metricas';
import { API_URL, getCurrentUser } from '../../services/authService';
import { getLogoUrl } from '../../services/logoService';
import diamond from '../../assets/images/iconos/diamond.png';

// --- COMPONENTE MANUAL PARA ANIMAR LOS NÚMEROS ---
const AnimatedNumber = ({ value, duration = 1200 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      
      // Calculamos el porcentaje de tiempo transcurrido (máximo 1)
      const percentage = Math.min(progress / duration, 1);
      
      // Asignamos el valor proporcional
      setCount(Math.floor(percentage * value));

      // Si no ha terminado el tiempo, seguimos animando en el próximo frame
      if (progress < duration) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  // .toLocaleString() añade las comas automáticamente (ej: 48,921)
  return <>{count.toLocaleString()}</>;
};


// --- COLORES EXACTOS ---
const AZUL = '#007aff';
const AZUL_BG = '#e5f1ff';
const CYAN = '#00c7be';
const CYAN_BG = '#e5f9f8';
const MORADO = '#af52de';
const MORADO_BG = '#f7ebfc';
const NARANJA = '#ff9500';
const NARANJA_BG = '#fff4e5';
const ROJO = '#ff3b30';
const ROJO_BG = '#ffebeb';
const AMARILLO = '#ffcc00';
const VERDE = '#34c759';
const GRIS_TEXTO = '#64748b';

// Devuelve el nombre del mes anterior en español
const getMesAnterior = () => {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mesActual = new Date().getMonth(); // 0 = enero, 11 = diciembre
  const mesAnterior = mesActual === 0 ? 11 : mesActual - 1;
  return meses[mesAnterior];
};

const getColorByType = (type) => {
  const colorMap = {
    'Casa': AZUL,
    'Casa en Condominio': AZUL,
    'Apartamento': VERDE,
    'Oficina': AMARILLO,
    'Terreno': MORADO,
    'Bodega': CYAN,
    'Local comercial': NARANJA,
    'Edificio': ROJO,
    'Finca': '#8B5CF6',
    'Otro': GRIS_TEXTO,
  };
  return colorMap[type] || GRIS_TEXTO;
};

const getColorByOperation = (operation) => {
  const colorMap = {
    'Venta': AZUL,
    'Alquiler': VERDE,
    'Renta': VERDE,
  };
  return colorMap[operation] || GRIS_TEXTO;
};

const DEPT_COLORS = [AZUL, VERDE, AMARILLO, MORADO, CYAN, NARANJA, ROJO, '#8B5CF6', GRIS_TEXTO];
const getColorByDept = (index) => DEPT_COLORS[index % DEPT_COLORS.length];

export default function MetricasAgency() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState(null);
  const [error, setError] = useState(null);
  const [leadsData, setLeadsData] = useState(null);
  const [agentLeads, setAgentLeads] = useState({});
  const [propertyViewMode, setPropertyViewMode] = useState('most');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const result = await getMetricasAgency();

      if (result.success) {
        setMetricas(result.data);

        //console.log('Métricas de agencia:', result.data);

        // Obtener leads totales de la agencia usando la API /contact/total-leads-count/{id}
        const currentUser = getCurrentUser();
        const agencyId = currentUser?._id || currentUser?.id;
        if (agencyId) {
          const res = await getTotalLeads(agencyId);
          if (res.success && res.data) {
            setLeadsData(res.data);
          } else {
            setLeadsData({ totalLeads: 0 });
          }
        } else {
          setLeadsData({ totalLeads: 0 });
        }
        
        // También mantener agentLeads para la tabla (usando getTotalLeads para el conteo individual)
        const agents = result.data?.topAgents ? Object.values(result.data.topAgents) : [];
        if (agents.length > 0) {
          const leadsPromises = agents.map(async (agent) => {
            const agentLeadsResult = await getTotalLeads(agent.id);
            return { agentId: agent.id, data: agentLeadsResult.success ? agentLeadsResult.data : null };
          });
          const leadsResults = await Promise.all(leadsPromises);
          const leadsMap = {};
          leadsResults.forEach(({ agentId, data }) => {
            leadsMap[agentId] = data;
          });
          setAgentLeads(leadsMap);

        }

      } else {
        setError(result.error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const scrollStyle = `
    .scroll-metricas::-webkit-scrollbar {
      width: 6px;
    }
    .scroll-metricas::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 3px;
    }
    .scroll-metricas::-webkit-scrollbar-thumb {
      background: #007aff;
      border-radius: 3px;
      opacity: 0.7;
    }
    .scroll-metricas::-webkit-scrollbar-thumb:hover {
      background: #0056b3;
    }

    @media (max-width: 768px) {
      .table-responsive-agentes thead {
        display: none;
      }
      .table-responsive-agentes,
      .table-responsive-agentes tbody,
      .table-responsive-agentes tr,
      .table-responsive-agentes td {
        display: block;
        width: 100%;
      }
      .table-responsive-agentes tr {
        /* background: #f8fafc; */
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 10px;
        border: 1px solid #e2e8f0 !important;
      }
      .table-responsive-agentes td.responsive-cell {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 8px;
        border: none;
        text-align: right !important;
      }
      .table-responsive-agentes td.responsive-cell:before {
        content: attr(data-label);
        font-weight: 600;
        color: #64748b;
        text-align: left;
      }
      .table-responsive-agentes td.responsive-cell:first-child {
        padding-top: 0;
      }
      .table-responsive-agentes td.responsive-cell:last-child {
        padding-bottom: 0;
      }
    }
  `;

  if (loading) {
    return (
      <div className="px-4 d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{scrollStyle}</style>
      <div className="px-lg-4" style={{ minHeight: '100vh' }}>
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h1 className="fw-normal m-0" style={{ fontSize: 'clamp(28px, 3vw, 40px)', color: '#1e293b', letterSpacing: '-0.5px' }}>Métricas</h1>
          <p className="m-0 mt-1" style={{ color: GRIS_TEXTO }}>Resumen de resultados de tu agencia.</p>
        </div>
        {/* <button className="btn bg-white border border-light-subtle rounded-3 text-muted d-flex align-items-center gap-2 shadow-sm" style={{ fontSize: '13px', padding: '8px 14px' }}>
          <i className="fa-regular fa-calendar"></i> 01 Mayo 2025 - 30 Junio 2025 <i className="fa-solid fa-chevron-down ms-1" style={{ fontSize: '10px' }}></i>
        </button> */}
      </div>

      {/* 1. TOP CARDS CON NÚMEROS ANIMADOS */}
      {(() => {
        const currentUser = getCurrentUser();
        //const agencyProfileViews = currentUser?.clickCounter || metricas?.agencyProfileViews || 0;
        const agentProfileViews = metricas?.agentProfileViews
          || Object.values(metricas?.topAgents || {}).reduce((total, agent) => total + (agent.clickCounter || 0), 0);
        const whatsAppClicks = metricas?.totalClicksWs ?? metricas?.totalClicks ?? 0;

        return (
          <div className="mb-4">
            <div className="row g-3 mb-3 align-items-stretch">
              {/* CARD TU AGENCIA */}
              <div className="col-12 col-lg-4">
          <div className="bg-white border border-light-subtle p-3 h-100 d-flex align-items-center flex-wrap justify-content-between shadow-sm" style={{ borderRadius: '20px' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle bg-light border overflow-hidden d-flex align-items-center justify-content-center text-muted" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
                {(() => {
                  const user = getCurrentUser();
                  const logoSrc = getLogoUrl(user?.agentInfo?.logo) || null;
                  return logoSrc ? (
                    <img src={logoSrc} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <i className="fa-solid fa-building"></i>
                  );
                })()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: GRIS_TEXTO }}>Tu agencia</div>
                <div className="fw-bold text-dark text-truncate fs-5" style={{ fontSize: '14px' }}>
                  {(() => {
                    const user = getCurrentUser();
                    return user?.name || 'Mi agencia';
                  })()}
                </div>
                {(() => {
                  const user = getCurrentUser();
                  return user?.featured_user === 1 ? (
                    <span className="badge bg-dark px-2 py-1 mt-1 d-inline-flex align-items-center gap-1" style={{ fontSize: '10px', fontWeight: '500', borderRadius: '6px' }}>
                      <img src={diamond} alt="Diamond" style={{ width: '11px', height: '11px' }} /> Destacado
                    </span>
                  ) : null;
                })()}
              </div>
            </div>
            <div className="text-end">
              {(() => {
                const user = getCurrentUser();
                const rating = user?.ratingAverage?.toFixed(1);
                const count = user?.ratingCount;
                return (
                  <>
                    {rating && (
                      <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
                        {rating} <i className="fa-solid fa-star text-warning" style={{ fontSize: '11px' }}></i>
                      </div>
                    )}
                    {count != null && (
                      <div style={{ fontSize: '10px', color: GRIS_TEXTO }}>({count} {count === 1 ? 'Reseña' : 'Reseñas'})</div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
              </div>

              {/* KPI: Propiedades */}
              <div className="col-12 col-sm-6 col-lg-2">
                <div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', backgroundColor: AZUL_BG, color: AZUL }}>
                        <i className="fa-solid fa-house-chimney flex-shrink-1" style={{ fontSize: '14px' }}></i>
                      </div>
                      <span className="text-muted" style={{ fontSize: '13px' }}>Propiedades</span>
                    </div>
                    <div className="text-center">
                      <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}>
                        <AnimatedNumber value={metricas?.totalProperties || 0} />
                      </h2>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-3 align-items-stretch">
              {/* KPI: Visualizaciones al perfil de agencia */}
              <div className="col-6 col-md-4 col-xl-2">
                <div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', backgroundColor: CYAN_BG, color: CYAN }}>
                        <i className="fa-solid fa-eye flex-shrink-1" style={{ fontSize: '14px', width: '32px' }}></i>
                      </div>
                      <span className="text-muted" style={{ fontSize: '13px', lineHeight: 1.2 }}>Visualizaciones al perfil de agencia</span>
                    </div>
                    <h2 className="fw-bold m-0 text-center" style={{ fontSize: '28px', color: '#1e293b' }}>
                      <AnimatedNumber value={ metricas?.totalClicks || 0 } />
                    </h2>
                  </div>
                </div>
              </div>

              {/* KPI: Visualizaciones de las propiedades */}
              <div className="col-6 col-md-4 col-xl-2">
                <div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', backgroundColor: CYAN_BG, color: CYAN }}>
                        <i className="fa-solid fa-eye flex-shrink-0" style={{ fontSize: '14px', width: '32px' }}></i>
                      </div>
                      <span className="text-muted" style={{ fontSize: '13px', lineHeight: 1.2 }}>Visualizaciones de las propiedades</span>
                    </div>
                    <h2 className="fw-bold m-0 text-center" style={{ fontSize: '28px', color: '#1e293b' }}>
                      <AnimatedNumber value={metricas?.totalVisits || 0} />
                    </h2>
                  </div>
                </div>
              </div>

              {/* KPI: Visualizaciones a los perfiles de agentes */}
              <div className="col-6 col-md-4 col-xl-2">
                <div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', backgroundColor: CYAN_BG, color: CYAN }}>
                        <i className="fa-solid fa-eye flex-shrink-0" style={{ fontSize: '14px', width: '32px' }}></i>
                      </div>
                      <span className="text-muted" style={{ fontSize: '13px', lineHeight: 1.2 }}>Visualizaciones a los perfiles de agentes</span>
                    </div>
                    <h2 className="fw-bold m-0 text-center" style={{ fontSize: '28px', color: '#1e293b' }}>
                      <AnimatedNumber value={agentProfileViews} />
                    </h2>
                  </div>
                </div>
              </div>

              {/* KPI: Leads */}
              <div className="col-6 col-md-4 col-xl-2">
                <div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', backgroundColor: NARANJA_BG, color: NARANJA }}>
                        <i className="fa-regular fa-comment-dots" style={{ fontSize: '14px' }}></i>
                      </div>
                      <span className="text-muted" style={{ fontSize: '13px' }}>Leads totales</span>
                    </div>
                    <div className="text-center">
                      <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}>
                        <AnimatedNumber value={leadsData?.totalLeads || 0} />
                      </h2>
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI: Likes */}
              <div className="col-6 col-md-4 col-xl-2">
                <div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', backgroundColor: ROJO_BG, color: ROJO }}>
                        <i className="fa-regular fa-heart" style={{ fontSize: '14px' }}></i>
                      </div>
                      <span className="text-muted" style={{ fontSize: '13px' }}>Total de likes</span>
                    </div>
                    <h2 className="fw-bold m-0 text-center" style={{ fontSize: '28px', color: '#1e293b' }}>
                      <AnimatedNumber value={metricas?.totalFavorites || 0} />
                    </h2>
                  </div>
                </div>
              </div>

              {/* KPI: Clics WhatsApp */}
              <div className="col-6 col-md-4 col-xl-2">
                <div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', backgroundColor: MORADO_BG, color: MORADO }}>
                        <i className="fa-brands fa-whatsapp" style={{ fontSize: '16px' }}></i>
                      </div>
                      <span className="text-muted" style={{ fontSize: '13px' }}>Clics al WhatsApp</span>
                    </div>
                    <h2 className="fw-bold m-0 text-center" style={{ fontSize: '28px', color: '#1e293b' }}>
                      <AnimatedNumber value={whatsAppClicks} />
                    </h2>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 2. BLOQUE CENTRAL: LISTA Y DOS DONAS */}
      <div className="row g-3 mb-4">
        {/* Vistas de propiedades */}
        <div className="col-lg-4">
          <div className="bg-white border border-light-subtle p-4 h-100 shadow-sm" style={{ borderRadius: '24px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h6 className="m-0 fw-bold" style={{ color: '#1e293b', fontSize: '15px' }}>Vistas de propiedades</h6>
              <div className="position-relative" ref={dropdownRef}>
                <button 
                  className="btn btn-sm btn-light bg-transparent border-0 text-muted d-flex align-items-center gap-1" 
                  style={{ fontSize: '12px' }}
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  {propertyViewMode === 'most' ? 'Más vistas' : 'Menos vistas'} <i className="fa-solid fa-chevron-down" style={{ fontSize: '9px' }}></i>
                </button>
                {showDropdown && (
                  <div 
                    className="position-absolute bg-white shadow-sm border rounded-3 py-1" 
                    style={{ 
                      top: '100%', 
                      right: 0, 
                      zIndex: 1000, 
                      minWidth: '130px',
                      fontSize: '13px'
                    }}
                  >
                    <button 
                      className={`dropdown-item d-flex align-items-center gap-2 px-3 py-2 ${propertyViewMode === 'most' ? 'fw-bold' : ''}`}
                      style={{ fontSize: '12px', border: 'none', background: propertyViewMode === 'most' ? '#f0f7ff' : 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', color: '#1e293b' }}
                      onClick={() => { setPropertyViewMode('most'); setShowDropdown(false); }}
                    >
                      Más vistas
                    </button>
                    <button 
                      className={`dropdown-item d-flex align-items-center gap-2 px-3 py-2 ${propertyViewMode === 'least' ? 'fw-bold' : ''}`}
                      style={{ fontSize: '12px', border: 'none', background: propertyViewMode === 'least' ? '#f0f7ff' : 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', color: '#1e293b' }}
                      onClick={() => { setPropertyViewMode('least'); setShowDropdown(false); }}
                    >
                      Menos vistas
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {(() => {
              const properties = propertyViewMode === 'most'
                ? (metricas?.topProperties ? Object.values(metricas.topProperties) : [])
                : (metricas?.topPropertiesRawMinus ? Object.values(metricas.topPropertiesRawMinus) : []);
              if (properties.length === 0) {
                return (
                  <div className="d-flex flex-column align-items-center justify-content-center text-muted" style={{ minHeight: '250px', fontSize: '14px' }}>
                    <i className="fa-regular fa-building mb-2" style={{ fontSize: '24px', opacity: 0.5 }}></i>
                    <span>No tienes propiedades</span>
                  </div>
                );
              }
              // Calcular maxViews correctamente según el origen de datos
              const allPropsForMax = propertyViewMode === 'most'
                ? Object.values(metricas?.topProperties || {})
                : Object.values(metricas?.topPropertiesRawMinus || {});
              const maxViews = Math.max(...allPropsForMax.map(p => p.visitCounter), 1);
              return properties.map((item, idx) => {
                const widthPct = Math.round((item.visitCounter / maxViews) * 100);
                // Normalizar imagen: soporta item.picture (topProperties) y media.photos (topPropertiesRawMinus)
                const mainPhoto = item.picture
                  ? item.picture
                  : item.media?.photos?.find(p => p.isMain)?.thumbnail || null;
                const imgSrc = mainPhoto ? `${API_URL}/${mainPhoto}` : null;
                // Normalizar precio: item.priceUSD (topProperties) o item.market.priceUSD (topPropertiesRawMinus)
                const priceUSD = item.priceUSD ?? item.market?.priceUSD ?? 0;
                const formattedPrice = `$${Number(priceUSD).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
                // Normalizar nombre: item.name (topProperties) o item.market.title (topPropertiesRawMinus)
                const propName = item.name || item.market?.title || 'Sin título';
                return (
                  <div key={item.id || item._id} className="d-flex align-items-center flex-wrap justify-content-between py-2 mb-1">
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle bg-light text-muted d-flex align-items-center justify-content-center fw-bold" style={{ width: '24px', height: '24px', fontSize: '11px' }}>
                        {idx + 1}
                      </div>
                      <div className="rounded bg-light border overflow-hidden d-flex align-items-center justify-content-center text-muted" style={{ width: '45px', height: '35px', borderRadius: '8px' }}>
                        {imgSrc ? (
                          <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <i className="fa-regular fa-image" style={{ fontSize: '14px' }}></i>
                        )}
                      </div>
                      <div>
                        <div className="fw-bold text-dark text-truncate" style={{ fontSize: '13px', maxWidth: '160px' }}>{propName}</div>
                        <div style={{ color: GRIS_TEXTO, fontSize: '12px' }}>{formattedPrice}</div>
                      </div>
                    </div>
                    <div className="d-flex flex-column ms-auto ms-lg-none align-items-end gap-1">
                      <span className="fw-bold text-dark" style={{ fontSize: '13px' }}>{item.visitCounter.toLocaleString()}</span>
                      <div className="progress" style={{ width: '60px', height: '4px', backgroundColor: '#f1f5f9' }}>
                        <div className="progress-bar" style={{ width: `${widthPct}%`, backgroundColor: AZUL }} />
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Propiedades por Tipo (Dona Izquierda) */}
        <div className="col-lg-4">
          <div className="bg-white border border-light-subtle p-4 h-100 d-flex flex-column shadow-sm" style={{ borderRadius: '24px' }}>
            <h6 className="m-0 fw-bold mb-3" style={{ color: '#1e293b', fontSize: '15px' }}>Propiedades por tipo</h6>
            
            {(() => {
              const tipos = metricas?.propertiesByType || [];
              if (tipos.length === 0) {
                return (
                  <div className="d-flex flex-column align-items-center justify-content-center text-muted flex-grow-1" style={{ minHeight: '190px', fontSize: '14px' }}>
                    <i className="fa-regular fa-building mb-2" style={{ fontSize: '24px', opacity: 0.5 }}></i>
                    <span>No tienes propiedades</span>
                  </div>
                );
              }
              return (
                <>
                  {/* CONTENEDOR GRID: Divide izquierda y derecha */}
                  <div className="row g-2 align-items-center flex-grow-1 my-auto">
                    
                    {/* LADO IZQUIERDO: El Gráfico */}
                    <div className="col-lg-6 position-relative d-flex align-items-center justify-content-center" style={{ height: '170px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={(tipos.slice().sort((a, b) => b.total - a.total).slice(0, 5)).map(t => ({
                              name: t.type,
                              value: t.total,
                              color: getColorByType(t.type),
                              pct: t.total && metricas?.totalProperties
                                ? `${Math.round((t.total / metricas.totalProperties) * 100)}% (${t.total})`
                                : `0% (${t.total})`
                            }))} 
                            innerRadius={45} 
                            outerRadius={65} 
                            paddingAngle={2} 
                            dataKey="value" 
                            stroke="none" 
                            isAnimationActive={true} 
                            animationDuration={1000}
                          >
                            {tipos.slice().sort((a, b) => b.total - a.total).slice(0, 5).map((entry, index) => (
                              <Cell key={index} fill={getColorByType(entry.type)} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* LADO DERECHO: Lista de Leyendas con Scroll */}
                    <div className="col-lg-6">
                      <div className="ps-2 scroll-metricas" style={{ fontSize: '12px', maxHeight: '180px', overflowY: 'auto' }}>
                        {tipos.slice().sort((a, b) => b.total - a.total).map((t) => {
                          const pct = t.total && metricas?.totalProperties
                            ? `${Math.round((t.total / metricas.totalProperties) * 100)}% (${t.total})`
                            : `0% (${t.total})`;
                          return (
                            <div key={t.type} className="d-flex flex-column py-1 mb-1 border-bottom border-light-subtle">
                              <span className="text-muted text-truncate" style={{ fontSize: '11px' }}>
                                <i className="fa-solid fa-circle me-1" style={{ color: getColorByType(t.type), fontSize: '8px' }}></i>
                                {t.type}
                              </span>
                              <span className="fw-bold text-dark ps-3">{pct}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* TOTAL ABAJO DEL TODO (Estilo exacto de la imagen) */}
                  <div className="mt-3 pt-2 border-top border-light-subtle" style={{ fontSize: '13px', color: '#64748b' }}>
                    <span className="fw-bold text-dark">Total:</span> {metricas?.totalProperties || 0} Propiedades
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Propiedades por Operación (Dona Derecha) */}
        <div className="col-lg-4">
          <div className="bg-white border border-light-subtle p-4 h-100 d-flex flex-column shadow-sm" style={{ borderRadius: '24px' }}>
            <h6 className="m-0 fw-bold mb-3" style={{ color: '#1e293b', fontSize: '15px' }}>Propiedades por operación</h6>
            
            {(() => {
              const operaciones = metricas?.propertiesByOperation || [];
              if (operaciones.length === 0) {
                return (
                  <div className="d-flex flex-column align-items-center justify-content-center text-muted flex-grow-1" style={{ minHeight: '190px', fontSize: '14px' }}>
                    <i className="fa-regular fa-building mb-2" style={{ fontSize: '24px', opacity: 0.5 }}></i>
                    <span>No tienes propiedades</span>
                  </div>
                );
              }
              return (
                <>
                  {/* CONTENEDOR GRID: Divide izquierda y derecha */}
                  <div className="row g-2 align-items-center flex-grow-1 my-auto">
                    
                    {/* LADO IZQUIERDO: El Gráfico */}
                    <div className="col-lg-6 position-relative d-flex align-items-center justify-content-center" style={{ height: '170px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={operaciones.map(o => ({
                              name: o.operation,
                              value: o.total,
                              color: getColorByOperation(o.operation),
                              pct: o.total && metricas?.totalProperties
                                ? `${Math.round((o.total / metricas.totalProperties) * 100)}% (${o.total})`
                                : `0% (${o.total})`
                            }))} 
                            innerRadius={45} 
                            outerRadius={65} 
                            paddingAngle={2} 
                            dataKey="value" 
                            stroke="none" 
                            isAnimationActive={true} 
                            animationDuration={1000}
                          >
                            {operaciones.map((entry, index) => (
                              <Cell key={index} fill={getColorByOperation(entry.operation)} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* LADO DERECHO: Lista de Leyendas con Scroll */}
                    <div className="col-lg-6">
                      <div className="ps-2 scroll-metricas" style={{ fontSize: '12px', maxHeight: '155px', overflowY: 'auto' }}>
                        {operaciones.map((o) => {
                          const pct = o.total && metricas?.totalProperties
                            ? `${Math.round((o.total / metricas.totalProperties) * 100)}% (${o.total})`
                            : `0% (${o.total})`;
                          return (
                            <div key={o.operation} className="d-flex justify-content-between align-items-center py-1 mb-1 border-bottom border-light-subtle">
                              <span className="text-muted text-truncate d-flex align-items-center" style={{ fontSize: '13px' }}>
                                <i className="fa-solid fa-circle me-1" style={{ color: getColorByOperation(o.operation), fontSize: '8px' }}></i>
                                {o.operation}
                              </span>
                              <span className="fw-bold text-dark ps-3">{pct}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* TOTAL ABAJO DEL TODO */}
                  <div className="mt-3 pt-2 border-top border-light-subtle" style={{ fontSize: '13px', color: '#64748b' }}>
                    <span className="fw-bold text-dark">Total:</span> {metricas?.totalProperties || 0} Propiedades
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 3. BLOQUE INFERIOR: TABLA AGENTES Y DEPARTAMENTOS */}
      <div className="row g-3">
        {/* Rendimiento de agentes */}
        <div className="col-lg-7">
          <div className="bg-white border border-light-subtle p-4 shadow-sm h-100 d-flex flex-column flex-grow-1" style={{ borderRadius: '24px' }}>
            <h6 className="m-0 fw-bold mb-4" style={{ color: '#1e293b', fontSize: '15px' }}>Rendimiento de agentes</h6>
            {(() => {
              const agents = metricas?.topAgents ? Object.values(metricas.topAgents) : [];
              const filteredAgents = agents.filter(a => (a.propertiesAssign ?? 0) > 0);
              if (filteredAgents.length === 0) {
                return (
                  <div className="d-flex flex-column align-items-center justify-content-center text-muted" style={{ minHeight: '200px', fontSize: '14px' }}>
                    <i className="fa-regular fa-user mb-2" style={{ fontSize: '24px', opacity: 0.5 }}></i>
                    <span>No tienes agentes</span>
                  </div>
                );
              }
              return (
                <>
                  <div className="table-responsive table-responsive-agentes scroll-metricas pe-3 " style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    <table className="table table-borderless align-middle m-0" style={{ fontSize: '13px' }}>
                      <thead>
                        <tr style={{ color: GRIS_TEXTO, borderBottom: '1px solid #f1f5f9' }}>
                          <th className="fw-normal pb-3 ps-2">Agente</th>
                          <th className="fw-normal pb-3 text-center">Propiedades</th>
                          <th className="fw-normal pb-3 text-center">Vistas</th>
                          <th className="fw-normal pb-3 text-center">Clics WhatsApp</th>
                          <th className="fw-normal pb-3 text-center">Leads</th>
                          <th className="fw-normal pb-3 text-end pe-2">Calificación</th>
                        </tr>
                      </thead>
                      <tbody>
                         {filteredAgents.map((agent, idx) => {
                          const avatarSrc = agent.avatar ? `${API_URL}${agent.avatar.startsWith('/') ? '' : '/'}${agent.avatar}` : null;
                          return (
                          <tr key={agent.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td className="py-1 ps-2 responsive-cell">
                              <div className="d-flex align-items-center gap-3 me-auto">
                                <div className="rounded-circle bg-light border overflow-hidden d-flex align-items-center justify-content-center text-muted flex-shrink-0" style={{ width: '32px', height: '32px' }}>
                                  {avatarSrc ? (
                                    <img src={avatarSrc.replace('/uploads', '')} alt="" style={{ width: '32px', height: '32px', objectFit: 'cover' }} />
                                  ) : (
                                    <i className="fa-regular fa-user" style={{ fontSize: '14px' }}></i>
                                  )}
                                </div>
                                <span className="fw-bold text-dark text-truncate">{agent.name}</span>
                              </div>
                            </td>
                            <td className="text-center text-muted responsive-cell" data-label="Propiedades">{agent.propertiesAssign ?? 0}</td>
                            <td className="text-center text-muted responsive-cell" data-label="Vistas">{(agent.clickCounter ?? 0).toLocaleString()}</td>
                            <td className="text-center text-muted responsive-cell" data-label="Clics WhatsApp">{agent.clickCounterWs ?? 0}</td>
                            <td className="text-center text-muted responsive-cell" data-label="Leads">{agentLeads[agent.id]?.totalLeads ?? 0}</td>
                            <td className="text-end pe-2 fw-bold text-dark responsive-cell" data-label="Calificación">
                              {agent.ratingAverage?.toFixed(1) ?? '0.0'} <i className="fa-solid fa-star text-warning ms-1" style={{ fontSize: '11px' }}></i>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Botón Ver más agentes */}
                  {/* <div className="mt-auto text-end">
                    <button 
                      className="btn btn-sm d-inline-flex align-items-center gap-2" 
                      style={{ 
                        color: '#007aff', 
                        backgroundColor: '#e5f1ff',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '500',
                        padding: '8px 16px',
                        border: 'none'
                      }}
                      onClick={() => navigate('/cpanel/agentes/')}
                    >
                      Ver más agentes <i className="fa-solid fa-arrow-right" style={{ fontSize: '11px' }}></i>
                    </button>
                  </div> */}
                </>
              );
            })()}
          </div>
        </div>

        {/* Propiedades por Departamentos */}
        <div className="col-lg-5">
          <div className="bg-white border border-light-subtle p-4 h-100 d-flex flex-column shadow-sm" style={{ borderRadius: '24px' }}>
            <h6 className="m-0 fw-bold mb-4" style={{ color: '#1e293b', fontSize: '15px' }}>Propiedades por departamentos</h6>
            {(() => {
              const depts = metricas?.propertiesByDepartment || [];
              if (depts.length === 0) {
                return (
                  <div className="d-flex flex-column align-items-center justify-content-center text-muted" style={{ minHeight: '200px', fontSize: '14px' }}>
                    <i className="fa-regular fa-building mb-2" style={{ fontSize: '24px', opacity: 0.5 }}></i>
                    <span>No tienes propiedades</span>
                  </div>
                );
              }
              return (
                <>
                  <div className="d-flex flex-column gap-4 scroll-metricas pe-3" style={{ maxHeight: '155px', overflowY: 'auto', fontSize: '13px' }}>
                    {depts.slice().sort((a, b) => b.total - a.total).map((dep, idx) => {
                      const pct = dep.total && metricas?.totalProperties
                        ? `${Math.round((dep.total / metricas.totalProperties) * 100)}% (${dep.total})`
                        : `0% (${dep.total})`;
                      const color = getColorByDept(idx);
                      return (
                        <div key={dep.department} className="row align-items-center g-0">
                          <div className="col-4 text-muted truncate d-flex align-items-center">{dep.department}</div>
                          <div className="col-5 px-3">
                            <div className="progress" style={{ height: '12px', borderRadius: '6px', backgroundColor: '#f1f5f9' }}>
                              <div 
                                className="progress-bar" 
                                style={{ 
                                  width: `${Math.round((dep.total / metricas.totalProperties) * 100)}%`, 
                                  backgroundColor: color,
                                  borderRadius: '6px',
                                  transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                }} 
                              />
                            </div>
                          </div>
                          <div className="col-3 text-end fw-bold text-dark">{pct}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 mt-auto border-top border-light-subtle text-muted" style={{ fontSize: '13px' }}>
                    Total: <span className="fw-bold text-dark ms-1">{metricas?.totalProperties || 0} Propiedades</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

    </div>
    </>
  );
}
