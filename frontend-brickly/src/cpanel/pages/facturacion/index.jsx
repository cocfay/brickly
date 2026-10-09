import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Table,
  Spinner,
  Alert,
  Nav,
  Modal,
  Button,
  Badge,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getFullUser, fetchUserProfile } from '../../../services/authService';
import {
  getCharges,
  getPlansCatalog,
  startFeaturedCheckout,
  CHARGE_STATUS,
} from '../../services/facturacion';
import { getPropiedades } from '../../services/propiedades';
import PlanPricingCards from '../../../components/PlanPricingCards';

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const fmtPrice = (n) => `GTQ ${Number(n || 0).toLocaleString('en-US')}`;

const InfoColumn = ({ iconClass, label, value, note, lg = 2 }) => (
  <Col xs={6} sm={6} lg={lg}>
    <div
      className="rounded-4 p-3 h-100 d-flex flex-column justify-content-center align-items-center text-center"
      style={{ border: '1px solid #e8e8e8', minHeight: '160px' }}
    >
      <i
        className={iconClass || 'fa-regular fa-calendar'}
        style={{ fontSize: '24px', color: '#1a1a1a' }}
      ></i>
      {label && (
        <div className="text-muted mt-3" style={{ fontSize: '14px' }}>
          {label}
        </div>
      )}
      <div
        className="fw-bold mt-1"
        style={{ fontSize: '20px', lineHeight: 1.2, color: '#1a1a1a' }}
      >
        {value}
      </div>
      {note && (
        <div className="text-muted mt-1" style={{ fontSize: '13px' }}>
          {note}
        </div>
      )}
    </div>
  </Col>
);

function Facturacion() {
  const navigate = useNavigate();

  const [user, setUser] = useState(getFullUser());
  const [catalog, setCatalog] = useState(null);
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllCharges, setShowAllCharges] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState(null);
  const [tab, setTab] = useState('agente');
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState('');

  // Selector de propiedad para paquetes de visibilidad de propiedades
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [catRes, chgRes, profRes] = await Promise.allSettled([
        getPlansCatalog(),
        getCharges(),
        fetchUserProfile(),
      ]);
      if (cancelled) return;

      if (catRes.status === 'fulfilled') setCatalog(catRes.value);
      else console.error('Catálogo:', catRes.reason);

      if (chgRes.status === 'fulfilled') setCharges(chgRes.value || []);
      else console.error('Cobros:', chgRes.reason);

      if (profRes.status === 'fulfilled' && profRes.value?.success) {
        setUser(profRes.value.info);
      }

      if (catRes.status === 'rejected' && chgRes.status === 'rejected') {
        setError('No se pudo cargar la información de facturación.');
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const planKey = user?.subscriptionPlan || null;
  const planMeta =
    planKey && catalog?.subscriptionPlans
      ? catalog.subscriptionPlans[planKey]
      : null;
  const plan = planMeta || null;

  const planName = plan?.name || planKey || 'Sin plan';
  const planColor = plan?.color || '#026a66';
  const period = plan?.period || 'Mensual';
  const isAnnual = period === 'Anual';
  const isCustom = plan?.custom === true;
  const durationLabel = isCustom ? 'Personalizado' : period;
  const agentsCount = user?.customMaxProfiles ?? plan?.agents ?? 0;

  const expireDate = user?.subscription_expire
    ? new Date(user.subscription_expire)
    : null;
  const daysRemaining = expireDate
    ? Math.max(0, Math.ceil((expireDate.getTime() - Date.now()) / 86400000))
    : 0;

  const lastSucceededCharge = charges.find((c) => c.status === 'SUCCEEDED');
  const price = plan?.price ?? lastSucceededCharge?.amount ?? null;
  const isActive = user?.subscriptionStatus === 'ACTIVE' && !!planKey;

  const visibleCharges = showAllCharges ? charges : charges.slice(0, 5);
  const featuredPlans = catalog?.featuredPlans || {};
  const featuredList = tab === 'propiedad' ? (featuredPlans.propiedad || []) : (featuredPlans.agente || []);

  const handleManage = () => {
    if (user?.roles?.includes('agencia')) navigate('/cpanel/agencia/suscripcion');
    else navigate('/cpanel/agentes/planes');
  };

  const doCheckout = async (type, id, featuredKey) => {
    setActionError('');
    setActionLoading(featuredKey);
    try {
      const res = await startFeaturedCheckout(type, id, featuredKey);
      const url = res?.checkout_url || res?.url;
      if (!url) throw new Error('No se pudo generar el enlace de pago.');
      window.location.assign(url);
    } catch (e) {
      setActionError(e.message || 'Error al iniciar el pago.');
      setActionLoading(null);
    }
  };

  const loadProperties = async () => {
    setLoadingProperties(true);
    try {
      const res = await getPropiedades({ userId: user?._id, limit: 200 });
      const arr = res?.data?.data || res?.data || [];
      setProperties(Array.isArray(arr) ? arr : []);
    } catch (e) {
      setProperties([]);
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleContratar = (p) => {
    if (p.destination === 'property' || p.audience === 'propiedad') {
      setPendingPlan(p);
      setShowPropertyModal(true);
      loadProperties();
      return;
    }
    doCheckout('user', user?._id, p.key);
  };

  const handleSelectProperty = (property) => {
    if (!pendingPlan) return;
    setShowPropertyModal(false);
    doCheckout('property', property._id, pendingPlan.key);
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="dark" />
      </Container>
    );
  }

  return (
    <Container>
      <div style={{ fontSize: 'clamp(24px, 3vw, 40px)' }}>Cuenta / Facturación</div>
      <div className="text-muted mb-1" style={{ fontSize: '15px' }}>
        Administra tu plan, pagos y paquetes destacados.
      </div>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
      {actionError && (
        <Alert variant="danger" dismissible onClose={() => setActionError('')} className="mt-3">
          {actionError}
        </Alert>
      )}

      {/* ===== Tu suscripción actual ===== */}
      <div
        className="border border-1 rounded-4 mt-4 overflow-hidden"
        style={{ borderColor: '#e4e4e4' }}
      >
        <div
          className="px-3 px-lg-4 py-2"
          style={{ backgroundColor: '#f5f5f5', fontSize: '14px', fontWeight: 600, color: '#444' }}
        >
          Tu suscripción actual
        </div>

        <div className="p-3 p-lg-4">
        {planKey ? (
          <Row className="g-3 gy-3 align-items-stretch">
            <Col xs={12} lg={4}>
              <div
                className="text-white rounded-4 p-3 h-100 d-flex flex-column justify-content-center"
                style={{ backgroundColor: '#15161a', minHeight: '160px' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <span
                    className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: '42px',
                      height: '42px',
                      backgroundColor: planColor,
                    }}
                  >
                    <i className="fa-solid fa-gem" style={{ color: '#fff', fontSize: '18px' }}></i>
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 'clamp(20px, 1.8vw, 26px)',
                      color: planColor,
                      fontFamily: 'AppleGaramond, serif',
                      lineHeight: 1.1,
                    }}
                  >
                    {planName}
                  </span>
                </div>
                <span
                  className="align-self-start mt-2"
                  style={{
                    backgroundColor: '#3a3b40',
                    color: '#e6e6e6',
                    fontSize: '12px',
                    padding: '2px 12px',
                    borderRadius: '20px',
                  }}
                >
                  {durationLabel}
                </span>
                <div className="mt-2" style={{ fontSize: '13px', color: '#d9d9d9', lineHeight: 1.35 }}>
                  Incluye {agentsCount} {agentsCount === 1 ? 'agente' : 'agentes'} y todas las
                  herramientas para impulsar tu agencia.
                </div>
                <button
                  className="btn mt-3 align-self-center"
                  style={{
                    width: '85%',
                    border: '1px solid #8a8a8a',
                    color: '#fff',
                    backgroundColor: 'transparent',
                    fontSize: '14px',
                    borderRadius: '8px',
                  }}
                  onClick={handleManage}
                >
                  Gestionar suscripción
                </button>
              </div>
            </Col>

            <InfoColumn
              iconClass="fa-regular fa-calendar"
              label="Duración"
              value={durationLabel}
              note={isCustom ? null : 'Renovación automática'}
              lg={isCustom ? 4 : 2}
            />
            {!isCustom && (
              <InfoColumn
                iconClass="fa-solid fa-circle-dollar-to-slot"
                label="Precio"
                value={price != null ? fmtPrice(price) : '—'}
                note={isAnnual ? 'Por año' : 'Por mes'}
              />
            )}
            {!isCustom && (
              <InfoColumn
                iconClass="fa-regular fa-calendar"
                label="Próximo cobro"
                value={fmtDate(expireDate)}
                note={`En ${daysRemaining} días`}
              />
            )}
            <InfoColumn
              iconClass="fa-regular fa-clock"
              label="Fecha de expiración"
              value={fmtDate(expireDate)}
              note={isCustom ? null : (isActive ? 'Se renovará automáticamente' : 'Suscripción inactiva')}
              lg={isCustom ? 4 : 2}
            />
          </Row>
        ) : (
          <div className="text-center text-muted py-5">
            <i className="fa-solid fa-circle-info fa-2x mb-2 d-block text-secondary"></i>
            No tienes una suscripción activa. Mejora tu plan para acceder a todos los
            beneficios.
            <div className="mt-3">
              <Button variant="dark" className="rounded-pill px-4" onClick={() => navigate('/precios')}>
                Ver planes
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* ===== Historial + Paquetes destacados ===== */}
      <Row className="g-4 mt-1">
        {/* Historial de cobros */}
        <Col xs={12} lg={7}>
          <div
            className="border border-1 rounded-4 p-3 p-lg-4 h-100"
            style={{ borderColor: '#e4e4e4' }}
          >
            <div style={{ fontSize: 'clamp(18px, 1.6vw, 22px)', fontWeight: 700 }}>
              Historial de cobros automáticos
            </div>
            <div className="text-muted mb-3">
              Proveedor: <span style={{ color: '#026a66' }}>Recurrente</span>
            </div>

            {charges.length === 0 ? (
              <div className="text-center text-muted py-5">
                <i className="fa-solid fa-receipt fa-2x mb-2 d-block text-secondary"></i>
                Aún no hay cobros registrados.
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <Table striped hover className="mb-0 align-middle">
                    <thead>
                      <tr
                        className="text-uppercase"
                        style={{ fontSize: '12px', backgroundColor: '#f5f5f5' }}
                      >
                        <th>Fecha</th>
                        <th>Descripción</th>
                        <th>Monto</th>
                        <th>Estado</th>
                        <th className="text-center">Factura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCharges.map((c) => {
                        const status = CHARGE_STATUS[c.status] || {
                          label: c.status || '—',
                          variant: 'secondary',
                        };
                        return (
                          <tr key={c._id || c.paymentId || `${c.plan}-${c.chargedAt}`}>
                            <td>{fmtDate(c.chargedAt)}</td>
                            <td>{c.description || '—'}</td>
                            <td>{fmtPrice(c.amount)}</td>
                            <td>
                              <Badge bg={status.variant} className="rounded-pill">
                                {status.label}
                              </Badge>
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-link p-0 text-decoration-none"
                                style={{ fontSize: '14px' }}
                                onClick={() => setSelectedCharge(c)}
                              >
                                <i className="fa-regular fa-file-lines me-1"></i>Ver
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>

                {charges.length > 5 && (
                  <div className="text-center mt-3">
                    <button
                      className="btn btn-link text-decoration-none"
                      style={{ color: '#026a66' }}
                      onClick={() => setShowAllCharges((v) => !v)}
                    >
                      {showAllCharges ? 'Ver menos' : 'Ver todos los cobros'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </Col>

        {/* Paquetes destacados */}
        <Col xs={12} lg={5}>
          <div
            className="border border-1 rounded-4 p-3 p-lg-4 h-100"
            style={{ borderColor: '#e4e4e4' }}
          >
            <div style={{ fontSize: 'clamp(18px, 1.6vw, 22px)', fontWeight: 700 }}>
              Paquetes destacados
            </div>
            <div className="text-muted mb-3">
              Potencia tu visibilidad con nuestros paquetes.
            </div>

            <Nav
              variant="underline"
              activeKey={tab}
              onSelect={(k) => setTab(k)}
              className="mb-2"
            >
              <Nav.Item>
                <Nav.Link eventKey="agente">Agentes</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="propiedad">Propiedades</Nav.Link>
              </Nav.Item>
            </Nav>

            {featuredList.length === 0 ? (
              <div className="text-center text-muted py-4">Sin paquetes disponibles.</div>
            ) : (
              <div className="d-flex flex-column">
                {featuredList.map((p) => (
                  <div
                    key={p.key}
                    className="d-flex align-items-center gap-3 py-3 border-bottom"
                  >
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{
                        width: '42px',
                        height: '42px',
                        backgroundColor: p.color || '#026a66',
                        color: '#fff',
                      }}
                    >
                      <i
                        className={
                          p.audience === 'propiedad'
                            ? 'fa-solid fa-house'
                            : 'fa-solid fa-user-tie'
                        }
                      ></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-semibold">{p.name}</div>
                      <div className="text-muted" style={{ fontSize: '13px' }}>
                        {p.description}
                      </div>
                      <div className="fw-bold mt-1" style={{ fontSize: '14px' }}>
                        {fmtPrice(p.price)}{' '}
                        <span className="text-muted fw-normal" style={{ fontSize: '12px' }}>
                          / {p.durationDays} días
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="dark"
                      className="rounded-pill px-3"
                      disabled={actionLoading === p.key}
                      onClick={() => handleContratar(p)}
                    >
                      {actionLoading === p.key ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        'Contratar'
                      )}
                    </Button>
                  </div>
                ))}

                <div className="text-center mt-3">
                  <button
                    className="btn btn-link text-decoration-none"
                    style={{ color: '#026a66' }}
                    onClick={() => navigate('/cpanel/agentes/planes')}
                  >
                    Ver todos los paquetes para agentes
                  </button>
                </div>
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* ===== Mejora tu plan ===== */}
      <div className="mt-5">
        <div style={{ fontSize: 'clamp(20px, 2vw, 28px)', fontWeight: 700 }}>Mejora tu plan</div>
        <div className="text-muted mb-3">Elige el plan que mejor se adapte al crecimiento de tu agencia.</div>
        <PlanPricingCards currentPlan={planKey} />
      </div>

      {/* Modal detalle de cobro */}
      <Modal show={!!selectedCharge} onHide={() => setSelectedCharge(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Detalle del cobro</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCharge && (
            <div className="d-flex flex-column gap-2" style={{ fontSize: '15px' }}>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Fecha</span>
                <span className="fw-semibold">{fmtDate(selectedCharge.chargedAt)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Descripción</span>
                <span className="fw-semibold text-end">{selectedCharge.description || '—'}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Monto</span>
                <span className="fw-semibold">{fmtPrice(selectedCharge.amount)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Estado</span>
                <span className="fw-semibold">
                  {(CHARGE_STATUS[selectedCharge.status] || {}).label || selectedCharge.status}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Tipo</span>
                <span className="fw-semibold">
                  {selectedCharge.isRenewal ? 'Renovación' : 'Primer cobro'}
                </span>
              </div>
              {selectedCharge.paymentId && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Referencia</span>
                  <span className="fw-semibold text-end" style={{ wordBreak: 'break-all' }}>
                    {selectedCharge.paymentId}
                  </span>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedCharge(null)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal selección de propiedad */}
      <Modal
        show={showPropertyModal}
        onHide={() => setShowPropertyModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Selecciona una propiedad a destacar</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingProperties ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="dark" />
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center text-muted py-4">
              No tienes propiedades disponibles para destacar.
            </div>
          ) : (
            <div className="d-flex flex-column">
              {properties.map((p) => (
                <div
                  key={p._id}
                  className="d-flex align-items-center justify-content-between gap-3 py-2 border-bottom"
                >
                  <div className="text-truncate">
                    <div className="fw-semibold text-truncate">
                      {p.market?.title || 'Propiedad sin título'}
                    </div>
                    <div className="text-muted" style={{ fontSize: '13px' }}>
                      {p.status || ''}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="dark"
                    className="rounded-pill px-3 flex-shrink-0"
                    disabled={actionLoading === (pendingPlan && pendingPlan.key)}
                    onClick={() => handleSelectProperty(p)}
                  >
                    Destacar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPropertyModal(false)}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Facturacion;
