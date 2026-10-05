import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Container, Row, Col, Spinner, Alert, Form } from 'react-bootstrap';
import { getMyAgencyAgentsReport } from '../../services/reportes';
import { exportTableToExcelFile } from '../../services/exportService';
import { API_URL } from '../../../services/authService';
import $ from 'jquery';
import 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import 'datatables.net-responsive-dt';
import 'datatables.net-responsive-dt/css/responsive.dataTables.css';
import espanol from 'datatables.net-plugins/i18n/es-ES.mjs';

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

// Misma construcción de URL de avatar que cpanel/agentes (funciona en producción).
const avatarUrl = (avatar) =>
  avatar && avatar !== '' ? API_URL + avatar.replace('/uploads', '') : '';

function ReporteMisAgentes() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [soloEnabled, setSoloEnabled] = useState(false);
  const [soloConProps, setSoloConProps] = useState(false);
  const [soloConLeads, setSoloConLeads] = useState(false);

  const tableRef = useRef(null);
  const dataTableRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    getMyAgencyAgentsReport()
      .then(setData)
      .catch((e) => setError(e.message || 'Error al cargar el reporte.'))
      .finally(() => setLoading(false));
  }, []);

  const summary = data?.summary;

  const agents = useMemo(() => {
    const all = data?.agents || [];
    return all.filter((a) => {
      if (soloEnabled && !a.isEnabled) return false;
      if (soloConProps && a.totalProperties === 0) return false;
      if (soloConLeads && a.leadsCount === 0) return false;
      return true;
    });
  }, [data, soloEnabled, soloConProps, soloConLeads]);

  const handleExportExcel = () => {
    const dt = dataTableRef.current;
    const source = dt ? dt.rows({ search: 'applied' }).data().toArray() : agents;

    const rows = source.map((a) => [
      a.name || '—',
      a.email || '',
      a.subscriptionPlan || '',
      a.subscriptionStatus === 'ACTIVE' ? 'Activa' : (a.subscriptionStatus || 'INACTIVE'),
      a.totalProperties ?? 0,
      a.totalPublished ?? 0,
      a.assignedProperties ?? 0,
      a.leadsCount ?? 0,
      a.clicks ?? 0,
      a.ratingCount > 0 ? Number(a.ratingAverage).toFixed(1) : '',
      a.isEnabled ? 'Activo' : 'Inactivo',
    ]);

    exportTableToExcelFile({
      filename: `agentes_agencia_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Agentes',
      title: 'Agentes de mi agencia',
      headers: [
        'Agente',
        'Correo',
        'Plan',
        'Suscripción',
        'Propiedades',
        'Publicadas',
        'Asignadas',
        'Leads',
        'Clics',
        'Calificación',
        'Estado',
      ],
      rows,
      columnWidths: [28, 32, 18, 14, 13, 12, 12, 10, 10, 13, 12],
    });
  };

  useEffect(() => {
    if (loading || !tableRef.current) return;

    if (dataTableRef.current) {
      dataTableRef.current.destroy();
      dataTableRef.current = null;
    }

    dataTableRef.current = $(tableRef.current).DataTable({
      language: espanol,
      responsive: true,
      lengthChange: false,
      pageLength: 10,
      data: agents,
      columns: [
        {
          title: 'Agente',
          data: null,
          render: (row) => {
            const url = avatarUrl(row.avatar);
            const img = url
              ? `<img src="${url}" alt="avatar" class="rounded-circle object-fit-cover" style="width: 40px; height: 40px;" />`
              : '<i class="fa-solid fa-circle-user fs-1"></i>';
            const verified = row.verified ? ' <span class="badge rounded-pill text-bg-primary">Verificado</span>' : '';
            return `
              <div class="d-flex align-items-center gap-2">
                ${img}
                <div>
                  <div class="fw-semibold">${row.name || '—'}${verified}</div>
                  <div class="text-muted" style="font-size: 12px;">${row.email || ''}</div>
                </div>
              </div>
            `;
          },
        },
        {
          title: 'Suscripción',
          data: null,
          render: (row) => {
            const active = row.subscriptionStatus === 'ACTIVE';
            const variant = active ? 'success' : row.subscriptionStatus === 'CANCELED' ? 'danger' : 'secondary';
            return `
              <div style="font-size: 13px;">${row.subscriptionPlan || '<span class="text-muted">—</span>'}</div>
              <span class="badge rounded-pill text-bg-${variant}">${active ? 'Activa' : (row.subscriptionStatus || 'INACTIVE')}</span>
            `;
          },
        },
        {
          title: 'Propiedades',
          className: 'text-center',
          data: null,
          render: (row) =>
            row.totalProperties > 0
              ? `${row.totalProperties} <span class="text-muted">(${row.totalPublished} pub)</span>`
              : '<span class="text-muted">0</span>',
        },
        {
          title: 'Asignadas',
          className: 'text-center',
          data: null,
          render: (row) =>
            row.assignedProperties > 0
              ? String(row.assignedProperties)
              : '<span class="text-muted">0</span>',
        },
        {
          title: 'Leads',
          className: 'text-center',
          data: null,
          render: (row) =>
            row.leadsCount > 0
              ? `<span class="fw-semibold">${row.leadsCount}</span>`
              : '<span class="text-muted">0</span>',
        },
        {
          title: 'Clics',
          className: 'text-center',
          data: null,
          render: (row) => row.clicks,
        },
        {
          title: 'Reseñas',
          className: 'text-center',
          data: null,
          render: (row) =>
            row.ratingCount > 0
              ? `<i class="fa-solid fa-star" style="color: #f59e0b; font-size: 11px;"></i> ${row.ratingAverage.toFixed(1)} <span class="text-muted">(${row.ratingCount})</span>`
              : '<span class="text-muted">—</span>',
        },
        {
          title: 'Estado',
          data: null,
          render: (row) => {
            if (!row.isEnabled) return '<span class="badge rounded-pill text-bg-secondary">Inactivo</span>';
            return '<span class="badge rounded-pill text-bg-success">Activo</span>';
          },
        },
      ],
      destroy: true,
    });

    return () => {
      if (dataTableRef.current) {
        dataTableRef.current.destroy();
        dataTableRef.current = null;
      }
    };
  }, [agents, loading]);

  return (
    <Container>
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
        <div>
          <div style={{ fontSize: 'clamp(24px, 3vw, 40px)' }}>Agentes de mi agencia</div>
          <div className="text-muted mb-1" style={{ fontSize: '15px' }}>
            Reporte de los agentes de tu agencia con sus propiedades, leads y actividad.
          </div>
        </div>
        <button
          className="btn btn-sm btn-outline-success border-light-subtle"
          style={{ fontSize: '11px', borderRadius: '8px' }}
          onClick={handleExportExcel}
          title="Exportar a Excel"
          disabled={loading || !data || data.summary.totalAgents === 0}
        >
          <i className="fa-regular fa-file-excel me-1"></i>Excel
        </button>
      </div>

      {/* Filtros */}
      <div className="d-flex flex-wrap align-items-end gap-3 mt-3 p-3 border border-1 rounded-4" style={{ borderColor: '#e4e4e4' }}>
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
          Mostrando {agents.length} de {summary?.totalAgents || 0} agentes
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
            <div className="fw-bold mt-3" style={{ fontSize: '18px' }}>Aún no tienes agentes registrados</div>
            <div className="text-muted mt-1">
              Cuando registres agentes en tu agencia, aparecerán aquí.
            </div>
          </div>
        ) : (
          <>
            <Row className="g-3 mt-1">
              <KPICard iconClass="fa-solid fa-user-tie" label="Agentes" value={summary.totalAgents} note={`${summary.totalEnabled} activos`} color="#026a66" />
              <KPICard iconClass="fa-solid fa-house" label="Propiedades" value={summary.totalProperties} note={`${summary.totalPublished} publicadas`} color="#198754" />
              <KPICard iconClass="fa-solid fa-envelope" label="Leads" value={summary.totalLeads} note={`${summary.totalWithLeads} agentes con leads`} color="#0d6efd" />
              <KPICard iconClass="fa-solid fa-users" label="Con propiedades" value={summary.totalWithProperties} note="Propias o asignadas" color="#d63384" />
            </Row>

            <div className="border border-1 rounded-4 p-3 p-lg-4 mt-3" style={{ borderColor: '#e4e4e4' }}>
              <div className="mb-2" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                Detalle de agentes ({agents.length})
              </div>
              <div className="w-100">
                <table ref={tableRef} className="display nowrap" style={{ width: '100%' }} />
              </div>
            </div>
          </>
        )
      )}
    </Container>
  );
}

export default ReporteMisAgentes;