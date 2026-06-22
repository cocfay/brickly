import { useEffect, useState, useRef } from 'react';
import { Container, Modal } from 'react-bootstrap';
import { getContactLeads } from '../../../services/contactService';
import { API_URL } from '../../../services/authService';
import $ from 'jquery';
import 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import 'datatables.net-responsive-dt';
import 'datatables.net-responsive-dt/css/responsive.dataTables.css';
import espanol from 'datatables.net-plugins/i18n/es-ES.mjs';

function AyudaAdmin() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const tableRef = useRef(null);
  const dataTableRef = useRef(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Get users for agency mapping
  const [usersMap, setUsersMap] = useState({});
  const [agenciesMap, setAgenciesMap] = useState({});

  const handleOpenModal = (report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedReport(null);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Cargar usuarios para mapa de agencias
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        const usersRes = await fetch(`${API_URL}/users/list-user`, { headers });
        const usersData = await usersRes.json();
        const usersArr = Array.isArray(usersData) ? usersData : (usersData?.data || []);
        const uMap = {};
        const aMap = {};
        usersArr.forEach(u => {
          uMap[u._id] = u;
          if (Array.isArray(u.roles) && u.roles.includes('agencia')) {
            aMap[u._id] = u.name || u.username || 'N/A';
          }
        });
        setUsersMap(uMap);
        setAgenciesMap(aMap);
      } catch (e) {
        console.error('Error cargando usuarios:', e);
      }

      // Cargar leads y filtrar por "Formulario Soporte"
      const result = await getContactLeads();
      if (result.success) {
        const rawData = Array.isArray(result.data) ? result.data : [];
        // Filtrar solo los de tipo "Formulario Soporte"
        const soporteData = rawData.filter(item => item.type === 'Formulario Soporte');

        // Enriquecer con nombre de agencia si aplica
        const enriched = soporteData.map(item => {
          const agentId = item.agentId?._id || item.agentId;
          const user = usersMap[agentId] || (agentId ? { _id: agentId } : null);
          let agencyName = '';

          if (user?.parentId && agenciesMap[user.parentId]) {
            agencyName = agenciesMap[user.parentId];
          }

          return {
            ...item,
            agencyName
          };
        });

        // Ordenar por fecha descendente
        enriched.sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return db - da;
        });

        setReports(enriched);
      }
      setLoading(false);
      setLoaded(true);
    };
    load();
  }, []);

  // Re-enriquecer cuando usersMap se actualice
  useEffect(() => {
    if (Object.keys(usersMap).length > 0 && reports.length > 0) {
      const updated = reports.map(item => {
        const agentId = item.agentId?._id || item.agentId;
        const user = usersMap[agentId];
        let agencyName = item.agencyName || '';
        if (!agencyName && user?.parentId && agenciesMap[user.parentId]) {
          agencyName = agenciesMap[user.parentId];
        }
        return { ...item, agencyName };
      });
      setReports(updated);
    }
  }, [usersMap]);

  useEffect(() => {
    if (!tableRef.current || !loaded) return;

    if (dataTableRef.current) {
      dataTableRef.current.destroy();
      dataTableRef.current = null;
    }

    dataTableRef.current = $(tableRef.current).DataTable({
      language: espanol,
      responsive: true,
      lengthChange: false,
      pageLength: 10,
      info: false,
      data: reports,
      columns: [
        {
          title: '#',
          data: null,
          responsivePriority: 1,
          render: (row, type, rowData, meta) => {
            return `<span class="fw-bold">${meta.row + 1}</span>`;
          },
          orderable: false,
          searchable: false
        },
        {
          title: 'Usuario',
          data: null,
          render: (row) => {
            const name = row.name || 'N/A';
            return `<span>${name}</span>`;
          }
        },
        {
          title: 'Email',
          data: null,
          render: (row) => {
            const msg = row.email || '';
            return `<span>${msg}</span>`;
          }
        },
        {
          title: 'Fecha',
          data: null,
          render: (row) => formatDate(row.createdAt),
          orderable: true
        },
        {
          title: 'Acciones',
          data: null,
          className: 'text-center',
          orderable: false,
          searchable: false,
          render: (row) => {
            return `<div class="d-flex justify-content-center">
                        <button class="view-report-btn text-body" style="border: none; background: none; padding: 4px 8px;" data-index="${reports.indexOf(row)}" title="Ver detalles">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>`;
          }
        }
      ],
      order: [[2, 'desc']],
      layout: {
        topStart: function () {
          const div = document.createElement('div');
          div.className = 'd-flex flex-column gap-2 w-100 align-items-start';
          return div;
        }
      },
      destroy: true
    });

    // Event handler for eye button clicks
    $(tableRef.current).on('click', '.view-report-btn', function () {
      const index = $(this).data('index');
      const report = reports[index];
      if (report) {
        handleOpenModal(report);
      }
    });

    return () => {
      if (dataTableRef.current) {
        dataTableRef.current.destroy();
        dataTableRef.current = null;
      }
    };
  }, [reports, loaded]);

  useEffect(() => {
    return () => {
      if (dataTableRef.current) {
        dataTableRef.current.destroy();
        dataTableRef.current = null;
      }
    };
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Container>
      <div className='fs-1'>Reportes de ayuda</div>
      <p className="text-muted mt-2 mb-4">
        Reportes enviados por usuarios a través del formulario de ayuda.
      </p>

      <div className='containerTable'>
        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
            <p className="mt-3">Cargando reportes...</p>
          </div>
        )}
      </div>

      <div className="w-100">
        <table ref={tableRef} id="ayuda-table" className="display nowrap" style={{ width: '100%' }} />
      </div>

      {/* Modal de detalle del reporte */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Detalle del reporte</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport && (
            <>
              <div className="row g-3">
                <div className="col-lg-6">
                  <strong>Nombre:</strong>
                  <p className="mb-0 text-muted">{selectedReport.name || 'N/A'}</p>
                </div>
                <div className="col-lg-6">
                  <strong>Email:</strong>
                  <p className="mb-0 text-muted">{selectedReport.email || 'N/A'}</p>
                </div>
                <div className="col-lg-6">
                  <strong>Teléfono:</strong>
                  <p className="mb-0 text-muted">{selectedReport.phone || 'N/A'}</p>
                </div>
                <div className="col-lg-6">
                  <strong>Fecha:</strong>
                  <p className="mb-0 text-muted">{formatDate(selectedReport.createdAt)}</p>
                </div>
                {selectedReport.agencyName && (
                  <div className="col-12">
                    <strong>Agencia:</strong>
                    <p className="mb-0 text-muted">{selectedReport.agencyName}</p>
                  </div>
                )}
              </div>
              <hr />
              <div>
                <strong>Mensaje:</strong>
                <p className="mb-0 text-muted" style={{ whiteSpace: 'pre-wrap' }}>{selectedReport.message || 'N/A'}</p>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={handleCloseModal}>Cerrar</button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default AyudaAdmin;