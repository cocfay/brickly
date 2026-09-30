import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Table, Spinner, Alert, Form } from 'react-bootstrap';
import { getMyPropertiesReport } from '../../services/reportes';
import { useCurrency } from '../../../context/CurrencyContext';
import { getCurrentUser } from '../../../services/authService';

function KPICard({ iconClass, label, value, note, color }) {
  return (
    <Col xs={12} sm={6} xl={3}>
      <div className="border border-1 rounded-4 p-3 h-100 d-flex flex-column justify-content-center align-items-center text-center" style={{ minHeight: '150px', borderColor: '#e4e4e4' }}>
        <i className={iconClass} style={{ fontSize: '22px', color: color || '#026a66' }}></i>
        <div className="text-muted mt-2" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        <div className="fw-bold mt-1" style={{ fontSize: 'clamp(20px, 1.6vw, 26px)', lineHeight: 1.2 }}>{value}</div>
        {note && <div className="text-muted mt-2" style={{ fontSize: '13px' }}>{note}</div>}
      </div>
    </Col>
  );
}

const STATUS_BADGE = {
  published: { label: 'Publicada', variant: 'success' },
  'pre-published': { label: 'Pendiente', variant: 'warning' },
  draft: { label: 'Borrador', variant: 'secondary' },
  sold: { label: 'Vendida', variant: 'dark' },
  disabled: { label: 'Desactivada', variant: 'secondary' },
  rejected: { label: 'Rechazada', variant: 'danger' },
};

function ReporteMisPropiedades() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currency: currencyMode, changeCurrency } = useCurrency();

  const [statusFilter, setStatusFilter] = useState('todas');

  const isAgencia = getCurrentUser()?.roles?.includes('agencia');

  useEffect(() => {
    setLoading(true);
    setError('');
    getMyPropertiesReport()
      .then(setData)
      .catch((e) => setError(e.message || 'Error al cargar el reporte.'))
      .finally(() => setLoading(false));
  }, []);

  const summary = data?.summary;

  const properties = useMemo(() => {
    const all = data?.properties || [];
    if (statusFilter === 'todas') return all;
    return all.filter((p) => p.status === statusFilter);
  }, [data, statusFilter]);

  const fmtDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fmtPrecio = (p) => {
    const usd = Number(p.priceUSD);
    const q = Number(p.priceQ);
    const gtqActivo = currencyMode === 'GTQ';
    if (gtqActivo) {
      if (Number.isFinite(q) && q > 0) return 'Q' + q.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (Number.isFinite(usd) && usd > 0) return '$' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      if (Number.isFinite(usd) && usd > 0) return '$' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (Number.isFinite(q) && q > 0) return 'Q' + q.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '—';
  };

  const VACIOS = ['ninguno', 'nunguno', 'none', 'n/a', 'na', '-', 'sin datos', 'no aplica'];

  const fmtUbicacion = (p) => {
    const partes = [p.department, p.municipality, p.zone]
      .map((v) => (typeof v === 'string' ? v.trim() : v ?? ''))
      .filter((v) => {
        if (v === '' || v === null || v === undefined) return false;
        return !VACIOS.includes(String(v).toLowerCase());
      })
      .map((v) =>
        String(v)
          .replace(/\s*,\s*ninguno\s*$/i, '')
          .replace(/,\s*ninguno\b/gi, '')
          .trim(),
      )
      .filter(Boolean);
    return partes.join(', ');
  };

  return (
    <Container>
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
        <div>
          <div style={{ fontSize: 'clamp(24px, 3vw, 40px)' }}>{isAgencia ? 'Propiedades de mi agencia' : 'Mis propiedades'}</div>
          <div className="text-muted mb-1" style={{ fontSize: '15px' }}>
            {isAgencia
              ? 'Reporte de las propiedades publicadas por la agencia y sus agentes (propias o asignadas).'
              : 'Reporte de las propiedades que subiste o que te fueron asignadas.'}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 mt-2 mt-lg-0">
          <span className="text-muted" style={{ fontSize: '13px' }}>Moneda</span>
          <Form.Select
            value={currencyMode}
            onChange={(e) => changeCurrency(e.target.value)}
            aria-label="Seleccionar moneda"
            style={{ width: 'auto', fontSize: '14px' }}
          >
            <option value="USD">USD ($)</option>
            <option value="GTQ">GTQ (Q)</option>
          </Form.Select>
        </div>
      </div>

      {/* Filtros */}
      <div className="d-flex flex-wrap align-items-end gap-3 mt-3 p-3 border border-1 rounded-4" style={{ borderColor: '#e4e4e4' }}>
        <div>
          <Form.Label className="mb-1" style={{ fontSize: '13px' }}>Estado</Form.Label>
          <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="published">Publicadas</option>
            <option value="pre-published">Pendientes</option>
            <option value="draft">Borradores</option>
            <option value="sold">Vendidas</option>
            <option value="disabled">Desactivadas</option>
            <option value="rejected">Rechazadas</option>
          </Form.Select>
        </div>
        <div className="text-muted ms-auto" style={{ fontSize: '13px' }}>
          Mostrando {properties.length} de {summary?.totalProperties || 0} propiedades
        </div>
      </div>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
          <Spinner animation="border" variant="dark" />
        </div>
      ) : (
        !data || data.summary.totalProperties === 0 ? (
          <div className="border border-1 rounded-4 p-5 text-center mt-4" style={{ borderColor: '#e4e4e4' }}>
            <i className="fa-solid fa-house" style={{ fontSize: '36px', color: '#ccc' }}></i>
            <div className="fw-bold mt-3" style={{ fontSize: '18px' }}>Aún no hay propiedades</div>
            <div className="text-muted mt-1">
              Cuando se registren propiedades, aparecerán aquí.
            </div>
          </div>
        ) : (
          <>
            {/* KPI globales */}
            <Row className="g-3 mt-1">
              <KPICard iconClass="fa-solid fa-house" label="Propiedades" value={summary.totalProperties} note="En total" color="#026a66" />
              <KPICard iconClass="fa-solid fa-circle-check" label="Publicadas" value={summary.totalPublished} note="Visibles al público" color="#198754" />
              <KPICard iconClass="fa-solid fa-clock" label="Pendientes" value={summary.totalPrePublished} note="En revisión" color="#ffc107" />
              <KPICard iconClass="fa-solid fa-circle-xmark" label="Rechazadas" value={summary.totalRejected} note="Requieren corrección" color="#dc3545" />
            </Row>

            {/* Tabla de propiedades */}
            <div className="border border-1 rounded-4 p-3 p-lg-4 mt-3" style={{ borderColor: '#e4e4e4' }}>
              <div className="mb-2" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                Detalle de propiedades ({properties.length})
              </div>
              <div className="table-responsive">
                <Table hover size="sm">
                  <thead>
                    <tr>
                      <th>Propiedad</th>
                      <th>Tipo</th>
                      <th>Modalidad</th>
                      <th className="text-end">Precio ({currencyMode})</th>
                      <th>Ubicación</th>
                      {isAgencia && <th>Responsable</th>}
                      <th>Estado</th>
                      <th>Publicada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.map((p) => {
                      const st = STATUS_BADGE[p.status] || { label: p.status || '—', variant: 'secondary' };
                      return (
                        <tr key={p.id}>
                          <td className="fw-semibold">{p.title || '—'}</td>
                          <td>{p.type || '—'}</td>
                          <td>{p.mode || '—'}</td>
                          <td className="text-end">{fmtPrecio(p)}</td>
                          <td>{fmtUbicacion(p) || '—'}</td>
                          {isAgencia && (
                            <td>
                              {p.owner ? (
                                <span>
                                  {p.owner.name}
                                  {p.owner.isAgency ? <span className="text-muted" style={{ fontSize: '12px' }}> (agencia)</span> : null}
                                </span>
                              ) : <span className="text-muted">—</span>}
                            </td>
                          )}
                          <td>
                            <span className={`badge rounded-pill text-bg-${st.variant}`}>{st.label}</span>
                          </td>
                          <td>{fmtDate(p.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </div>
          </>
        )
      )}
    </Container>
  );
}

export default ReporteMisPropiedades;