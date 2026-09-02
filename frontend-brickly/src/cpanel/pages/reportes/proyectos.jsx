import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Spinner, Alert } from 'react-bootstrap';
import { getProjectsByDeveloperReport } from '../../services/reportes';

const MODE_LABELS = {
  Venta: 'Venta',
  Alquiler: 'Alquiler',
};

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

function ReporteProyectos() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const fmtUbicacion = (p) =>
    [p.department, p.municipality, p.zone].filter(Boolean).join(', ');

  const summary = data?.summary;

  return (
    <Container>
      <div style={{ fontSize: 'clamp(24px, 3vw, 40px)' }}>Proyectos por desarrolladora</div>
      <div className="text-muted mb-1" style={{ fontSize: '15px' }}>
        Reporte de proyectos inmobiliarios agrupados por la desarrolladora que los publicó.
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
              <KPICard iconClass="fa-solid fa-circle-exclamation" label="Sin desarrolladora" value={summary.totalSinDesarrolladora} note="Sin nombre de desarrolladora" color="#dc3545" />
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
                        <th className="text-end">Precio desde</th>
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
                          <td className="text-end">{fmtQ(p.priceFromQ)} <span className="text-muted">/</span> {fmtUSD(p.priceFromUSD)}</td>
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