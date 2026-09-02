import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Table, Spinner, Alert, Form } from 'react-bootstrap';
import { getAgenciesReport } from '../../services/reportes';

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
  ACTIVE: { label: 'Activa', variant: 'success' },
  PAST_DUE: { label: 'Vencida', variant: 'warning' },
  CANCELED: { label: 'Cancelada', variant: 'danger' },
  INACTIVE: { label: 'Inactiva', variant: 'secondary' },
};

function ReporteAgencias() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('todas');
  const [soloDestacadas, setSoloDestacadas] = useState(false);
  const [soloVerificadas, setSoloVerificadas] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    getAgenciesReport()
      .then(setData)
      .catch((e) => setError(e.message || 'Error al cargar el reporte.'))
      .finally(() => setLoading(false));
  }, []);

  const summary = data?.summary;

  const agencies = useMemo(() => {
    const all = data?.agencies || [];
    return all.filter((a) => {
      if (statusFilter === 'activas' && a.subscriptionStatus !== 'ACTIVE') return false;
      if (statusFilter === 'inactivas' && a.subscriptionStatus === 'ACTIVE') return false;
      if (soloDestacadas && !a.featured) return false;
      if (soloVerificadas && !a.verified) return false;
      return true;
    });
  }, [data, statusFilter, soloDestacadas, soloVerificadas]);

  const counts = useMemo(() => agencies.reduce((acc, a) => {
    acc.totalProperties += a.totalProperties;
    acc.totalPublished += a.totalPublished;
    acc.totalAgents += a.agentsCount;
    acc.totalLeads += a.leadsCount;
    return acc;
  }, { totalProperties: 0, totalPublished: 0, totalAgents: 0, totalLeads: 0 }), [agencies]);

  return (
    <Container>
      <div style={{ fontSize: 'clamp(24px, 3vw, 40px)' }}>Agencias</div>
      <div className="text-muted mb-1" style={{ fontSize: '15px' }}>
        Reporte de agencias asociadas a Brickly con sus propiedades, agentes y leads.
      </div>

      {/* Filtros */}
      <div className="d-flex flex-wrap align-items-end gap-3 mt-3 p-3 border border-1 rounded-4" style={{ borderColor: '#e4e4e4' }}>
        <div>
          <Form.Label className="mb-1" style={{ fontSize: '13px' }}>Estado de suscripción</Form.Label>
          <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="activas">Solo activas</option>
            <option value="inactivas">Inactivas / vencidas</option>
          </Form.Select>
        </div>
        <Form.Check
          type="switch"
          id="solo-destacadas"
          label="Solo destacadas"
          checked={soloDestacadas}
          onChange={(e) => setSoloDestacadas(e.target.checked)}
          className="mb-2"
        />
        <Form.Check
          type="switch"
          id="solo-verificadas"
          label="Solo verificadas"
          checked={soloVerificadas}
          onChange={(e) => setSoloVerificadas(e.target.checked)}
          className="mb-2"
        />
        <div className="text-muted ms-auto" style={{ fontSize: '13px' }}>
          Mostrando {agencies.length} de {summary?.totalAgencies || 0} agencias
        </div>
      </div>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
          <Spinner animation="border" variant="dark" />
        </div>
      ) : (
        !data || data.summary.totalAgencies === 0 ? (
          <div className="border border-1 rounded-4 p-5 text-center mt-4" style={{ borderColor: '#e4e4e4' }}>
            <i className="fa-solid fa-people-group" style={{ fontSize: '36px', color: '#ccc' }}></i>
            <div className="fw-bold mt-3" style={{ fontSize: '18px' }}>Aún no hay agencias registradas</div>
            <div className="text-muted mt-1">
              Cuando se registren agencias en la plataforma, aparecerán aquí.
            </div>
          </div>
        ) : (
          <>
            {/* KPI globales */}
            <Row className="g-3 mt-1">
              <KPICard iconClass="fa-solid fa-people-group" label="Agencias" value={summary.totalAgencies} note={`${summary.totalActive} con suscripción activa`} color="#026a66" />
              <KPICard iconClass="fa-solid fa-house" label="Propiedades" value={summary.totalProperties} note={`${summary.totalPublished} publicadas`} color="#198754" />
              <KPICard iconClass="fa-solid fa-user-tie" label="Agentes" value={summary.totalAgents} note="Sumados todos los planes" color="#0d6efd" />
              <KPICard iconClass="fa-solid fa-star" label="Destacadas" value={summary.totalFeatured} note={`${summary.totalVerified} verificadas`} color="#d63384" />
            </Row>

            {/* Tabla de agencias */}
            <div className="border border-1 rounded-4 p-3 p-lg-4 mt-3" style={{ borderColor: '#e4e4e4' }}>
              <div className="d-flex flex-wrap align-items-center justify-content-between mb-2">
                <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                  Detalle de agencias ({agencies.length})
                </div>
                <div className="text-muted" style={{ fontSize: '13px' }}>
                  Propiedades: {counts.totalProperties} · Publicadas: {counts.totalPublished} · Agentes: {counts.totalAgents} · Leads: {counts.totalLeads}
                </div>
              </div>
              <div className="table-responsive">
                <Table hover size="sm">
                  <thead>
                    <tr>
                      <th>Agencia</th>
                      <th>Suscripción</th>
                      <th className="text-end">Propiedades</th>
                      <th className="text-end">Publicadas</th>
                      <th className="text-end">Agentes</th>
                      <th className="text-end">Proyectos</th>
                      <th className="text-end">Leads</th>
                      <th>Señal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agencies.map((a) => {
                      const st = STATUS_BADGE[a.subscriptionStatus] || { label: a.subscriptionStatus, variant: 'secondary' };
                      return (
                        <tr key={a.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {a.avatar && (
                                <img
                                  src={a.avatar}
                                  alt=""
                                  width="32"
                                  height="32"
                                  className="rounded-circle object-fit-cover"
                                  style={{ flexShrink: 0 }}
                                />
                              )}
                              <div>
                                <div className="fw-semibold">{a.name || '—'}</div>
                                <div className="text-muted" style={{ fontSize: '12px' }}>{a.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>{a.subscriptionPlan || <span className="text-muted">Sin plan</span>}</div>
                            <span className={`badge rounded-pill text-bg-${st.variant}`}>{st.label}</span>
                          </td>
                          <td className="text-end">{a.totalProperties}</td>
                          <td className="text-end">{a.totalPublished}</td>
                          <td className="text-end">{a.agentsCount}</td>
                          <td className="text-end">{a.projectsCount}</td>
                          <td className="text-end">{a.leadsCount}</td>
                          <td>
                            <div className="d-flex gap-1">
                              {a.featured && <span className="badge rounded-pill text-bg-dark">Destacada</span>}
                              {a.verified && <span className="badge rounded-pill text-bg-primary">Verificada</span>}
                              {!a.featured && !a.verified && <span className="badge rounded-pill text-bg-light">{a.clicks} clics</span>}
                            </div>
                          </td>
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

export default ReporteAgencias;