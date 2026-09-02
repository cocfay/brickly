import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Table, Spinner, Alert, Form } from 'react-bootstrap';
import { getAgentsReport } from '../../services/reportes';

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

function ReporteAgentes() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [agenciaFilter, setAgenciaFilter] = useState('todas');
  const [soloEnabled, setSoloEnabled] = useState(false);
  const [soloConProps, setSoloConProps] = useState(false);
  const [soloConLeads, setSoloConLeads] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    getAgentsReport()
      .then(setData)
      .catch((e) => setError(e.message || 'Error al cargar el reporte.'))
      .finally(() => setLoading(false));
  }, []);

  const summary = data?.summary;
  const agencies = data?.agencies || [];

  const filtered = useMemo(() => {
    const all = data?.agents || [];
    return all.filter((a) => {
      if (agenciaFilter !== 'todas' && (a.agency?.name || '') !== agenciaFilter) return false;
      if (soloEnabled && !a.isEnabled) return false;
      if (soloConProps && a.totalProperties === 0) return false;
      if (soloConLeads && a.leadsCount === 0) return false;
      return true;
    });
  }, [data, agenciaFilter, soloEnabled, soloConProps, soloConLeads]);

  return (
    <Container>
      <div style={{ fontSize: 'clamp(24px, 3vw, 40px)' }}>Agentes</div>
      <div className="text-muted mb-1" style={{ fontSize: '15px' }}>
        Reporte de agentes inmobiliarios con sus propiedades, leads y actividad.
      </div>

      {/* Filtros */}
      <div className="d-flex flex-wrap align-items-end gap-3 mt-3 p-3 border border-1 rounded-4" style={{ borderColor: '#e4e4e4' }}>
        <div>
          <Form.Label className="mb-1" style={{ fontSize: '13px' }}>Agencia</Form.Label>
          <Form.Select value={agenciaFilter} onChange={(e) => setAgenciaFilter(e.target.value)}>
            <option value="todas">Todas las agencias</option>
            <option value="">Sin agencia</option>
            {agencies.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Form.Select>
        </div>
        <Form.Check
          type="switch"
          id="solo-enabled"
          label="Solo activos"
          checked={soloEnabled}
          onChange={(e) => setSoloEnabled(e.target.checked)}
          className="mb-2"
        />
        <Form.Check
          type="switch"
          id="solo-con-props"
          label="Con propiedades"
          checked={soloConProps}
          onChange={(e) => setSoloConProps(e.target.checked)}
          className="mb-2"
        />
        <Form.Check
          type="switch"
          id="solo-con-leads"
          label="Con leads"
          checked={soloConLeads}
          onChange={(e) => setSoloConLeads(e.target.checked)}
          className="mb-2"
        />
        <div className="text-muted ms-auto" style={{ fontSize: '13px' }}>
          Mostrando {filtered.length} de {summary?.totalAgents || 0} agentes
        </div>
      </div>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
          <Spinner animation="border" variant="dark" />
        </div>
      ) : (
        !data || data.summary.totalAgents === 0 ? (
          <div className="border border-1 rounded-4 p-5 text-center mt-4" style={{ borderColor: '#e4e4e4' }}>
            <i className="fa-solid fa-user-tie" style={{ fontSize: '36px', color: '#ccc' }}></i>
            <div className="fw-bold mt-3" style={{ fontSize: '18px' }}>Aún no hay agentes registrados</div>
            <div className="text-muted mt-1">
              Cuando las agencias registren agentes, aparecerán aquí.
            </div>
          </div>
        ) : (
          <>
            <Row className="g-3 mt-1">
              <KPICard iconClass="fa-solid fa-user-tie" label="Agentes" value={summary.totalAgents} note={`${summary.totalEnabled} activos`} color="#026a66" />
              <KPICard iconClass="fa-solid fa-house" label="Propiedades" value={summary.totalProperties} note={`${summary.totalWithProperties} agentes con prop.`} color="#198754" />
              <KPICard iconClass="fa-solid fa-envelope" label="Leads" value={summary.totalLeads} note={`${summary.totalWithLeads} agentes con leads`} color="#0d6efd" />
              <KPICard iconClass="fa-solid fa-star" label="Verificados" value={summary.totalVerified} note={`${summary.totalFeatured} destacados`} color="#d63384" />
            </Row>

            <div className="border border-1 rounded-4 p-3 p-lg-4 mt-3" style={{ borderColor: '#e4e4e4' }}>
              <div className="mb-2" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                Detalle de agentes ({filtered.length})
              </div>
              <div className="table-responsive">
                <Table hover size="sm">
                  <thead>
                    <tr>
                      <th>Agente</th>
                      <th>Agencia</th>
                      <th>Suscripción</th>
                      <th className="text-end">Propiedades</th>
                      <th className="text-end">Leads</th>
                      <th className="text-end">Clics</th>
                      <th className="text-end">Reseñas</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
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
                        <td>{a.agency?.name || <span className="text-muted">Sin agencia</span>}</td>
                        <td>
                          <div style={{ fontSize: '13px' }}>{a.subscriptionPlan || <span className="text-muted">—</span>}</div>
                          <span className={`badge rounded-pill text-bg-${a.subscriptionStatus === 'ACTIVE' ? 'success' : a.subscriptionStatus === 'CANCELED' ? 'danger' : 'secondary'}`}>
                            {a.subscriptionStatus === 'ACTIVE' ? 'Activa' : a.subscriptionStatus || 'INACTIVE'}
                          </span>
                        </td>
                        <td className="text-end">
                          {a.totalProperties > 0 ? (
                            <span>{a.totalProperties} <span className="text-muted">({a.totalPublished} pub)</span></span>
                          ) : <span className="text-muted">0</span>}
                        </td>
                        <td className="text-end">{a.leadsCount > 0 ? <span className="fw-semibold">{a.leadsCount}</span> : <span className="text-muted">0</span>}</td>
                        <td className="text-end">{a.clicks}</td>
                        <td className="text-end">
                          {a.ratingCount > 0 ? (
                            <span><i className="fa-solid fa-star" style={{ color: '#f59e0b', fontSize: '11px' }}></i> {a.ratingAverage.toFixed(1)} <span className="text-muted">({a.ratingCount})</span></span>
                          ) : <span className="text-muted">—</span>}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            {a.verified && <span className="badge rounded-pill text-bg-primary">Verificado</span>}
                            {!a.isEnabled && <span className="badge rounded-pill text-bg-secondary">Inactivo</span>}
                            {!a.verified && !a.isEnabled && a.totalProperties === 0 && a.leadsCount === 0 && <span className="badge rounded-pill text-bg-light">Sin actividad</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
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

export default ReporteAgentes;