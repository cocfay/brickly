import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Spinner, Alert, Form } from 'react-bootstrap';
import { getProjectsByDeveloperReport } from '../../services/reportes';
import { useCurrency } from '../../../context/CurrencyContext';

const MODE_LABELS = {
  Venta: 'Venta',
  Alquiler: 'Alquiler',
};

function KPICard({ iconClass, label, value, note, color }) {
  return (
    <Col xs={12} sm={6} xl={4}>
      <div className="border border-1 rounded-4 p-3 h-100 d-flex flex-column justify-content-center align-items-center text-center" style={{ minHeight: '150px', borderColor: '#e4e4e4' }}>
        <i className={iconClass} style={{ fontSize: '22px', color: color || '#026a66' }}></i>
        <div className="text-muted mt-2" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        <div className="fw-bold mt-1" style={{ fontSize: 'clamp(20px, 1.6vw, 26px)', lineHeight: 1.2 }}>{value}</div>
        {note && <div className="text-muted mt-2" style={{ fontSize: '13px' }}>{note}</div>}
      </div>
    </Col>
  );
}

function ReporteProyectos() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currency: currencyMode, changeCurrency } = useCurrency();

  useEffect(() => {
    setLoading(true);
    setError('');
    getProjectsByDeveloperReport()
      .then(setData)
      .catch((e) => setError(e.message || 'Error al cargar el reporte.'))
      .finally(() => setLoading(false));
  }, []);

  const fmtDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fmtQ = (n) => {
    const num = Number(n);
    if (Number.isNaN(num) || num <= 0) return '—';
    return 'Q' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtUSD = (n) => {
    const num = Number(n);
    if (Number.isNaN(num) || num <= 0) return '—';
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtPrecio = (p) => {
    const usd = Number(p.priceFromUSD);
    const q = Number(p.priceFromQ);
    const gtqActivo = currencyMode === 'GTQ';
    if (gtqActivo) {
      if (Number.isFinite(q) && q > 0) return fmtQ(q);
      if (Number.isFinite(usd) && usd > 0) return fmtUSD(usd);
    } else {
      if (Number.isFinite(usd) && usd > 0) return fmtUSD(usd);
      if (Number.isFinite(q) && q > 0) return fmtQ(q);
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

  const summary = data?.summary;

  return (
    <Container>
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
        <div>
          <div style={{ fontSize: 'clamp(24px, 3vw, 40px)' }}>Proyectos por desarrolladora</div>
          <div className="text-muted mb-1" style={{ fontSize: '15px' }}>
            Reporte de proyectos inmobiliarios agrupados por la desarrolladora que los publicó.
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

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
          <Spinner animation="border" variant="dark" />
        </div>
      ) : (
        !data || data.summary.totalProjects === 0 ? (
          <div className="border border-1 rounded-4 p-5 text-center mt-4" style={{ borderColor: '#e4e4e4' }}>
            <i className="fa-solid fa-building" style={{ fontSize: '36px', color: '#ccc' }}></i>
            <div className="fw-bold mt-3" style={{ fontSize: '18px' }}>Aún no hay proyectos registrados</div>
            <div className="text-muted mt-1">
              La colección de proyectos está vacía. Cuando se publiquen proyectos en el cpanel, aparecerán aquí.
            </div>
          </div>
        ) : (
          <>
            <Row className="g-3 mt-1">
              <KPICard iconClass="fa-solid fa-building" label="Proyectos" value={summary.totalProjects} note="Publicados" color="#026a66" />
              <KPICard iconClass="fa-solid fa-people-group" label="Desarrolladoras" value={summary.totalDevelopers} note="Con proyectos" color="#198754" />
              <KPICard iconClass="fa-solid fa-boxes-stacked" label="Unidades" value={summary.totalUnidades} note="Suma de unidades" color="#0d6efd" />
            </Row>

            {(data.groups || []).map((g) => (
              <div key={g.desarrolladora} className="border border-1 rounded-4 p-3 p-lg-4 mt-3" style={{ borderColor: '#e4e4e4' }}>
                <div className="d-flex flex-wrap align-items-center justify-content-between mb-2 gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold" style={{ fontSize: '16px' }}>{g.desarrolladora}</span>
                    {g.isSinDesarrolladora && (
                      <span className="badge rounded-pill text-bg-secondary">Sin asignar</span>
                    )}
                  </div>
                  <div className="text-muted" style={{ fontSize: '13px' }}>
                    <span className="fw-bold">{g.total}</span> proyecto{g.total === 1 ? '' : 's'}
                    {g.totalUnidades > 0 && <span> · <span className="fw-bold">{g.totalUnidades}</span> unidades</span>}
                  </div>
                </div>
                <div className="table-responsive">
                  <Table hover size="sm">
                    <thead>
                      <tr>
                        <th>Proyecto</th>
                        <th>Tipo</th>
                        <th>Modalidad</th>
                        <th>Situacional</th>
                        <th className="text-end">Unidades</th>
                        <th className="text-end">Precio desde ({currencyMode})</th>
                        <th>Ubicación</th>
                        <th>Fecha entrega</th>
                        <th>Publicado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.projects.map((p) => (
                        <tr key={p.id}>
                          <td className="fw-semibold">{p.title || '—'}</td>
                          <td>{p.type || '—'}</td>
                          <td>{MODE_LABELS[p.mode] || p.mode || '—'}</td>
                          <td>{p.situacional || '—'}</td>
                          <td className="text-end">{p.unidades ?? '—'}</td>
                          <td className="text-end">{fmtPrecio(p)}</td>
                          <td>{fmtUbicacion(p) || '—'}</td>
                          <td>{p.fechaEntrega || '—'}</td>
                          <td>{fmtDate(p.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            ))}
          </>
        )
      )}
    </Container>
  );
}

export default ReporteProyectos;