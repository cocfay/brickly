import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getMetricasAgente, getTotalLeads } from '../services/metricas';
import { API_URL, getCurrentUser } from '../../services/authService';
import { getReviewsByAgent } from '../../services/reviewService';
import { getContactLeads } from '../../services/contactService';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';

// --- COMPONENTE MANUAL PARA ANIMAR LOS NÚMEROS ---
const AnimatedNumber = ({ value, duration = 1200 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      setCount(Math.floor(percentage * value));

      if (progress < duration) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{count.toLocaleString()}</>;
};

// --- COLORES EXACTOS ---
const AZUL = '#007aff';
const AZUL_BG = '#e5f1ff';
const CYAN = '#00c7be';
const CYAN_BG = '#e5f9f8';
const VERDE = '#34c759';     
const VERDE_BG = '#eafaf1';
const MORADO = '#af52de';
const MORADO_BG = '#f7ebfc';
const NARANJA = '#ff9500';
const NARANJA_BG = '#fff4e5';
const ROJO = '#FFB300';
const ROJO_BG = '#FFF4E7';
const GRIS_TEXTO = '#64748b';


export default function MetricasAgent() {
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState(null);
  const [error, setError] = useState(null);
  const [leadsData, setLeadsData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [contactLeads, setContactLeads] = useState([]);
  const [periodo, setPeriodo] = useState('Semanal');
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
      const currentUser = getCurrentUser();

      const result = await getMetricasAgente(currentUser._id);

      if (result.success) {
        setMetricas(result.data);
        //console.log('Métricas del agente:', result.data);

        // Obtener leads del agente
        if (currentUser?.id) {
          const leadsResult = await getTotalLeads(currentUser.id);
          if (leadsResult.success) {
            setLeadsData(leadsResult.data);
          }
        }
      } else {
        setError(result.error);
      }

      // Obtener reseñas del agente (usando _id)
      if (currentUser?._id) {
        const reviewsResult = await getReviewsByAgent(currentUser._id);
        if (reviewsResult.success) {
          setReviews(reviewsResult.data);
        }
      }

      // Obtener contact leads del agente
      if (currentUser?._id) {
        const contactResult = await getContactLeads({ agentId: currentUser._id });
        if (contactResult.success) {
          setContactLeads(contactResult.data);
        }
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  // Agrupar contactLeads según el período seleccionado
  const leadsChartData = useMemo(() => {
    if (contactLeads.length === 0) return [];

    const now = new Date();
    const currentYear = now.getFullYear();

    // Filtrar solo los leads del año actual
    const yearLeads = contactLeads.filter(l => {
      const d = new Date(l.createdAt);
      return d.getFullYear() === currentYear;
    });

    if (periodo === 'Anual') {
      // Agrupar por mes del año actual
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const counts = Array(12).fill(0);
      yearLeads.forEach(l => {
        const d = new Date(l.createdAt);
        counts[d.getMonth()]++;
      });
      return meses.map((name, i) => ({ name, leads: counts[i] }));
    }

    if (periodo === 'Mensual') {
      // Agrupar por semana del mes actual
      const currentMonth = now.getMonth();
      const monthLeads = yearLeads.filter(l => new Date(l.createdAt).getMonth() === currentMonth);
      const weekCounts = {};
      monthLeads.forEach(l => {
        const d = new Date(l.createdAt);
        const weekNum = Math.ceil(d.getDate() / 7);
        const key = `Sem ${weekNum}`;
        weekCounts[key] = (weekCounts[key] || 0) + 1;
      });
      return Object.entries(weekCounts).map(([name, leads]) => ({ name, leads }));
    }

    // Semanal: Agrupar por semana (lunes a domingo) del año actual
    const getWeekNumber = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
      const week1 = new Date(d.getFullYear(), 0, 4);
      return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };

    // Obtener número de semana actual para mostrar últimas 8 semanas
    const currentWeek = getWeekNumber(now);
    const weekLeads = {};
    yearLeads.forEach(l => {
      const w = getWeekNumber(new Date(l.createdAt));
      if (w >= currentWeek - 7 && w <= currentWeek) {
        const key = `Sem ${w}`;
        weekLeads[key] = (weekLeads[key] || 0) + 1;
      }
    });

    return Object.entries(weekLeads).map(([name, leads]) => ({ name, leads }));
  }, [contactLeads, periodo]);

  // Transformar propertiesByType del API en datos para el gráfico de dona
  const propertiesByTypeData = useMemo(() => {
    if (!metricas?.propertiesByType || metricas.propertiesByType.length === 0) return [];
    
    const typeColors = {
      'Casa': AZUL,
      'Apartamento': VERDE,
      'Terreno': MORADO,
      'Local': NARANJA,
      'Oficina': CYAN,
      'Bodega': ROJO,
    };
    const defaultColor = NARANJA;

    const totalSum = metricas.propertiesByType.reduce((acc, item) => acc + item.total, 0);

    return metricas.propertiesByType.map(item => ({
      type: item.type,
      total: item.total,
      color: typeColors[item.type] || defaultColor,
      pct: totalSum > 0 ? Math.round((item.total / totalSum) * 100) + '%' : '0%',
    }));
  }, [metricas?.propertiesByType]);

  // Transformar propertiesByOperation del API en datos para el gráfico de dona
  const propertiesByOperationData = useMemo(() => {
    if (!metricas?.propertiesByOperation || metricas.propertiesByOperation.length === 0) return [];
    
    const operationColors = {
      'Venta': AZUL,
      'Alquiler': VERDE,
      'Renta': VERDE,
    };
    const defaultColor = NARANJA;

    const totalSum = metricas.propertiesByOperation.reduce((acc, item) => acc + item.total, 0);

    return metricas.propertiesByOperation.map(item => ({
      operation: item.operation,
      total: item.total,
      color: operationColors[item.operation] || defaultColor,
      pct: totalSum > 0 ? Math.round((item.total / totalSum) * 100) + '%' : '0%',
    }));
  }, [metricas?.propertiesByOperation]);

  // Calcular desglose de calificaciones desde las reseñas reales
  const ratingBreakdown = React.useMemo(() => {
    if (reviews.length === 0) return null;

    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / total;

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.round(r.rating);
      if (counts[star] !== undefined) counts[star]++;
    });

    const breakdown = [5, 4, 3, 2, 1].map(star => ({
      estrellas: star,
      count: counts[star],
      pct: total > 0 ? Math.round((counts[star] / total) * 100) : 0
    }));

    // Estrellas visuales (ej: 4.5 → 4 llenas + 1 media)
    const fullStars = Math.floor(average);
    const hasHalf = average - fullStars >= 0.5;

    return { average, total, breakdown, fullStars, hasHalf };
  }, [reviews]);

  if (loading) {
    return (
      <div className="px-4 d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <i className="fa-regular fa-circle-exclamation mb-2" style={{ fontSize: '32px', color: ROJO }}></i>
          <p className="text-muted">Error al cargar métricas: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-lg-4" style={{ minHeight: '100vh' }}>
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h1 className="fw-normal m-0" style={{ fontSize: 'clamp(28px, 3vw, 40px)', color: '#1e293b', letterSpacing: '-0.5px' }}>Métricas</h1>
          <p className="m-0 mt-1" style={{ color: GRIS_TEXTO }}>Resumen de tus resultados como agente.</p>
        </div>
      </div>

      {/* PRIMERA FILA: 5 KPIs */}
      <div className="row g-3 mb-4">
        {/* KPI: Propiedades activas */}
        <div className="col-6 col-sm">
          <div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-circle d-flex flex-shrink-0 align-items-center justify-content-center" style={{ width: '32px', height: '32px', backgroundColor: AZUL_BG, color: AZUL }}>
                  <i className="fa-solid fa-house-chimney" style={{ fontSize: '14px' }}></i>
                </div>
                <span className="text-muted" style={{ fontSize: '13px' }}>Propiedades activas</span>
              </div>
              <h2 className="fw-bold m-0 text-center" style={{ fontSize: '28px', color: '#1e293b' }}>
                <AnimatedNumber value={metricas?.assignedProperties || 0} />
              </h2>
            </div>
          </div>
        </div>

        {/* KPI: Vistas totales */}
        <div className="col-6 col-sm">
          <div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', backgroundColor: CYAN_BG, color: CYAN }}>
                  <i className="fa-solid fa-eye" style={{ fontSize: '14px' }}></i>
                </div>
                <span className="text-muted" style={{ fontSize: '13px' }}>Vistas totales</span>
              </div>
              <h2 className="fw-bold m-0 text-center" style={{ fontSize: '28px', color: '#1e293b' }}>
                <AnimatedNumber value={metricas?.totalClicks || 0} />
              </h2>
            </div>
          </div>
        </div>

        {/* KPI: Clics en WhatsApp */}
        <div className="col-6 col-sm">
          <div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-circle d-flex flex-shrink-0 align-items-center justify-content-center" style={{ width: '32px', height: '32px', backgroundColor: MORADO_BG, color: MORADO }}>
                  <i className="fa-brands fa-whatsapp" style={{ fontSize: '16px' }}></i>
                </div>
                <span className="text-muted" style={{ fontSize: '13px' }}>Clics en WhatsApp</span>
              </div>
              <h2 className="fw-bold m-0 text-center" style={{ fontSize: '28px', color: '#1e293b' }}>
                <AnimatedNumber value={metricas?.totalClicksWs || 0} />
              </h2>
            </div>
          </div>
        </div>

        {/* KPI: Leads generados */}
        <div className="col-6 col-sm">
          <div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-circle d-flex flex-shrink-0 align-items-center justify-content-center" style={{ width: '32px', height: '32px', backgroundColor: NARANJA_BG, color: NARANJA }}>
                  <i className="fa-regular fa-comment-dots" style={{ fontSize: '14px' }}></i>
                </div>
                <span className="text-muted" style={{ fontSize: '13px' }}>Leads generados</span>
              </div>
              <div className="text-center">
                <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}>
                  <AnimatedNumber value={leadsData?.totalLeads || 0} />
                </h2>
                {leadsData?.growthPercentage != null && (
                  <div className="text-success mt-1" style={{ fontSize: '11px', fontWeight: '500' }}>
                    +{leadsData.growthPercentage}% vs mes anterior
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* KPI: Calificación promedio */}
        <div className="col-6 col-sm">
          <div className="bg-white border border-light-subtle p-3 h-100 shadow-sm" style={{ borderRadius: '20px' }}>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-circle d-flex flex-shrink-0 align-items-center justify-content-center" style={{ width: '32px', height: '32px', backgroundColor: ROJO_BG, color: ROJO }}>
                  <i className="fa-solid fa-star" style={{ fontSize: '14px' }}></i>
                </div>
                <span className="text-muted" style={{ fontSize: '13px' }}>Calificación promedio</span>
              </div>
              <div className="text-center">
                <h2 className="fw-bold m-0" style={{ fontSize: '28px', color: '#1e293b' }}>
                  {metricas?.rating?.average?.toFixed(1) ?? '0.0'}
                </h2>
                <div className="mt-1" style={{ fontSize: '11px', color: GRIS_TEXTO }}>
                  {metricas?.rating?.total ?? 0} {metricas?.rating?.total === 1 ? 'reseña' : 'reseñas'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE ROW: LINE CHART & DONUTS */}
      <div className="row g-3 mb-4">
        
        {/* Gráfico de Línea: Leads Generados */}
        <div className="col-lg-5">
          <div className="bg-white border border-light-subtle p-4 h-100 d-flex flex-column shadow-sm" style={{ borderRadius: '24px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h6 className="m-0 fw-bold" style={{ color: '#1e293b', fontSize: '15px' }}>Leads generados por formulario de contacto</h6>
              <select 
                className="form-select form-select-sm border-light-subtle bg-light text-muted" 
                style={{ width: 'auto', fontSize: '12px', borderRadius: '8px' }}
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
              >
                <option value="Semanal">Semanal</option>
                <option value="Mensual">Mensual</option>
                <option value="Anual">Anual</option>
              </select>
            </div>
            <div className="flex-grow-1" style={{ height: '180px', minHeight: '180px' }}>
              {leadsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={leadsChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={AZUL} stopOpacity={0.15}/>
                        <stop offset="95%" stopColor={AZUL} stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke={GRIS_TEXTO} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke={GRIS_TEXTO} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} tickCount={5} />
                    <Tooltip />
                    <Area type="monotone" dataKey="leads" stroke={AZUL} strokeWidth={2.5} fillOpacity={1} fill="url(#colorLeads)" dot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: AZUL }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="d-flex flex-column align-items-center justify-content-center text-muted h-100" style={{ fontSize: '14px' }}>
                  <i className="fa-regular fa-chart-line mb-2" style={{ fontSize: '24px', opacity: 0.5 }}></i>
                  <span>Sin leads en este período</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dona 1: Propiedades por Tipo */}
        <div className="col-lg-3" style={{ flexGrow: 1 }}>
          <div className="bg-white border border-light-subtle p-4 h-100 d-flex flex-column shadow-sm" style={{ borderRadius: '24px' }}>
            <h6 className="m-0 fw-bold mb-3" style={{ color: '#1e293b', fontSize: '15px' }}>Propiedades por tipo</h6>
            {propertiesByTypeData.length > 0 ? (
              <div className="row g-2 align-items-center flex-grow-1 my-auto">
                <div className="col-lg-6 position-relative d-flex align-items-center justify-content-center" style={{ height: '150px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={propertiesByTypeData} innerRadius={42} outerRadius={60} paddingAngle={2} dataKey="total" stroke="none" isAnimationActive={true}>
                        {propertiesByTypeData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="col-lg-6">
                  <div className="ps-1 scroll-metricas" style={{ fontSize: '12px', maxHeight: '180px', overflowY: 'auto' }}>
                    {propertiesByTypeData.map((t) => (
                      <div key={t.type} className="d-flex flex-row justify-content-between align-items-center align-items-lg-start flex-lg-column py-1 mb-1 border-bottom border-light-subtle">
                        <span className="text-muted text-truncate d-flex align-items-center" style={{ fontSize: '11px' }}>
                          <i className="fa-solid fa-circle me-1" style={{ color: t.color, fontSize: '7px' }}></i>{t.type}
                        </span>
                        <span className="fw-bold text-dark ps-2">{t.pct} ({t.total})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column align-items-center justify-content-center text-muted flex-grow-1" style={{ minHeight: '150px', fontSize: '14px' }}>
                <i className="fa-regular fa-building mb-2" style={{ fontSize: '24px', opacity: 0.5 }}></i>
                <span>Sin propiedades asignadas</span>
              </div>
            )}
            <div className="mt-3 pt-2 border-top border-light-subtle" style={{ fontSize: '13px', color: GRIS_TEXTO }}>
              <span className="fw-bold text-dark">Total:</span>{' '}
              {propertiesByTypeData.reduce((sum, item) => sum + item.total, 0)} Propiedades
            </div>
          </div>
        </div>

        {/* Dona 2: Propiedades por Operación */}
        <div className="col-lg-3" style={{ flexGrow: 1 }}>
            <div className="bg-white border border-light-subtle p-4 h-100 d-flex flex-column shadow-sm" style={{ borderRadius: '24px' }}>
            <h6 className="m-0 fw-bold mb-3" style={{ color: '#1e293b', fontSize: '15px' }}>Propiedades por tipo de operación</h6>
            {propertiesByOperationData.length > 0 ? (
              <div className="row g-2 align-items-center flex-grow-1 my-auto">
                  <div className="col-lg-6 position-relative d-flex align-items-center justify-content-center" style={{ height: '150px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                      <Pie data={propertiesByOperationData} innerRadius={42} outerRadius={60} paddingAngle={2} dataKey="total" stroke="none" isAnimationActive={true}>
                          {propertiesByOperationData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      </PieChart>
                  </ResponsiveContainer>
                  </div>
                  <div className="col-lg-6">
                  <div className="ps-1" style={{ fontSize: '12px' }}>
                      {propertiesByOperationData.map((o) => (
                      <div key={o.operation} className="d-flex justify-content-between align-items-center py-1 mb-1 border-bottom border-light-subtle">
                          <span className="text-muted text-truncate d-flex align-items-center" style={{ fontSize: '13px' }}>
                          <i className="fa-solid fa-circle me-1" style={{ color: o.color, fontSize: '7px' }}></i>{o.operation}
                          </span>
                          <span className="fw-bold text-dark ps-2">{o.pct} ({o.total})</span>
                      </div>
                      ))}
                  </div>
                  </div>
              </div>
            ) : (
              <div className="d-flex flex-column align-items-center justify-content-center text-muted flex-grow-1" style={{ minHeight: '150px', fontSize: '14px' }}>
                <i className="fa-regular fa-building mb-2" style={{ fontSize: '24px', opacity: 0.5 }}></i>
                <span>Sin propiedades asignadas</span>
              </div>
            )}
            <div className="mt-3 pt-2 border-top border-light-subtle" style={{ fontSize: '13px', color: GRIS_TEXTO }}>
                <span className="fw-bold text-dark">Total:</span>{' '}
                {propertiesByOperationData.reduce((sum, item) => sum + item.total, 0)} Propiedades
            </div>
            </div>
        </div>

        </div>

        {/* 3. BOTTOM ROW: LIST & RATINGS */}
        <div className="row g-3">
        
        {/* Izquierda: Vistas de propiedades (Más vistas / Menos vistas) */}
        <div className="col-lg-7">
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
                : (metricas?.topPropertiesMinus ? Object.values(metricas.topPropertiesMinus) : []);
              if (properties.length === 0) {
                return (
                  <div className="d-flex flex-column align-items-center justify-content-center text-muted" style={{ minHeight: '170px', fontSize: '14px' }}>
                    <i className="fa-regular fa-building mb-2" style={{ fontSize: '24px', opacity: 0.5 }}></i>
                    <span>No tienes propiedades</span>
                  </div>
                );
              }
              const allPropsForMax = propertyViewMode === 'most'
                ? Object.values(metricas?.topProperties || {})
                : Object.values(metricas?.topPropertiesMinus || {});
              const maxViews = Math.max(...allPropsForMax.map(p => p.visitCounter), 1);
              return (
                <div className="d-flex flex-column gap-3 scroll-metricas pe-3" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  <style>{`
                    .scroll-metricas::-webkit-scrollbar { width: 6px; }
                    .scroll-metricas::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
                    .scroll-metricas::-webkit-scrollbar-thumb { background: #007aff; border-radius: 3px; opacity: 0.7; }
                    .scroll-metricas::-webkit-scrollbar-thumb:hover { background: #0056b3; }
                  `}</style>
                  {properties.map((item, idx) => {
                    const widthPct = Math.round((item.visitCounter / maxViews) * 100);
                    const imgSrc = item.picture ? `${API_URL}/${item.picture}` : null;
                    const formattedPrice = item.priceUSD != null
                      ? `$${Number(item.priceUSD).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                      : `$${Number(item.price).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
                    return (
                      <div key={item.id} className="d-flex align-items-center justify-content-between gap-3">
                        <div className="d-flex align-items-center gap-3 flex-grow-1" style={{ minWidth: '0' }}>
                          <span className="text-muted fw-bold" style={{ width: '15px', fontSize: '13px' }}>{idx + 1}</span>
                          <div className="rounded bg-light border overflow-hidden flex-shrink-0 d-flex align-items-center justify-content-center text-muted" style={{ width: '44px', height: '44px', borderRadius: '8px' }}>
                            {imgSrc ? (
                              <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <i className="fa-regular fa-image" style={{ fontSize: '14px' }}></i>
                            )}
                          </div>
                          <div className="text-truncate flex-grow-1" style={{ maxWidth: '160px' }}>
                            <div className="fw-semibold text-dark text-truncate" style={{ fontSize: '13px' }}>{item.name}</div>
                            <div className="text-muted" style={{ fontSize: '11px' }}>{formattedPrice}</div>
                          </div>
                          <div className="flex-grow-1 d-none d-sm-block px-2">
                            <div className="progress bg-light" style={{ height: '6px', borderRadius: '10px' }}>
                              <div className="progress-bar" style={{ width: `${widthPct}%`, backgroundColor: AZUL, borderRadius: '10px', transition: 'width 1s ease-in-out' }}></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-end fw-bold text-dark" style={{ fontSize: '13px', width: '60px' }}>
                          <AnimatedNumber value={item.visitCounter} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            </div>
        </div>

        {/* Derecha: Resumen de Calificaciones */}
        <div className="col-lg-5">
            <div className="bg-white border border-light-subtle p-4 h-100 shadow-sm d-flex flex-column justify-content-between" style={{ borderRadius: '24px' }}>
            <h6 className="m-0 fw-bold mb-4" style={{ color: '#1e293b', fontSize: '15px' }}>Resumen de calificaciones</h6>
            
            {ratingBreakdown ? (
              <div className="row align-items-center flex-grow-1">
                {/* Bloque Izquierdo: Puntuación Grande */}
                <div className="col-sm-5 text-center border-end border-light-subtle py-2">
                  <h1 className="fw-bold m-0 text-dark" style={{ fontSize: '56px', letterSpacing: '-1px' }}>
                    {ratingBreakdown.average.toFixed(1)}
                  </h1>
                  <div className="d-flex justify-content-center text-warning gap-1 my-2" style={{ fontSize: '16px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <i key={star} className={`fa-solid ${star <= ratingBreakdown.fullStars ? 'fa-star' : (star === ratingBreakdown.fullStars + 1 && ratingBreakdown.hasHalf ? 'fa-star-half-stroke' : 'fa-star')}`}
                        style={star > ratingBreakdown.fullStars && !(star === ratingBreakdown.fullStars + 1 && ratingBreakdown.hasHalf) ? { color: '#ddd' } : {}}></i>
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: GRIS_TEXTO }}>
                    Basado en {ratingBreakdown.total} {ratingBreakdown.total === 1 ? 'reseña' : 'reseñas'}
                  </div>
                </div>

                {/* Bloque Derecho: Desglose de Barras */}
                <div className="col-sm-7 ps-sm-4">
                  <div className="d-flex flex-column gap-2">
                    {ratingBreakdown.breakdown.map((row) => (
                      <div key={row.estrellas} className="d-flex align-items-center gap-2" style={{ fontSize: '12px' }}>
                        <span className="text-muted d-flex align-items-center justify-content-end gap-1" style={{ width: '25px' }}>
                          {row.estrellas} <i className="fa-solid fa-star text-warning" style={{ fontSize: '10px' }}></i>
                        </span>
                        <div className="flex-grow-1">
                          <div className="progress bg-light" style={{ height: '6px', borderRadius: '10px' }}>
                            <div className="progress-bar" style={{ width: `${row.pct}%`, backgroundColor: AZUL, borderRadius: '10px' }}></div>
                          </div>
                        </div>
                        <span className="text-muted text-end" style={{ width: '35px' }}>{row.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column align-items-center justify-content-center text-muted flex-grow-1" style={{ minHeight: '150px', fontSize: '14px' }}>
                <i className="fa-regular fa-star mb-2" style={{ fontSize: '24px', opacity: 0.5 }}></i>
                <span>Sin reseñas aún</span>
              </div>
            )}

            </div>
        </div>

    </div>          

    </div>
  );
}