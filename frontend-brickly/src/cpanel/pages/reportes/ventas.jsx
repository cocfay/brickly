import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Spinner, Alert, Form } from 'react-bootstrap';
import { getSalesReport } from '../../services/reportes';

const CHARGE_STATUS = {
  SUCCEEDED: { label: 'Pagado', variant: 'success' },
  FAILED: { label: 'Fallido', variant: 'danger' },
  PENDING: { label: 'Pendiente', variant: 'warning' },
};

const MONTH_NAMES = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
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

function ReporteVentas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async (f, t) => {
    setLoading(true);
    setError('');
    try {
      const res = await getSalesReport({ from: f, to: t });
      setData(res);
    } catch (e) {
      setError(e.message || 'Error al cargar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load('', '');
  }, []);

  const fmtDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fmtPrice = (n) => `Q${Number(n || 0).toLocaleString('en-US')}`;

  const fmtMonth = (m) => {
    if (!m) return '—';
    const [y, mm] = m.split('-');
    return `${MONTH_NAMES[mm] || mm} ${y}`;
  };

  const applyFilter = () => load(from || '', to || '');

  const summary = data?.summary;
  const maxMonthRevenue = Math.max(0, ...(data?.salesByMonth?.map(m => m.revenue) || [0]));

  return (
    <Container>
      <div style={{ fontSize: 'clamp(24px, 3vw, 40px)' }}>Ventas</div>
      <div className="text-muted mb-1" style={{ fontSize: '15px' }}>
        Reporte de ventas de suscripciones (basado en los cobros registrados).
      </div>

      {/* Filtro por rango de fechas */}
      <div className="d-flex flex-wrap align-items-end gap-2 mt-3 p-3 border border-1 rounded-4" style={{ borderColor: '#e4e4e4', maxWidth: '680px' }}>
        <div>
          <Form.Label className="mb-1" style={{ fontSize: '13px' }}>Desde</Form.Label>
          <Form.Control type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Form.Label className="mb-1" style={{ fontSize: '13px' }}>Hasta</Form.Label>
          <Form.Control type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn btn-dark rounded-pill px-4" onClick={applyFilter} style={{ whiteSpace: 'nowrap' }}>Aplicar</button>
        <button
          className="btn btn-outline-secondary rounded-pill px-4"
          onClick={() => { setFrom(''); setTo(''); load('', ''); }}
          style={{ whiteSpace: 'nowrap' }}
        >
          Limpiar
        </button>
      </div>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
          <Spinner animation="border" variant="dark" />
        </div>
      ) : (
        !data || data.summary.totalCharges === 0 ? (
          <div className="border border-1 rounded-4 p-5 text-center mt-4" style={{ borderColor: '#e4e4e4' }}>
            <i className="fa-solid fa-chart-pie" style={{ fontSize: '36px', color: '#ccc' }}></i>
            <div className="fw-bold mt-3" style={{ fontSize: '18px' }}>Aún no hay cobros registrados</div>
            <div className="text-muted mt-1">
              La colección de cobros (BillingCharge) está vacía. Cuando se procesen pagos de suscripciones
              a través de los webhooks, aparecerán aquí.
            </div>
          </div>
        ) : (
          <>
            {/* KPI */}
            <Row className="g-3 mt-1">
              <KPICard iconClass="fa-solid fa-circle-check" label="Ventas" value={summary.totalSales} note={`${summary.newSales} nuevas · ${summary.renewals} renovaciones`} color="#198754" />
              <KPICard iconClass="fa-solid fa-dollar-sign" label="Ingresos totales" value={fmtPrice(summary.totalRevenue)} note="Pagos exitosos" color="#026a66" />
              <KPICard iconClass="fa-solid fa-circle-xmark" label="Pagos fallidos" value={summary.totalFailed} note={`De ${summary.totalCharges} cobros`} color="#dc3545" />
              <KPICard iconClass="fa-solid fa-ticket" label="Ticket promedio" value={summary.totalSales ? fmtPrice(summary.totalRevenue / summary.totalSales) : 'Q0'} note="Por venta exitosa" color="#0d6efd" />
            </Row>

            <Row className="g-3 mt-2">
              {/* Ventas por plan */}
              <Col lg={6}>
                <div className="border border-1 rounded-4 p-3 p-lg-4 h-100" style={{ borderColor: '#e4e4e4' }}>
                  <div className="mb-2" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Ventas por plan</div>
                  {data.salesByPlan.length === 0 ? (
                    <div className="text-muted">Sin ventas exitosas.</div>
                  ) : (
                    data.salesByPlan.map((row) => (
                      <div key={row.plan} className="d-flex align-items-center justify-content-between py-2 border-bottom">
                        <div className="me-2">{row.plan}</div>
                        <div className="text-end">
                          <div className="fw-bold">{fmtPrice(row.revenue)}</div>
                          <div className="text-muted" style={{ fontSize: '12px' }}>{row.count} venta{row.count === 1 ? '' : 's'}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Col>

              {/* Ventas por mes */}
              <Col lg={6}>
                <div className="border border-1 rounded-4 p-3 p-lg-4 h-100" style={{ borderColor: '#e4e4e4' }}>
                  <div className="mb-2" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Ventas por mes</div>
                  {data.salesByMonth.length === 0 ? (
                    <div className="text-muted">Sin ventas exitosas.</div>
                  ) : (
                    data.salesByMonth.map((row) => (
                      <div key={row.month} className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span style={{ fontSize: '13px' }}>{fmtMonth(row.month)}</span>
                          <span className="text-muted" style={{ fontSize: '13px' }}>{fmtPrice(row.revenue)} · {row.count}</span>
                        </div>
                        <div className="progress" style={{ height: '8px' }}>
                          <div
                            className="progress-bar"
                            style={{ width: `${maxMonthRevenue ? Math.round((row.revenue / maxMonthRevenue) * 100) : 0}%`, backgroundColor: '#026a66' }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Col>
            </Row>

            {/* Detalle de cobros */}
            <div className="border border-1 rounded-4 p-3 p-lg-4 mt-3" style={{ borderColor: '#e4e4e4' }}>
              <div className="mb-2" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                Detalle de cobros ({data.charges.length})
              </div>
              <div className="table-responsive">
                <Table hover size="sm">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th>Plan</th>
                      <th className="text-end" style={{ paddingLeft: '80px' }}>Monto</th>
                      <th>Tipo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.charges.map((c) => {
                      const st = CHARGE_STATUS[c.status] || { label: c.status, variant: 'secondary' };
                      return (
                        <tr key={c._id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(c.chargedAt)}</td>
                          <td>
                            {(c.userName || c.userEmail) ? (
                              <>
                                {c.userName && <div>{c.userName}</div>}
                                {c.userEmail && <div className="text-muted" style={{ fontSize: '12px' }}>{c.userEmail}</div>}
                              </>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>{c.description || c.plan || '—'}</td>
                          <td className="text-end" style={{ paddingLeft: '80px' }}>{c.status === 'SUCCEEDED' ? fmtPrice(c.amount) : <span className="text-muted">{fmtPrice(c.amount)}</span>}</td>
                          <td>
                            {c.isRenewal
                              ? <span className="badge rounded-pill text-bg-light">Renovación</span>
                              : <span className="badge rounded-pill text-bg-dark">Nueva</span>}
                          </td>
                          <td>
                            <span className={`badge rounded-pill text-bg-${st.variant}`}>{st.label}</span>
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

export default ReporteVentas;
