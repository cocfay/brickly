import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Spinner, Alert } from 'react-bootstrap';
import { getFullUser } from '../../../services/authService';
import PlanPricingCards from '../../../components/PlanPricingCards';
import { getCharges, getPlanDetails, CHARGE_STATUS } from '../../services/facturacion';

function Facturacion() {
  const [charges, setCharges] = useState([]);
  const [loadingCharges, setLoadingCharges] = useState(true);
  const [chargesError, setChargesError] = useState('');

  const user = getFullUser();
  const planKey = user?.subscriptionStatus === 'ACTIVE' ? user?.subscriptionPlan : null;
  const plan = getPlanDetails(planKey);
  const expireDate = user?.subscription_expire ? new Date(user.subscription_expire) : null;
  const daysRemaining = expireDate
    ? Math.max(0, Math.ceil((expireDate.getTime() - Date.now()) / 86400000))
    : 0;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getCharges();
        if (!cancelled) setCharges(data);
      } catch (e) {
        if (!cancelled) setChargesError(e.message || 'Error al cargar el historial de cobros.');
      } finally {
        if (!cancelled) setLoadingCharges(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const fmtDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fmtPrice = (n) => `GTQ ${Number(n || 0).toLocaleString('en-US')}`;

  const InfoColumn = ({ iconClass, label, value, note }) => (
    <Col xs={6} sm={6} lg>
      <div className="border border-1 rounded-4 p-3 h-100 d-flex flex-column justify-content-center" style={{ minHeight: '150px' }}>
        <i className={iconClass || 'fa-regular fa-calendar'} style={{ fontSize: '22px', color: '#026a66' }}></i>
        {label && <div className="text-muted mt-2" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>}
        <div className="fw-bold mt-1" style={{ fontSize: 'clamp(20px, 1.6vw, 26px)', lineHeight: 1.2 }}>{value}</div>
        {note && <div className="text-muted mt-2" style={{ fontSize: '13px' }}>{note}</div>}
      </div>
    </Col>
  );

  return (
    <Container>
      <div style={{ fontSize: 'clamp(24px, 3vw, 40px)' }}>Cuenta / Facturación</div>
      <div className="text-muted mb-1" style={{ fontSize: '15px' }}>
        Administra tu plan, pagos, y paquetes destacados.
      </div>

      {/* ===== Tu suscripción actual ===== */}
      <div className="border border-1 rounded-4 p-3 p-lg-4 mt-4" style={{ borderColor: '#e4e4e4' }}>
        <div className="mb-1" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Tu suscripción actual</div>

        {plan ? (
          <Row className="g-3 gy-4 mt-1">
            {/* 1) Plan contratado */}
            <Col xs={12} sm={6} lg>
              <div className="bg-dark text-white rounded-4 p-4 h-100 d-flex flex-column justify-content-center" style={{ minHeight: '150px' }}>
                <div style={{ fontWeight: 'bold', fontSize: 'clamp(22px, 2vw, 30px)', color: plan.color }}>{plan.name}</div>
                <div className="mt-1" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>{plan.period}</div>
                <div className="mt-2" style={{ fontSize: '13px', opacity: 0.85 }}>
                  Incluye {plan.agents ?? 0} {plan.agents === 1 ? 'agente' : 'agentes'} y todas las herramientas para manipular tu agencia.
                </div>
              </div>
            </Col>

            {/* 2) Periodo */}
            <InfoColumn
              iconClass="fa-regular fa-calendar"
              value={plan.period}
              note="Renovación automática"
            />

            {/* 3) Precio */}
            <InfoColumn
              iconClass="fa-solid fa-dollar-sign"
              label="Precio"
              value={fmtPrice(plan.price)}
            />

            {/* 4) Próximo cobro */}
            <InfoColumn
              iconClass="fa-regular fa-calendar"
              label="Próximo cobro"
              value={fmtDate(expireDate)}
              note={`${daysRemaining} días restantes`}
            />

            {/* 5) Fecha de expiración */}
            <InfoColumn
              iconClass="fa-regular fa-calendar"
              label="Fecha de expiración"
              value={fmtDate(expireDate)}
              note="Renovación automática"
            />
          </Row>
        ) : (
          <div className="text-center text-muted py-4">
            <i className="fa-solid fa-circle-info fa-2x mb-2 d-block text-secondary"></i>
            No tienes una suscripción activa. Mejora tu plan para acceder a todos los beneficios.
          </div>
        )}
      </div>

      {/* ===== Historial de cobros ===== */}
      <div className="mt-5">
        <div style={{ fontSize: 'clamp(20px, 2vw, 28px)', fontWeight: 700 }}>Historial de cobros</div>
        <div className="text-muted mb-3">Proveedor: Recurrente</div>

        {loadingCharges ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="dark" />
          </div>
        ) : chargesError ? (
          <Alert variant="danger">{chargesError}</Alert>
        ) : charges.length === 0 ? (
          <div className="text-center text-muted py-5 border rounded-4">
            <i className="fa-solid fa-receipt fa-2x mb-2 d-block text-secondary"></i>
            Aún no hay cobros registrados.
          </div>
        ) : (
          <div className="table-responsive border border-1 rounded-4 overflow-hidden">
            <Table striped hover className="mb-0 align-middle">
              <thead>
                <tr className="text-uppercase" style={{ fontSize: '13px', backgroundColor: '#f5f5f5' }}>
                  <th>Fecha del cobro</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {charges.map((c) => {
                  const status = CHARGE_STATUS[c.status] || { label: c.status || '—', variant: 'secondary' };
                  return (
                    <tr key={c._id || c.paymentId || `${c.plan}-${c.chargedAt}`}>
                      <td>{fmtDate(c.chargedAt)}</td>
                      <td>{c.description || '—'}</td>
                      <td>{fmtPrice(c.amount)}</td>
                      <td>
                        <span className={`badge text-bg-${status.variant} rounded-pill`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </div>

      {/* ===== Mejora tu plan ===== */}
      <div className="mt-5">
        <div style={{ fontSize: 'clamp(20px, 2vw, 28px)', fontWeight: 700 }}>Mejora tu plan</div>
        <div className="text-muted mb-3">Elige el plan que mejor se adapte al crecimiento de tu agencia.</div>
        <PlanPricingCards currentPlan={planKey} />
      </div>
    </Container>
  );
}

export default Facturacion;