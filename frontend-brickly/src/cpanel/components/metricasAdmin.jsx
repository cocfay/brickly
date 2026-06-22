import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { API_URL } from '../../services/authService';
import { getMetricasAdmin, getNextExpiring, getTopAgencyLeads, getTopAgencyClicksWs, getTotalExclusiveProperties, getTotalLeadsPublic } from '../services/metricas';
import { getLogoUrl } from '../../services/logoService';

// --- COMPONENTE MEJORADO PARA ANIMAR NÚMEROS (SOPORTA DECIMALES Y SUFIJOS) ---
const AnimatedNumber = ({ value, duration = 1200, decimals = 0, suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      const currentValue = percentage * value;
      setCount(currentValue);

      if (progress < duration) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  const formatted = decimals > 0 
    ? count.toFixed(decimals) 
    : Math.floor(count).toLocaleString();

  return <>{formatted}{suffix}</>;
};

// --- PALETA DE COLORES FIEL A LA INTERFAZ ADMIN ---
const AZUL = '#007aff';         const AZUL_BG = '#e5f1ff';
const VERDE = '#34c759';        const VERDE_BG = '#eafaf1';
const MORADO = '#af52de';       const MORADO_BG = '#f7ebfc';
const NARANJA = '#ff9500';      const NARANJA_BG = '#fff4e5';
const WHATSAPP = '#25d366';     const WHATSAPP_BG = '#e6f9ed';
const ROJO = '#ff3b30';         const ROJO_BG = '#ffebeb';
const AMARILLO = '#ffcc00';     const AMARILLO_BG = '#fffbeb';
const ROSA_FUSIA = '#d946ef';   const ROSA_BG = '#fdf4ff';
const LIMA = '#84cc16';         const LIMA_BG = '#f7fee7';
const CIAN = '#06b6d4';         const CIAN_BG = '#ecfeff';
const CELESTE = '#38bdf8';      const CELESTE_BG = '#f0f9ff';
const GRIS_TEXTO = '#64748b';

// --- COLORES PARA TIPOS DE PROPIEDAD ---
const COLORS_BY_TYPE = {
  'Apartamento': AZUL,
  'Casa': VERDE,
  'Casa en Condominio': NARANJA,
  'Terreno': AMARILLO,
  'Oficina': MORADO,
  'Edificio': CIAN,
  'Local Comercial': ROJO,
  'Finca': LIMA,
  'Bodega': ROSA_FUSIA,
  'Otro': CELESTE,
};

// --- COLORES PARA OPERACIONES ---
const COLORS_BY_OPERATION = {
  'Venta': AZUL,
  'Alquiler': VERDE,
};

// --- COLORES PARA DEPARTAMENTOS (rotación) ---
const DEPT_COLORS = [AZUL, VERDE, AMARILLO, MORADO, ROJO, CIAN, NARANJA, ROSA_FUSIA, LIMA, CELESTE];

export default function MetricasAdmin() {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agenciasPorVencer, setAgenciasPorVencer] = useState([]);
  const [agenciasLeads, setAgenciasLeads] = useState({ best: [], worst: [] });
  const [agenciasClics, setAgenciasClics] = useState({ best: [], worst: [] });
  const [leadsOrder, setLeadsOrder] = useState('desc');
  const [clicsOrder, setClicsOrder] = useState('desc');
  const [exclusiveCount, setExclusiveCount] = useState(0);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const [adminResult, expiringResult, leadsResult, clicsResult, exclusiveResult, leadsPublicResult] = await Promise.all([
        getMetricasAdmin(),
        getNextExpiring(4),
        getTopAgencyLeads(),
        getTopAgencyClicksWs(),
        getTotalExclusiveProperties(),
        getTotalLeadsPublic()
      ]);
      if (adminResult.success) {
        setAdminData(adminResult.data);
      } else {
        console.error('❌ Error al obtener métricas admin:', adminResult.error);
      }
      if (expiringResult.success) {
        setAgenciasPorVencer(expiringResult.data);
      } else {
        console.error('❌ Error al obtener agencias por vencer:', expiringResult.error);
      }
      if (leadsResult.success) {
        setAgenciasLeads({
          best: leadsResult.data.top5Best || [],
          worst: leadsResult.data.top5Worst || [],
        });
      } else {
        console.error('❌ Error al obtener top leads:', leadsResult.error);
      }
      if (clicsResult.success) {
        setAgenciasClics({
          best: clicsResult.data.top5Best || [],
          worst: clicsResult.data.top5Worst || [],
        });
      } else {
        console.error('❌ Error al obtener top clics:', clicsResult.error);
      }
      if (exclusiveResult.success) {
        setExclusiveCount(exclusiveResult.data.total);
      } else {
        console.error('❌ Error al obtener propiedades exclusivas:', exclusiveResult.error);
      }
      if (leadsPublicResult.success) {
        setTotalLeadsCount(leadsPublicResult.data.totalLeads);
      } else {
        console.error('❌ Error al obtener leads totales:', leadsPublicResult.error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const propiedadesTipo = useMemo(() => {
    if (!adminData?.propertiesByType || adminData.propertiesByType.length === 0) {
      return [];
    }
    const total = adminData.propertiesByType.reduce((sum, item) => sum + item.total, 0);
    return adminData.propertiesByType
      .map(item => ({
        name: item.type,
        total: item.total,
        color: COLORS_BY_TYPE[item.type] || CELESTE,
        pct: total > 0 ? `${Math.round((item.total / total) * 100)}%` : '0%',
      }))
      .sort((a, b) => b.total - a.total);
  }, [adminData?.propertiesByType]);

  const propiedadesOperacion = useMemo(() => {
    if (!adminData?.propertiesByOperation || adminData.propertiesByOperation.length === 0) {
      return [];
    }
    const total = adminData.propertiesByOperation.reduce((sum, item) => sum + item.total, 0);
    return adminData.propertiesByOperation.map(item => ({
      name: item.operation,
      total: item.total,
      color: COLORS_BY_OPERATION[item.operation] || CELESTE,
      pct: total > 0 ? `${Math.round((item.total / total) * 100)}%` : '0%',
    }));
  }, [adminData?.propertiesByOperation]);

  const propiedadesDepartamento = useMemo(() => {
    if (!adminData?.propertiesByDepartment || adminData.propertiesByDepartment.length === 0) {
      return [];
    }
    const maxTotal = Math.max(...adminData.propertiesByDepartment.map(d => d.total), 1);
    const sorted = [...adminData.propertiesByDepartment].sort((a, b) => b.total - a.total);
    return sorted.map((item, idx) => ({
      name: item.department,
      total: item.total,
      color: DEPT_COLORS[idx % DEPT_COLORS.length],
      pct: Math.round((item.total / maxTotal) * 100),
    }));
  }, [adminData?.propertiesByDepartment]);

  const topAgentes = useMemo(() => {
    if (!adminData?.topAgents) return [];
    return Object.values(adminData.topAgents)
      .sort((a, b) => (b.clickCounter + b.clickCounterWs) - (a.clickCounter + a.clickCounterWs))
      .slice(0, 10)
      .map((agent, idx) => ({
        rank: idx + 1,
        name: agent.name,
        agency: '',
        leads: agent.propertiesAssign || 0,
        views: agent.clickCounter || 0,
        clics: agent.clickCounterWs || 0,
        rating: agent.ratingAverage || 0,
        avatar: agent.avatar || null,
      }));
  }, [adminData?.topAgents]);

  return (
    <>
      <style>{`
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
      `}</style>
    <div className="px-lg-4" style={{ minHeight: '100vh' }}>
      
      {/* HEADER */}
      <div className="mb-4">
        <h1 className="fw-normal m-0" style={{ fontSize: 'clamp(28px, 3vw, 40px)', color: '#1e293b', letterSpacing: '-0.5px' }}>Métricas administrador</h1>
        <p className="m-0 mt-1" style={{ color: GRIS_TEXTO }}>Resumen general de la plataforma</p>
      </div>

      {/* FILA 1 DE KPIs */}
      <div className="row row-cols-2 row-cols-sm-3 row-cols-xl-6 g-3 mb-3">
        <div className="col"><div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', backgroundColor: AZUL_BG, color: AZUL }}><i className="fa-solid fa-building" style={{ fontSize: '14px' }}></i></div>
              <span className="text-muted" style={{ fontSize: '13px' }}>Agencias registradas</span>
            </div>
            <div className="text-center">
              <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}><AnimatedNumber value={adminData?.totalAgencies ?? 0} /></h2>
            </div>
          </div>
        </div></div>
        <div className="col"><div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', backgroundColor: VERDE_BG, color: VERDE }}><i className="fa-solid fa-users" style={{ fontSize: '14px' }}></i></div>
              <span className="text-muted" style={{ fontSize: '13px' }}>Agentes registrados</span>
            </div>
            <div className="text-center">
              <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}><AnimatedNumber value={adminData?.totalAgents ?? 0} /></h2>
            </div>
          </div>
        </div></div>
        <div className="col"><div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', backgroundColor: MORADO_BG, color: MORADO }}><i className="fa-solid fa-house-circle-check" style={{ fontSize: '14px' }}></i></div>
              <span className="text-muted" style={{ fontSize: '13px' }}>Propiedades publicadas</span>
            </div>
            <div className="text-center">
              <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}><AnimatedNumber value={adminData?.totalPropertiesPublished ?? 0} /></h2>
            </div>
          </div>
        </div></div>
        <div className="col"><div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', backgroundColor: NARANJA_BG, color: NARANJA }}><i className="fa-solid fa-eye" style={{ fontSize: '14px' }}></i></div>
              <span className="text-muted" style={{ fontSize: '13px' }}>Vistas totales</span>
            </div>
            <div className="text-center">
              <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}><AnimatedNumber value={adminData?.totalVisits ?? 0} /></h2>
            </div>
          </div>
        </div></div>
        <div className="col"><div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', backgroundColor: WHATSAPP_BG, color: WHATSAPP }}><i className="fa-brands fa-whatsapp" style={{ fontSize: '14px' }}></i></div>
              <span className="text-muted" style={{ fontSize: '13px' }}>Clics totales whatsapp</span>
            </div>
            <div className="text-center">
              <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}><AnimatedNumber value={adminData?.totalClicksWs ?? 0} /></h2>
            </div>
          </div>
        </div></div>
        <div className="col"><div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', backgroundColor: WHATSAPP_BG, color: WHATSAPP }}><i className="fa-solid fa-eye" style={{ fontSize: '14px' }}></i></div>
              <span className="text-muted" style={{ fontSize: '13px' }}>Visualizaciones de perfiles</span>
            </div>
            <div className="text-center">
              <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}><AnimatedNumber value={adminData?.totalClicks ?? 0} /></h2>
            </div>
          </div>
        </div></div>
      </div>

      {/* FILA 2 DE KPIs */}
      <div className="row row-cols-2 row-cols-sm-3 row-cols-xl-6 g-3 mb-4">
        <div className="col"><div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', backgroundColor: ROJO_BG, color: ROJO }}><i className="fa-regular fa-comment-dots" style={{ fontSize: '14px' }}></i></div>
              <span className="text-muted" style={{ fontSize: '13px' }}>Leads totales</span>
            </div>
            <div className="text-center">
              <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}><AnimatedNumber value={totalLeadsCount} /></h2>
            </div>
          </div>
        </div></div>
        <div className="col"><div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', backgroundColor: AMARILLO_BG, color: AMARILLO }}><i className="fa-solid fa-star" style={{ fontSize: '14px' }}></i></div>
              <span className="text-muted" style={{ fontSize: '13px' }}>Agencias destacadas</span>
            </div>
            <div className="text-center">
              <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}><AnimatedNumber value={adminData?.totalAgenciesFeatured ?? 0} /></h2>
            </div>
          </div>
        </div></div>
        <div className="col"><div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', backgroundColor: ROSA_BG, color: ROSA_FUSIA }}><i className="fa-solid fa-user-shield" style={{ fontSize: '14px' }}></i></div>
              <span className="text-muted" style={{ fontSize: '13px' }}>Agentes destacados</span>
            </div>
            <div className="text-center">
              <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}><AnimatedNumber value={adminData?.totalAgentsFeatured ?? 0} /></h2>
            </div>
          </div>
        </div></div>
        <div className="col"><div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', backgroundColor: NARANJA_BG, color: NARANJA }}><i className="fa-solid fa-house-medical-flag" style={{ fontSize: '14px' }}></i></div>
              <span className="text-muted" style={{ fontSize: '13px' }}>Propiedades destacadas</span>
            </div>
            <div className="text-center">
              <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}><AnimatedNumber value={adminData?.totalPropertiesFeatured ?? 0} /></h2>
            </div>
          </div>
        </div></div>
        <div className="col"><div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', backgroundColor: LIMA_BG, color: LIMA }}><i className="fa-solid fa-gem" style={{ fontSize: '14px' }}></i></div>
              <span className="text-muted" style={{ fontSize: '13px' }}>Propiedades Exclusivas</span>
            </div>
            <div className="text-center">
              <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}><AnimatedNumber value={exclusiveCount} /></h2>
            </div>
          </div>
        </div></div>
        <div className="col"><div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px', backgroundColor: CIAN_BG, color: CIAN }}><i className="fa-solid fa-user-check" style={{ fontSize: '14px' }}></i></div>
              <span className="text-muted" style={{ fontSize: '13px' }}>Verificados GPI</span>
            </div>
            <div className="text-center">
              <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}><AnimatedNumber value={adminData?.totalAgentsVerified ?? 0} /></h2>
            </div>
          </div>
        </div></div>
      </div>

      {/* SECCIÓN RANKINGS: AGENCIAS LEADS VS WHATSAPP */}
      <div className="row g-3 mb-4">
        {/* Izquierda: Leads */}
        <div className="col-12 col-lg-6">
          <div className="bg-white border border-light-subtle p-4 h-100 shadow-sm" style={{ borderRadius: '24px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h6 className="m-0 fw-bold text-dark" style={{ fontSize: '15px' }}>Agencias por leads generados</h6>
              <select className="form-select form-select-sm border-light-subtle bg-light text-muted" style={{ width: 'auto', fontSize: '12px', borderRadius: '8px' }} value={leadsOrder} onChange={e => setLeadsOrder(e.target.value)}>
                <option value="desc">Más leads</option>
                <option value="asc">Menos leads</option>
              </select>
            </div>
            <div className="d-flex flex-column gap-3">
              {(leadsOrder === 'desc' ? agenciasLeads.best : agenciasLeads.worst).map((item, idx) => {
                const items = leadsOrder === 'desc' ? agenciasLeads.best : agenciasLeads.worst;
                const maxValue = Math.max(...items.map(l => l.amountLeads), 1);
                const pct = Math.round((item.amountLeads / maxValue) * 100);
                const avatarUrl = item.avatar ? `${API_URL}${item.avatar.replace('/uploads', '')}` : null;
                return (
                <div key={item.id || item.name} className="d-flex align-items-center gap-3">
                  <span className="text-muted fw-bold" style={{ width: '15px', fontSize: '13px' }}>{idx + 1}</span>
                  <div className="rounded-circle bg-light border d-flex align-items-center justify-content-center text-white overflow-hidden flex-shrink-0" style={{ width: '36px', height: '36px', backgroundColor: '#007aff', fontSize: '12px', fontWeight: 'bold' }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      item.name.substring(0,2).toUpperCase()
                    )}
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold text-dark mb-1" style={{ fontSize: '13px' }}>{item.name}</div>
                    <div className="progress bg-light" style={{ height: '6px', borderRadius: '10px' }}>
                      <div className="progress-bar" style={{ width: `${pct}%`, backgroundColor: '#007aff', borderRadius: '10px' }}></div>
                    </div>
                  </div>
                  <div className="text-end fw-bold text-dark" style={{ fontSize: '13px', width: '60px' }}>
                    <AnimatedNumber value={item.amountLeads} />
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Derecha: WhatsApp Clics */}
        <div className="col-12 col-lg-6">
          <div className="bg-white border border-light-subtle p-4 h-100 shadow-sm" style={{ borderRadius: '24px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h6 className="m-0 fw-bold text-dark" style={{ fontSize: '15px' }}>Agencias por clics en WhatsApp</h6>
              <select className="form-select form-select-sm border-light-subtle bg-light text-muted" style={{ width: 'auto', fontSize: '12px', borderRadius: '8px' }} value={clicsOrder} onChange={e => setClicsOrder(e.target.value)}>
                <option value="desc">Más clics</option>
                <option value="asc">Menos clics</option>
              </select>
            </div>
            <div className="d-flex flex-column gap-3">
              {(clicsOrder === 'desc' ? agenciasClics.best : agenciasClics.worst).map((item, idx) => {
                const items = clicsOrder === 'desc' ? agenciasClics.best : agenciasClics.worst;
                const maxValue = Math.max(...items.map(l => l.amountClicks), 1);
                const pct = Math.round((item.amountClicks / maxValue) * 100);
                const avatarUrl = item.avatar ? `${API_URL}${item.avatar.replace('/uploads', '')}` : null;
                return (
                <div key={item.id || item.name} className="d-flex align-items-center gap-3">
                  <span className="text-muted fw-bold" style={{ width: '15px', fontSize: '13px' }}>{idx + 1}</span>
                  <div className="rounded-circle bg-light border d-flex align-items-center justify-content-center text-white overflow-hidden flex-shrink-0" style={{ width: '36px', height: '36px', backgroundColor: '#25d366', fontSize: '12px', fontWeight: 'bold' }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      item.name.substring(0,2).toUpperCase()
                    )}
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold text-dark mb-1" style={{ fontSize: '13px' }}>{item.name}</div>
                    <div className="progress bg-light" style={{ height: '6px', borderRadius: '10px' }}>
                      <div className="progress-bar" style={{ width: `${pct}%`, backgroundColor: '#25d366', borderRadius: '10px' }}></div>
                    </div>
                  </div>
                  <div className="text-end fw-bold text-dark" style={{ fontSize: '13px', width: '60px' }}>
                    <AnimatedNumber value={item.amountClicks} />
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN INTERMEDIA: 3 COLUMNAS (DONA, DONA, DEPARTAMENTOS) */}
      <div className="row g-3 mb-4">
        {/* 1. Propiedades por Operación */}
        <div className="col-12 col-md-6 col-lg-4">
          <div className="bg-white border border-light-subtle p-4 h-100 d-flex flex-column shadow-sm" style={{ borderRadius: '24px' }}>
            <h6 className="m-0 fw-bold mb-3" style={{ color: '#1e293b', fontSize: '15px' }}>Propiedades por operación</h6>
            <div className="row g-2 align-items-center flex-grow-1 my-auto">
              <div className="col-6 d-flex align-items-center justify-content-center" style={{ height: '140px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={propiedadesOperacion} innerRadius={40} outerRadius={55} paddingAngle={2} dataKey="total" stroke="none" isAnimationActive={true}>
                      {propiedadesOperacion.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="col-6">
                <div className="ps-1" style={{ fontSize: '11px' }}>
                  {propiedadesOperacion.map((o) => (
                    <div key={o.name} className="d-flex flex-column py-1 mb-1 border-bottom border-light-subtle">
                      <span className="text-muted text-truncate"><i className="fa-solid fa-circle me-1" style={{ color: o.color, fontSize: '6px' }}></i>{o.name}</span>
                      <span className="fw-bold text-dark ps-2">{o.pct} ({o.total.toLocaleString()})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-top border-light-subtle" style={{ fontSize: '12px', color: GRIS_TEXTO }}>
              <span className="fw-bold text-dark">Total:</span> {(adminData?.totalPropertiesPublished ?? 18420).toLocaleString()} Propiedades
            </div>
          </div>
        </div>

        {/* 2. Propiedades por Tipo */}
        <div className="col-12 col-md-6 col-lg-4">
          <div className="bg-white border border-light-subtle p-4 h-100 d-flex flex-column shadow-sm" style={{ borderRadius: '24px' }}>
            <h6 className="m-0 fw-bold mb-3" style={{ color: '#1e293b', fontSize: '15px' }}>Propiedades por tipo</h6>
            <div className="row g-2 align-items-center flex-grow-1 my-auto">
              <div className="col-6 d-flex align-items-center justify-content-center" style={{ height: '140px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={propiedadesTipo} innerRadius={40} outerRadius={55} paddingAngle={2} dataKey="total" stroke="none" isAnimationActive={true}>
                      {propiedadesTipo.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="col-6">
                <div className="ps-1 scroll-metricas" style={{ fontSize: '11px', maxHeight: '140px', overflowY: 'auto' }}>
                  {propiedadesTipo.map((t) => (
                    <div key={t.name} className="d-flex flex-column py-1 mb-1 border-bottom border-light-subtle">
                      <span className="text-muted text-truncate"><i className="fa-solid fa-circle me-1" style={{ color: t.color, fontSize: '6px' }}></i>{t.name}</span>
                      <span className="fw-bold text-dark ps-2">{t.pct} ({t.total.toLocaleString()})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-top border-light-subtle" style={{ fontSize: '12px', color: GRIS_TEXTO }}>
              <span className="fw-bold text-dark">Total:</span> {(adminData?.totalPropertiesPublished ?? 0).toLocaleString()} Propiedades
            </div>
          </div>
        </div>

        {/* 3. Propiedades por Departamento */}
        <div className="col-12 col-lg-4">
          <div className="bg-white border border-light-subtle p-4 h-100 d-flex flex-column shadow-sm" style={{ borderRadius: '24px' }}>
            <h6 className="m-0 fw-bold mb-4" style={{ color: '#1e293b', fontSize: '15px' }}>Propiedades por departamento</h6>
            <div className="d-flex flex-column gap-2 flex-grow-1 scroll-metricas pe-2" style={{ maxHeight: '160px', overflowY: 'auto' }}>
              {propiedadesDepartamento.map((dep) => (
                <div key={dep.name} className="d-flex align-items-center gap-2" style={{ fontSize: '12px' }}>
                  <span className="text-muted text-truncate" style={{ width: '90px' }}>{dep.name}</span>
                  <div className="flex-grow-1">
                    <div className="progress bg-light" style={{ height: '7px', borderRadius: '10px' }}>
                      <div className="progress-bar" style={{ width: `${dep.pct}%`, backgroundColor: dep.color, borderRadius: '10px' }}></div>
                    </div>
                  </div>
                  <span className="fw-bold text-dark text-end" style={{ width: '50px' }}>{dep.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN INFERIOR: TABLA DE AGENTES Y EXPIRACIONES */}
      <div className="row g-3">
        {/* Tabla: Top Agentes */}
        <div className="col-12 col-xl-7">
          <div className="bg-white border border-light-subtle p-4 h-100 shadow-sm" style={{ borderRadius: '24px' }}>
            <h6 className="m-0 fw-bold mb-4" style={{ color: '#1e293b', fontSize: '15px' }}>Top agentes por desempeño</h6>
            <div className="table-responsive table-responsive-agentes">
              <table className="table table-borderless align-middle m-0" style={{ fontSize: '13px' }}>
                <thead>
                  <tr className="border-bottom border-light-subtle text-muted" style={{ fontSize: '11px' }}>
                    <th scope="col" style={{ width: '30px' }}>#</th>
                    <th scope="col">Agente</th>
                    <th scope="col">Agencia</th>
                    <th scope="col" className="text-center">Leads</th>
                    <th scope="col" className="text-center">Vistas</th>
                    <th scope="col" className="text-center">Clics WA</th>
                    <th scope="col" className="text-center">Calificación</th>
                  </tr>
                </thead>
                <tbody>
                  {topAgentes.map((agente) => (
                    <tr key={agente.rank} className="border-bottom border-light-subtle">
                      <td className="fw-bold text-muted responsive-cell" data-label="#">{agente.rank}</td>
                      <td className="responsive-cell justify-content-start">
                        <div className="d-flex align-items-center gap-2">
                          {agente.avatar ? (
                            <img src={`${import.meta.env.VITE_API_URL}${agente.avatar.replace('uploads', '')}`} alt={agente.name} className="rounded-circle" style={{ width: '28px', height: '28px', objectFit: 'cover' }} />
                          ) : (
                            <div className="rounded-circle bg-secondary-subtle d-flex align-items-center justify-content-center text-dark fw-bold" style={{ width: '28px', height: '28px', fontSize: '10px' }}>
                              {agente.name.split(' ').map(n => n[0]).join('')}
                            </div>
                          )}
                          <span className="fw-semibold text-dark">{agente.name}</span>
                        </div>
                      </td>
                      <td className="text-muted responsive-cell" data-label="Agencia">{agente.agency}</td>
                      <td className="text-center fw-bold responsive-cell" data-label="Leads"><AnimatedNumber value={agente.leads} /></td>
                      <td className="text-center text-muted responsive-cell" data-label="Vistas">{agente.views.toLocaleString()}</td>
                      <td className="text-center text-muted responsive-cell" data-label="Clics WA">{agente.clics}</td>
                      <td className="text-center fw-semibold text-dark responsive-cell" data-label="Calificación">
                        {agente.rating.toFixed(1)} <i className="fa-solid fa-star text-warning" style={{ fontSize: '11px' }}></i>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Grid: Vencimiento de Agencias Destacadas */}
        <div className="col-12 col-xl-5">
          {/* Tarjeta Contenedora Principal */}
          <div className="bg-white border border-light-subtle p-4 shadow-sm h-100 d-flex flex-column" style={{ borderRadius: '24px' }}>
            <h6 className="m-0 fw-bold mb-4" style={{ color: '#1e293b', fontSize: '15px' }}>
              Agencias destacadas prontas a vencer
            </h6>
            
            {/* Contenedor de la fila: mantiene el orden horizontal idéntico al diseño */}
            <div 
              className="d-flex justify-content-between align-items-stretch gap-2 overflow-x-auto pb-2" 
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {agenciasPorVencer.map((ag) => {
                const expireDate = new Date(ag.expire_date);
                const formattedDate = expireDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
                const logoUrl = getLogoUrl(ag.logo_url);
                return (
                <div 
                  key={ag._id} 
                  className="d-flex flex-column align-items-center text-center p-3 border border-light-subtle bg-white" 
                  style={{ 
                    borderRadius: '16px', 
                    minWidth: '110px',
                    flex: '1 1 0px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {/* Logo de la Agencia */}
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center mb-2 shadow-sm border border-light-subtle overflow-hidden" 
                    style={{ width: '46px', height: '46px', backgroundColor: '#f8fafc' }}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt={ag.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <i className="fa-solid fa-building text-secondary" style={{ fontSize: '16px' }}></i>
                    )}
                  </div>

                  {/* Nombre de la Agencia */}
                  <div className="fw-bold text-dark text-truncate w-100 mb-1" style={{ fontSize: '11px', letterSpacing: '-0.2px' }}>
                    {ag.name}
                  </div>

                  {/* Fecha de Vencimiento */}
                  <div className="text-danger fw-semibold mb-2 mt-auto" style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
                    Vence: {formattedDate}
                  </div>

                  {/* Calificación */}
                  <div className="d-flex gap-0.5 justify-content-center" style={{ fontSize: '8px' }}>
                    {ag.ratingAverage > 0 ? (
                      <>
                        {[...Array(5)].map((_, i) => (
                          <i key={i} className={`fa-solid fa-star ${i < Math.round(ag.ratingAverage) ? 'text-warning' : 'text-light'}`}></i>
                        ))}
                      </>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '8px' }}>Sin reseñas</span>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
    </>
  );
}