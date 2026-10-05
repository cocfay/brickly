import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Container, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getMyPropertiesReport, getMyAgencyAgentsReport } from '../../services/reportes';
import { exportTableToExcelFile } from '../../services/exportService';
import { API_URL, getCurrentUser } from '../../../services/authService';
import sinPropiedad from '../../assets/images/iconos/sinPropiedad.png';
import $ from 'jquery';
import 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import 'datatables.net-responsive-dt';
import 'datatables.net-responsive-dt/css/responsive.dataTables.css';
import espanol from 'datatables.net-plugins/i18n/es-ES.mjs';

const PROPERTY_TYPES = ['Apartamento', 'Bodega', 'Casa', 'Edificio', 'Finca', 'Local comercial', 'Oficina', 'Terreno'];

const STATUS_OPTIONS = [
  { value: 'pre-published', label: 'Pendiente', bg: '#ffc107' },
  { value: 'published', label: 'Publicado', bg: '#198754' },
  { value: 'draft', label: 'Borrador', bg: '#6c757d' },
  { value: 'disabled', label: 'Desactivado', bg: '#212529' },
  { value: 'rejected', label: 'Rechazado', bg: '#dc3545' },
];

const STATUS_BADGE = {
  draft: '<span class="badge bg-secondary">Borrador</span>',
  published: '<span class="badge bg-success">Publicado</span>',
  'pre-published': '<span class="badge bg-warning text-dark">Pendiente</span>',
  sold: '<span class="badge bg-danger">Vendido</span>',
  disabled: '<span class="badge bg-dark">Desabilitado</span>',
  rented: '<span class="badge bg-light">Alquilado</span>',
  rejected: '<span class="badge bg-danger">Rechazado</span>',
};

const STATUS_LABELS = {
  draft: 'Borrador',
  published: 'Publicado',
  'pre-published': 'Pendiente',
  sold: 'Vendido',
  disabled: 'Desactivado',
  rented: 'Alquilado',
  rejected: 'Rechazado',
};

const EMPTY_FILTERS = {
  mode: 'all',
  status: 'all',
  type: 'all',
  department: '',
  municipality: '',
  zone: '',
  priceMin: 0,
  priceMax: null,
  agent: 'all',
};

const norm = (v) => {
  if (!v) return '';
  const t = String(v).trim();
  return ['ninguno', 'nunguno', 'none', 'n/a', '-'].includes(t.toLowerCase()) ? '' : t;
};

const avatarUrl = (path) => (path ? `${API_URL}${String(path).replace('/uploads', '')}` : '');

const formatPrice = (row) => {
  const usd = Number(row.priceUSD);
  const q = Number(row.priceQ);
  if (Number.isFinite(usd) && usd > 0) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(usd);
  }
  if (Number.isFinite(q) && q > 0) {
    return 'Q' + q.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  return '—';
};

const formatUSDShort = (v) => {
  const n = Number(v) || 0;
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + 'M';
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
  return '$' + n;
};

const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).replace(/\//g, '-');
};

const matchesFilters = (row, f) => {
  if (!row) return true;
  if (f.mode !== 'all' && row.mode !== f.mode) return false;
  if (f.status !== 'all' && row.status !== f.status) return false;
  if (f.type !== 'all' && row.type !== f.type) return false;
  if (f.department && norm(row.department) !== f.department) return false;
  if (f.municipality && norm(row.municipality) !== f.municipality) return false;
  if (f.zone && norm(row.zone) !== f.zone) return false;
  const price = Number(row.priceUSD) || 0;
  if (f.priceMin > 0 && price < f.priceMin) return false;
  if (f.priceMax != null && price > f.priceMax) return false;
  if (f.agent && f.agent !== 'all') {
    const isOwner = row.owner?.id != null && String(row.owner.id) === String(f.agent);
    const isAssigned = Array.isArray(row.agentIds) && row.agentIds.map(String).includes(String(f.agent));
    if (!isOwner && !isAssigned) return false;
  }
  return true;
};

const searchHaystack = (row) =>
  [
    row.title,
    row.type,
    row.mode,
    row.department,
    row.municipality,
    row.zone,
    STATUS_LABELS[row.status] || row.status,
    formatPrice(row),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const matchesSearch = (row, term) => {
  const t = (term || '').trim().toLowerCase();
  if (!t) return true;
  return searchHaystack(row).includes(t);
};

const CHART_AGENT_COLORS = ['#007aff', '#34c759', '#ffcc00', '#af52de', '#00c7be', '#ff9500', '#ff3b30', '#8B5CF6', '#64748b'];

const getColorByType = (type) => {
  const colorMap = {
    'Casa': '#007aff',
    'Casa en Condominio': '#007aff',
    'Apartamento': '#34c759',
    'Oficina': '#ffcc00',
    'Terreno': '#af52de',
    'Bodega': '#00c7be',
    'Local comercial': '#ff9500',
    'Edificio': '#ff3b30',
    'Finca': '#8B5CF6',
    'Otro': '#64748b',
  };
  return colorMap[type] || '#64748b';
};

function DonutCard({ title, data, total }) {
  return (
    <div className="bg-white border border-light-subtle p-4 h-100 d-flex flex-column shadow-sm" style={{ borderRadius: '24px' }}>
      <h6 className="m-0 fw-bold mb-3" style={{ color: '#1e293b', fontSize: '15px' }}>{title}</h6>

      {data.length === 0 ? (
        <div className="d-flex flex-column align-items-center justify-content-center text-muted flex-grow-1" style={{ minHeight: '190px', fontSize: '14px' }}>
          <i className="fa-regular fa-building mb-2" style={{ fontSize: '24px', opacity: 0.5 }}></i>
          <span>Sin propiedades</span>
        </div>
      ) : (
        <>
          <div className="row g-2 align-items-center flex-grow-1 my-auto">
            <div className="col-lg-6 position-relative d-flex align-items-center justify-content-center" style={{ height: '170px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive
                    animationDuration={1000}
                  >
                    {data.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="col-lg-6">
              <div className="ps-2 scroll-metricas" style={{ fontSize: '12px', maxHeight: '180px', overflowY: 'auto' }}>
                {data.map((t) => {
                  const pct = total ? `${Math.round((t.value / total) * 100)}% (${t.value})` : `0% (${t.value})`;
                  return (
                    <div key={t.name} className="d-flex flex-column py-1 mb-1 border-bottom border-light-subtle">
                      <span className="text-muted text-truncate" style={{ fontSize: '11px' }}>
                        <i className="fa-solid fa-circle me-1" style={{ color: t.color, fontSize: '8px' }}></i>
                        {t.name}
                      </span>
                      <span className="fw-bold text-dark ps-3">{pct}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-top border-light-subtle" style={{ fontSize: '13px', color: '#64748b' }}>
            <span className="fw-bold text-dark">Total:</span> {total} Propiedades
          </div>
        </>
      )}
    </div>
  );
}

function ResponsablesTable({ title, rows }) {
  return (
    <div className="bg-white border border-light-subtle p-4 shadow-sm mt-3" style={{ borderRadius: '24px' }}>
      <h6 className="m-0 fw-bold mb-4" style={{ color: '#1e293b', fontSize: '15px' }}>{title}</h6>
      <div className="table-responsive scroll-metricas pe-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
        <table className="table table-borderless align-middle m-0" style={{ fontSize: '13px' }}>
          <thead>
            <tr style={{ color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
              <th className="fw-normal pb-3 ps-2">Responsable</th>
              <th className="fw-normal pb-3 text-center">Propiedades</th>
              <th className="fw-normal pb-3 text-center">Publicadas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const src = avatarUrl(r.avatar);
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td className="py-1 ps-2">
                    <div className="d-flex align-items-center gap-3 me-auto">
                      <div className="rounded-circle bg-light border overflow-hidden d-flex align-items-center justify-content-center text-muted flex-shrink-0" style={{ width: '32px', height: '32px' }}>
                        {src ? (
                          <img src={src} alt="" style={{ width: '32px', height: '32px', objectFit: 'cover' }} />
                        ) : (
                          <i className="fa-regular fa-user" style={{ fontSize: '14px' }}></i>
                        )}
                      </div>
                      <span className="fw-bold text-dark text-truncate">{r.name}</span>
                      {r.isAgency && <span className="badge rounded-pill text-bg-dark ms-1">Agencia</span>}
                    </div>
                  </td>
                  <td className="text-center text-muted">{r.total}</td>
                  <td className="text-center text-muted">{r.published}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiBadge({ icon, label, value, color, bg }) {
  return (
    <span className="badge rounded-pill d-inline-flex align-items-center gap-2 px-3 py-2" style={{ background: bg, color, fontWeight: 600, fontSize: '12px' }}>
      <i className={icon}></i> {label}: {value}
    </span>
  );
}

function ChipDropdown({ icon, label, active, width, panel, open, onToggle, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex' }}>
      <button
        type="button"
        className={`btn btn-sm dropdown-toggle rounded-pill px-3 py-1 ${active ? 'btn-dark' : 'btn-outline-dark'}`}
        style={{ fontSize: '14px' }}
        onClick={onToggle}
      >
        {icon && <i className={`${icon} me-1`}></i>}{label}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 2000,
            minWidth: width || (panel ? 300 : 190),
            maxWidth: panel ? 'calc(100vw - 32px)' : undefined,
            padding: panel ? '14px' : '8px 0',
            marginTop: 6,
            backgroundColor: '#fff',
            border: '1px solid rgba(0,0,0,0.15)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({ label, active, count, dot, onClick }) {
  return (
    <a
      href="#"
      className={`dropdown-item d-flex align-items-center gap-2 ${active ? 'active-dropdown-item' : ''}`}
      style={{ padding: '6px 16px', fontSize: '14px' }}
      onClick={(e) => { e.preventDefault(); onClick(); }}
    >
      {dot && <span style={{ width: 10, height: 10, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />}
      <span>{label}</span>
      {count != null && <span className="badge bg-secondary rounded-pill ms-auto">{count}</span>}
    </a>
  );
}

function LocationMenu({ options, value, onApply, onClear }) {
  const [draft, setDraft] = useState(value);

  const municipalities = draft.department ? (options.municipalities[draft.department] || []) : [];
  const zones = draft.department && draft.municipality ? (options.zones[`${draft.department}||${draft.municipality}`] || []) : [];

  return (
    <div>
      <div className="fw-semibold mb-2">Ubicación</div>
      <div className="mb-2">
        <label className="form-label mb-1 text-muted" style={{ fontSize: 12 }}>Departamento</label>
        <select
          className="form-select form-select-sm rounded-pill"
          value={draft.department}
          onChange={(e) => setDraft({ department: e.target.value, municipality: '', zone: '' })}
        >
          <option value="">Todos</option>
          {options.departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="mb-2">
        <label className="form-label mb-1 text-muted" style={{ fontSize: 12 }}>Municipio</label>
        <select
          className="form-select form-select-sm rounded-pill"
          value={draft.municipality}
          disabled={!draft.department}
          onChange={(e) => setDraft({ ...draft, municipality: e.target.value, zone: '' })}
        >
          <option value="">Todos</option>
          {municipalities.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label mb-1 text-muted" style={{ fontSize: 12 }}>Zona</label>
        <select
          className="form-select form-select-sm rounded-pill"
          value={draft.zone}
          disabled={!draft.municipality}
          onChange={(e) => setDraft({ ...draft, zone: e.target.value })}
        >
          <option value="">Todas</option>
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
      </div>
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button type="button" className="btn btn-sm btn-outline-dark rounded-pill px-3" onClick={() => { setDraft({ department: '', municipality: '', zone: '' }); onClear(); }}>Limpiar</button>
        <button type="button" className="btn btn-sm btn-dark rounded-pill px-3" onClick={() => onApply(draft)}>Aplicar</button>
      </div>
    </div>
  );
}

function PriceMenu({ maxPrice, value, onApply, onClear }) {
  const [min, setMin] = useState(value.priceMin || 0);
  const [max, setMax] = useState(value.priceMax ?? maxPrice);

  return (
    <div>
      <div className="fw-semibold mb-2">Rango de precio (USD)</div>
      <div className="d-flex align-items-center gap-2">
        <input
          type="number"
          className="form-control form-control-sm"
          placeholder="Mínimo"
          value={min}
          min={0}
          onChange={(e) => setMin(e.target.value)}
        />
        <span>–</span>
        <input
          type="number"
          className="form-control form-control-sm"
          placeholder="Máximo"
          value={max}
          min={0}
          onChange={(e) => setMax(e.target.value)}
        />
      </div>
      <div className="text-muted mt-2" style={{ fontSize: 12 }}>
        {formatUSDShort(min || 0)} – {formatUSDShort(max || maxPrice)}
      </div>
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button type="button" className="btn btn-sm btn-outline-dark rounded-pill px-3" onClick={() => { setMin(0); setMax(maxPrice); onClear(); }}>Limpiar</button>
        <button
          type="button"
          className="btn btn-sm btn-dark rounded-pill px-3"
          onClick={() => onApply({ priceMin: Number(min) || 0, priceMax: Number(max) || maxPrice })}
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}

function ReporteMisPropiedades() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const [agentOptions, setAgentOptions] = useState([]);

  const tableRef = useRef(null);
  const dataTableRef = useRef(null);
  const filtersRef = useRef(filters);
  const navigate = useNavigate();

  const currentUser = getCurrentUser();
  const isAgencia = currentUser?.roles?.includes('agencia');

  useEffect(() => {
    setLoading(true);
    setError('');
    getMyPropertiesReport()
      .then(setData)
      .catch((e) => setError(e.message || 'Error al cargar el reporte.'))
      .finally(() => setLoading(false));
  }, []);

  // Lista de agentes de la agencia (solo para agencia). Si no hay, no se muestra el filtro.
  // Se excluyen los agentes sin propiedades creadas ni asignadas.
  useEffect(() => {
    if (!isAgencia) return;
    getMyAgencyAgentsReport()
      .then((res) => {
        const list = (Array.isArray(res?.agents) ? res.agents : [])
          .filter((a) => Number(a.totalProperties) > 0);
        setAgentOptions(list.map((a) => ({ value: String(a.id), label: a.name || a.email || 'Agente', avatar: a.avatar || '' })));
      })
      .catch(() => setAgentOptions([]));
  }, [isAgencia]);

  const summary = data?.summary;
  const properties = useMemo(() => data?.properties || [], [data]);

  // Conteos para los filtros
  const counts = useMemo(() => {
    const c = { Venta: 0, Alquiler: 0, byType: {} };
    properties.forEach((p) => {
      if (p.mode === 'Venta') c.Venta += 1;
      if (p.mode === 'Alquiler') c.Alquiler += 1;
      c.byType[p.type] = (c.byType[p.type] || 0) + 1;
    });
    return c;
  }, [properties]);

  const maxPrice = useMemo(
    () => properties.reduce((m, p) => Math.max(m, Number(p.priceUSD) || 0), 0),
    [properties],
  );

  // Datos de la gráfica "Propiedades por tipo"
  const typeChartData = useMemo(() => {
    const map = {};
    properties.forEach((p) => {
      const t = p.type || 'Otro';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, color: getColorByType(name) }))
      .sort((a, b) => b.value - a.value);
  }, [properties]);

  const typeChartTotal = useMemo(
    () => typeChartData.reduce((s, d) => s + d.value, 0),
    [typeChartData],
  );

  // Datos de la gráfica "Propiedades por agente" (solo agencia con agentes)
  const agentChartData = useMemo(() => {
    if (!isAgencia || agentOptions.length === 0) return [];
    return agentOptions
      .map((a) => {
        const value = properties.filter((p) => {
          const isOwner = p.owner?.id != null && String(p.owner.id) === a.value;
          const isAssigned = Array.isArray(p.agentIds) && p.agentIds.map(String).includes(a.value);
          return isOwner || isAssigned;
        }).length;
        return { name: a.label, value };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((d, i) => ({ ...d, color: CHART_AGENT_COLORS[i % CHART_AGENT_COLORS.length] }));
  }, [isAgencia, agentOptions, properties]);

  const agentChartTotal = useMemo(
    () => agentChartData.reduce((s, d) => s + d.value, 0),
    [agentChartData],
  );

  // Filas de la tabla "Propiedades por responsable" (agencia + agentes)
  const agentTableRows = useMemo(() => {
    if (!isAgencia) return [];
    const agencyProps = properties.filter((p) => p.owner?.isAgency);
    const rows = [{
      id: 'agency',
      name: currentUser?.name || 'Agencia',
      avatar: currentUser?.avatar || '',
      isAgency: true,
      total: agencyProps.length,
      published: agencyProps.filter((p) => p.status === 'published').length,
    }];
    agentOptions.forEach((a) => {
      const own = properties.filter((p) => {
        const isOwner = p.owner?.id != null && String(p.owner.id) === a.value;
        const isAssigned = Array.isArray(p.agentIds) && p.agentIds.map(String).includes(a.value);
        return isOwner || isAssigned;
      });
      rows.push({
        id: a.value,
        name: a.label,
        avatar: a.avatar || '',
        isAgency: false,
        total: own.length,
        published: own.filter((p) => p.status === 'published').length,
      });
    });
    return rows;
  }, [isAgencia, properties, agentOptions, currentUser]);

  // Opciones de ubicación
  const locationOptions = useMemo(() => {
    const deps = new Set();
    const munis = {};
    const zones = {};
    properties.forEach((p) => {
      const d = norm(p.department);
      const m = norm(p.municipality);
      const z = norm(p.zone);
      if (d) deps.add(d);
      if (d && m) { (munis[d] = munis[d] || new Set()).add(m); }
      if (d && m && z) { const k = `${d}||${m}`; (zones[k] = zones[k] || new Set()).add(z); }
    });
    const toObj = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [...v].sort()]));
    return {
      departments: [...deps].sort(),
      municipalities: toObj(munis),
      zones: toObj(zones),
    };
  }, [properties]);

  // Mantener refs de filtros para el filtro personalizado del DataTable
  useEffect(() => {
    filtersRef.current = filters;
    if (dataTableRef.current) dataTableRef.current.draw();
  }, [filters]);

  useEffect(() => {
    if (dataTableRef.current) dataTableRef.current.search(search).draw();
  }, [search]);

  // Inicializar DataTable
  useEffect(() => {
    if (loading || !tableRef.current || dataTableRef.current) return undefined;

    const filterFn = (settings, searchData, index, rowData) => matchesFilters(rowData, filtersRef.current);
    $.fn.dataTable.ext.search.push(filterFn);

    dataTableRef.current = $(tableRef.current).DataTable({
      language: espanol,
      responsive: true,
      lengthChange: false,
      deferRender: true,
      pageLength: 15,
      order: [],
      data: properties,
      layout: {
        topStart: null,
        topEnd: null,
        bottomStart: 'info',
        bottomEnd: 'paging',
      },
      columns: [
        {
          title: '#',
          data: null,
          className: 'text-center',
          responsivePriority: 1,
          orderable: false,
          searchable: false,
          render(row, type, r, meta) {
            return `<span class="fw-bold row-number">${meta.row + 1}</span><br><span class="text-muted text-nowrap" style="font-size:12px;">${formatDate(row.createdAt)}</span>`;
          },
        },
        {
          title: '',
          data: null,
          orderable: false,
          searchable: false,
          render(row) {
            const photo = row.photo ? `${API_URL}/${row.photo}` : '';
            return `<div class="propiedad-thumb-wrapper"><img src="${photo || sinPropiedad}" alt="image" class="propiedad-thumb" /></div>`;
          },
        },
        {
          title: 'Propiedad',
          data: null,
          width: '280px',
          responsivePriority: 1000,
          render(row) {
            return `<span class="prop-title-text text-truncate">${row.title || ''}</span>`;
          },
        },
        {
          title: 'Tipo propiedad',
          data: null,
          responsivePriority: 1000,
          render(row) { return row.type || 'N/A'; },
        },
        {
          title: 'Ubicación',
          data: null,
          responsivePriority: 1000,
          render(row) { return norm(row.zone) || norm(row.municipality) || norm(row.department) || 'N/A'; },
        },
        {
          title: 'Modalidad',
          data: null,
          responsivePriority: 1000,
          render(row) { return row.mode || ''; },
        },
        {
          title: 'Precio',
          data: null,
          responsivePriority: 1000,
          render(row, type) {
            if (type === 'sort' || type === 'type') return Number(row.priceUSD) || Number(row.priceQ) || 0;
            return formatPrice(row);
          },
        },
        {
          title: 'Estado',
          data: null,
          responsivePriority: 1000,
          render(row) { return STATUS_BADGE[row.status] || row.status || ''; },
        },
        {
          title: 'Acciones',
          data: null,
          className: 'text-center',
          responsivePriority: 10000,
          orderable: false,
          searchable: false,
          render(row) {
            return `<a href="#" class="text-body view-propiedad" data-id="${row.id}" title="Ver propiedad"><i class="fa-solid fa-eye"></i></a>`;
          },
        },
      ],
    });

    const $table = $(tableRef.current);
    const handleView = function handleView(e) {
      e.preventDefault();
      const id = this.dataset.id;
      if (id) navigate(`/cpanel/propiedades/view/${id}`, { state: { fromReport: true, from: '/cpanel/reportes/mis-propiedades' } });
    };
    $table.on('click', '.view-propiedad', handleView);

    return () => {
      $table.off('click', '.view-propiedad', handleView);
      const idx = $.fn.dataTable.ext.search.indexOf(filterFn);
      if (idx !== -1) $.fn.dataTable.ext.search.splice(idx, 1);
      if (dataTableRef.current) {
        dataTableRef.current.destroy();
        dataTableRef.current = null;
      }
    };
  }, [loading, properties, navigate]);

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
  };

  const isAllActive =
    filters.mode === 'all' && filters.status === 'all' && filters.type === 'all' &&
    !filters.department && !filters.municipality && !filters.zone &&
    !filters.priceMin && filters.priceMax == null && filters.agent === 'all';

  const modeLabel = filters.mode === 'all' ? 'Modalidad' : filters.mode;
  const typeLabel = filters.type === 'all' ? 'Tipo' : filters.type;
  const statusLabel = filters.status === 'all' ? 'Status' : (STATUS_OPTIONS.find((s) => s.value === filters.status)?.label || filters.status);
  const locationActive = !!(filters.department || filters.municipality || filters.zone);
  const locationLabel = locationActive ? [filters.department, filters.municipality, filters.zone].filter(Boolean).join(', ') : 'Ubicación';
  const priceActive = filters.priceMin > 0 || (filters.priceMax != null && filters.priceMax < maxPrice);
  const priceLabel = priceActive ? `${formatUSDShort(filters.priceMin || 0)} - ${formatUSDShort(filters.priceMax ?? maxPrice)}` : 'Precio';
  const agentActive = filters.agent !== 'all';
  const agentLabel = agentActive
    ? (agentOptions.find((a) => a.value === filters.agent)?.label || 'Agente')
    : 'Agentes';

  const handleExportExcel = () => {
    const filtered = properties.filter((p) => matchesFilters(p, filters) && matchesSearch(p, search));

    const rows = filtered.map((p, i) => [
      i + 1,
      p.title || '',
      p.type || '',
      norm(p.zone) || norm(p.municipality) || norm(p.department) || '',
      p.mode || '',
      Number(p.priceUSD) || 0,
      Number(p.priceQ) || 0,
      STATUS_LABELS[p.status] || p.status || '',
      formatDate(p.createdAt),
    ]);

    const title = agentActive
      ? `Propiedades de: ${agentOptions.find((a) => a.value === filters.agent)?.label || ''}`
      : (isAgencia ? 'Propiedades de mi agencia' : 'Mis propiedades');

    exportTableToExcelFile({
      filename: `propiedades_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Propiedades',
      title,
      headers: ['No.', 'Propiedad', 'Tipo propiedad', 'Ubicación', 'Modalidad', 'Precio (USD)', 'Precio (Q)', 'Estado', 'Fecha'],
      rows,
      columnWidths: [6, 45, 16, 28, 14, 14, 14, 14, 12],
    });
  };

  return (
    <Container>
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
        <div>
          <div style={{ fontSize: 'clamp(24px, 3vw, 40px)' }}>{isAgencia ? 'Propiedades de mi agencia' : 'Mis propiedades'}</div>
          <div className="text-muted mb-1" style={{ fontSize: '15px' }}>
            {isAgencia
              ? 'Reporte de las propiedades publicadas por la agencia y sus agentes.'
              : 'Reporte de las propiedades que subiste o que te fueron asignadas.'}
          </div>
        </div>
        <button
          className="btn btn-sm btn-outline-success border-light-subtle"
          style={{ fontSize: '11px', borderRadius: '8px' }}
          onClick={handleExportExcel}
          title="Exportar a Excel"
          disabled={loading || !data || data.summary.totalProperties === 0}
        >
          <i className="fa-regular fa-file-excel me-1"></i>Excel
        </button>
      </div>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
          <Spinner animation="border" variant="dark" />
        </div>
      ) : !data || data.summary.totalProperties === 0 ? (
        <div className="border border-1 rounded-4 p-5 text-center mt-4" style={{ borderColor: '#e4e4e4' }}>
          <i className="fa-solid fa-house" style={{ fontSize: '36px', color: '#ccc' }}></i>
          <div className="fw-bold mt-3" style={{ fontSize: '18px' }}>Aún no hay propiedades</div>
          <div className="text-muted mt-1">Cuando se registren propiedades, aparecerán aquí.</div>
        </div>
      ) : (
        <>
          <style>{`
            .scroll-metricas::-webkit-scrollbar { width: 6px; }
            .scroll-metricas::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
            .scroll-metricas::-webkit-scrollbar-thumb { background: #64748b; border-radius: 3px; }
            .scroll-metricas::-webkit-scrollbar-thumb:hover { background: #475569; }
          `}</style>

          {/* Gráficas */}
          <Row className="g-3 mt-1 mb-2">
            <Col lg={agentChartData.length > 0 ? 6 : 12}>
              <DonutCard title="Propiedades por tipo" data={typeChartData} total={typeChartTotal} />
            </Col>
            {agentChartData.length > 0 && (
              <Col lg={6}>
                <DonutCard title="Propiedades por agente" data={agentChartData} total={agentChartTotal} />
              </Col>
            )}
          </Row>

          {isAgencia && agentTableRows.length > 0 && (
            <ResponsablesTable title="Propiedades por responsable" rows={agentTableRows} />
          )}

          {/* Filtros */}
          <div className="d-flex align-items-center gap-2 flex-wrap mt-5">
            <button
              type="button"
              className="filterButtonTable"
              style={isAllActive ? { backgroundColor: '#000', color: '#fff' } : undefined}
              onClick={resetFilters}
            >
              Todas ({summary.totalProperties})
            </button>

            <ChipDropdown
              icon="fa-solid fa-layer-group"
              label={modeLabel}
              active={filters.mode !== 'all'}
              open={openMenu === 'mode'}
              onToggle={() => setOpenMenu(openMenu === 'mode' ? null : 'mode')}
              onClose={() => setOpenMenu(null)}
            >
              <MenuItem label="Todas" active={filters.mode === 'all'} count={summary.totalProperties} onClick={() => { setFilters((f) => ({ ...f, mode: 'all' })); setOpenMenu(null); }} />
              <MenuItem label="Venta" active={filters.mode === 'Venta'} count={counts.Venta} onClick={() => { setFilters((f) => ({ ...f, mode: 'Venta' })); setOpenMenu(null); }} />
              <MenuItem label="Alquiler" active={filters.mode === 'Alquiler'} count={counts.Alquiler} onClick={() => { setFilters((f) => ({ ...f, mode: 'Alquiler' })); setOpenMenu(null); }} />
            </ChipDropdown>

            <ChipDropdown
              icon="fa-solid fa-filter"
              label={statusLabel}
              active={filters.status !== 'all'}
              open={openMenu === 'status'}
              onToggle={() => setOpenMenu(openMenu === 'status' ? null : 'status')}
              onClose={() => setOpenMenu(null)}
            >
              <MenuItem label="Todos" active={filters.status === 'all'} count={summary.totalProperties} onClick={() => { setFilters((f) => ({ ...f, status: 'all' })); setOpenMenu(null); }} />
              {STATUS_OPTIONS.map((s) => (
                <MenuItem
                  key={s.value}
                  label={s.label}
                  dot={s.bg}
                  active={filters.status === s.value}
                  count={
                    s.value === 'pre-published' ? summary.totalPrePublished
                      : s.value === 'published' ? summary.totalPublished
                        : s.value === 'draft' ? summary.totalDraft
                          : s.value === 'disabled' ? summary.totalDisabled
                            : summary.totalRejected
                  }
                  onClick={() => { setFilters((f) => ({ ...f, status: s.value })); setOpenMenu(null); }}
                />
              ))}
            </ChipDropdown>

            <ChipDropdown
              icon="fa-solid fa-building"
              label={typeLabel}
              active={filters.type !== 'all'}
              open={openMenu === 'type'}
              onToggle={() => setOpenMenu(openMenu === 'type' ? null : 'type')}
              onClose={() => setOpenMenu(null)}
            >
              <MenuItem label="Todos" active={filters.type === 'all'} count={summary.totalProperties} onClick={() => { setFilters((f) => ({ ...f, type: 'all' })); setOpenMenu(null); }} />
              {PROPERTY_TYPES.map((t) => (
                <MenuItem
                  key={t}
                  label={t}
                  active={filters.type === t}
                  count={counts.byType[t] || 0}
                  onClick={() => { setFilters((f) => ({ ...f, type: t })); setOpenMenu(null); }}
                />
              ))}
            </ChipDropdown>

            <ChipDropdown
              icon="fa-solid fa-location-dot"
              label={locationLabel}
              active={locationActive}
              panel
              width={320}
              open={openMenu === 'location'}
              onToggle={() => setOpenMenu(openMenu === 'location' ? null : 'location')}
              onClose={() => setOpenMenu(null)}
            >
              <LocationMenu
                options={locationOptions}
                value={{ department: filters.department, municipality: filters.municipality, zone: filters.zone }}
                onApply={(v) => { setFilters((f) => ({ ...f, ...v })); setOpenMenu(null); }}
                onClear={() => { setFilters((f) => ({ ...f, department: '', municipality: '', zone: '' })); setOpenMenu(null); }}
              />
            </ChipDropdown>

            <ChipDropdown
              icon="fa-solid fa-dollar-sign"
              label={priceLabel}
              active={priceActive}
              panel
              width={300}
              open={openMenu === 'price'}
              onToggle={() => setOpenMenu(openMenu === 'price' ? null : 'price')}
              onClose={() => setOpenMenu(null)}
            >
              <PriceMenu
                maxPrice={maxPrice}
                value={{ priceMin: filters.priceMin, priceMax: filters.priceMax }}
                onApply={(v) => { setFilters((f) => ({ ...f, ...v })); setOpenMenu(null); }}
                onClear={() => { setFilters((f) => ({ ...f, priceMin: 0, priceMax: null })); setOpenMenu(null); }}
              />
            </ChipDropdown>

            {isAgencia && agentOptions.length > 0 && (
              <ChipDropdown
                icon="fa-solid fa-user-tie"
                label={agentLabel}
                active={agentActive}
                width={230}
                open={openMenu === 'agent'}
                onToggle={() => setOpenMenu(openMenu === 'agent' ? null : 'agent')}
                onClose={() => setOpenMenu(null)}
              >
                <MenuItem label="Todos" active={filters.agent === 'all'} onClick={() => { setFilters((f) => ({ ...f, agent: 'all' })); setOpenMenu(null); }} />
                {agentOptions.map((a) => (
                  <MenuItem
                    key={a.value}
                    label={a.label}
                    active={filters.agent === a.value}
                    onClick={() => { setFilters((f) => ({ ...f, agent: a.value })); setOpenMenu(null); }}
                  />
                ))}
              </ChipDropdown>
            )}

            <div className="d-flex align-items-center gap-2 ms-auto">
              <span className="text-muted" style={{ fontSize: '14px' }}>Buscar:</span>
              <input
                type="text"
                className="form-control form-control-sm rounded-pill"
                style={{ maxWidth: '260px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* KPIs como badges */}
          <div className="d-flex flex-wrap gap-2 mt-3">
            <KpiBadge icon="fa-solid fa-house" label="Propiedades" value={summary.totalProperties} color="#026a66" bg="#e6f4f3" />
            <KpiBadge icon="fa-solid fa-circle-check" label="Publicadas" value={summary.totalPublished} color="#198754" bg="#e7f5ed" />
            <KpiBadge icon="fa-solid fa-clock" label="Pendientes" value={summary.totalPrePublished} color="#b8860b" bg="#fff7e0" />
            <KpiBadge icon="fa-solid fa-circle-xmark" label="Rechazadas" value={summary.totalRejected} color="#dc3545" bg="#fdecee" />
          </div>

          {/* Tabla */}
          <div className="w-100 mt-3">
            <table ref={tableRef} className="display nowrap propiedades-table" style={{ width: '100%' }} />
          </div>
        </>
      )}
    </Container>
  );
}

export default ReporteMisPropiedades;
