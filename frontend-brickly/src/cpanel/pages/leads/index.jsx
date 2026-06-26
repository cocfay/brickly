import { useEffect, useState, useRef, useCallback } from 'react';
import { Container, Alert, Modal } from 'react-bootstrap';
import {
    getContactLeads,
    getContactSiteForms,
    updateContactLeadStatus,
    updateContactSiteFormStatus
} from '../../../services/contactService';
import { getCurrentUser } from '../../../services/authService';
import { getUsers } from '../../../services/listUsers';
import { getAgentes } from '../../services/agentes';
import $ from 'jquery';
import 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import 'datatables.net-responsive-dt';
import 'datatables.net-responsive-dt/css/responsive.dataTables.css';
import espanol from 'datatables.net-plugins/i18n/es-ES.mjs';

const normalizeLeadStatus = (status) => {
    return status === 'revisado' ? 'revisado' : 'pendiente';
};

const getLeadStatusLabel = (status) => {
    return normalizeLeadStatus(status) === 'revisado' ? 'Revisado' : 'Pendiente';
};

const getLeadStatusBadgeClass = (status) => {
    return normalizeLeadStatus(status) === 'revisado'
        ? 'bg-success-subtle text-success border border-success-subtle'
        : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
};

const renderLeadStatusBadge = (status) => {
    return `<span class="badge rounded-pill ${getLeadStatusBadgeClass(status)}">${getLeadStatusLabel(status)}</span>`;
};

const getLeadIds = (lead) => {
    if (!lead) return [];
    if (Array.isArray(lead.leadIds) && lead.leadIds.length > 0) {
        return lead.leadIds;
    }
    return lead._id ? [lead._id] : [];
};

function Leads() {
    const [leads, setLeads] = useState([]);
    const [loadingShow, setLoadingShow] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertVariant, setAlertVariant] = useState('success');
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [reviewLoading, setReviewLoading] = useState(false);

    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.roles?.includes('admin');
    const isAgencia = currentUser?.roles?.includes('agencia');
    const isAgente = currentUser?.roles?.includes('agente');

    // Tipo de lead a mostrar: 'agentes' (por defecto) o 'brickly' (solo admin)
    const [filterType, setFilterType] = useState('agentes');
    const filterTypeRef = useRef(filterType);

    const [dataReady, setDataReady] = useState(false);

    const handleOpenModal = (lead) => {
        setSelectedLead(lead);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedLead(null);
        setReviewLoading(false);
    };

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

    const handleMarkAsReviewed = async () => {
        const leadIds = getLeadIds(selectedLead);

        if (leadIds.length === 0) {
            setAlertVariant('danger');
            setAlertMessage('No se pudo identificar el lead seleccionado.');
            setShowAlert(true);
            return;
        }

        setReviewLoading(true);
        const result = filterType === 'brickly'
            ? await updateContactSiteFormStatus(leadIds, 'revisado')
            : await updateContactLeadStatus(leadIds, 'revisado');

        if (result.success) {
            const leadIdSet = new Set(leadIds);

            setLeads(prevLeads => prevLeads.map(lead => {
                const currentLeadIds = getLeadIds(lead);
                const shouldUpdate = currentLeadIds.some(id => leadIdSet.has(id));

                return shouldUpdate ? { ...lead, status: 'revisado' } : lead;
            }));
            setSelectedLead(prevLead => prevLead ? { ...prevLead, status: 'revisado' } : prevLead);
            setAlertVariant('success');
            setAlertMessage('Lead marcado como revisado.');
            setShowAlert(true);
        } else {
            setAlertVariant('danger');
            setAlertMessage(result.error || 'Error al marcar el lead como revisado.');
            setShowAlert(true);
        }

        setReviewLoading(false);
    };

    useEffect(() => {
        filterTypeRef.current = filterType;
    }, [filterType]);

    const loadAgentLeads = useCallback(async () => {
        // Cargar TODOS los usuarios para tener mapa completo de agentes y agencias
        const usersResult = await getUsers();
        const usersMap = {};       // _id -> user object
        const agenciesMap = {};    // _id -> agency name
        if (usersResult.success && Array.isArray(usersResult.data)) {
            usersResult.data.forEach(u => {
                usersMap[u._id] = u;
                // Si es agencia, guardar en mapa de agencias
                if (Array.isArray(u.roles) && u.roles.includes('agencia')) {
                    agenciesMap[u._id] = u.name || u.username || 'N/A';
                }
            });
        }

        // Para agencia: obtener IDs de sus agentes para filtrar en cliente
        let agencyAgentIds = [];
        if (isAgencia) {
            const agentesResult = await getAgentes();
            if (agentesResult.success && Array.isArray(agentesResult.data)) {
                agencyAgentIds = agentesResult.data.map(a => a._id);
            }
        }

        // Cargar leads
        const params = {};
        if (isAgente && !isAgencia) {
            params.agentId = currentUser._id;
        }

        const result = await getContactLeads(params);
        let processedLeads = [];
        if (result.success) {
            const rawData = Array.isArray(result.data) ? result.data : [];

            // Agrupar leads duplicados (mismo email + message + type)
            const groupedMap = new Map();

            // Filtrar para excluir los de tipo "Formulario Soporte"
            const filteredData = rawData.filter(item => item.type !== 'Formulario Soporte');

            filteredData.forEach(item => {
                const key = `${item.email || ''}|${item.message || ''}|${item.type || ''}`;

                if (groupedMap.has(key)) {
                    const existing = groupedMap.get(key);
                    const agentId = item.agentId?._id || item.agentId;
                    const leadId = item._id;
                    if (agentId && !existing.agentIds.includes(agentId)) {
                        existing.agentIds.push(agentId);
                    }
                    if (leadId && !existing.leadIds.includes(leadId)) {
                        existing.leadIds.push(leadId);
                    }
                    existing.statusValues.push(normalizeLeadStatus(item.status));
                    if (item.createdAt && new Date(item.createdAt) > new Date(existing.createdAt)) {
                        existing.createdAt = item.createdAt;
                    }
                } else {
                    const agentId = item.agentId?._id || item.agentId;
                    groupedMap.set(key, {
                        ...item,
                        status: normalizeLeadStatus(item.status),
                        statusValues: [normalizeLeadStatus(item.status)],
                        agentIds: agentId ? [agentId] : [],
                        leadIds: item._id ? [item._id] : []
                    });
                }
            });

            const groupedData = Array.from(groupedMap.values()).map(item => {
                const statusValues = Array.isArray(item.statusValues) ? item.statusValues : [item.status];
                const status = statusValues.every(value => normalizeLeadStatus(value) === 'revisado') ? 'revisado' : 'pendiente';
                const agentNames = item.agentIds
                    .map(id => {
                        const user = usersMap[id];
                        return user ? (user.name || user.username || 'N/A') : 'N/A';
                    })
                    .filter(Boolean)
                    .join(', ');

                const agencyNames = item.agentIds
                    .map(id => {
                        const user = usersMap[id];
                        if (user?.parentId && agenciesMap[user.parentId]) {
                            return agenciesMap[user.parentId];
                        }
                        return null;
                    })
                    .filter((v, i, a) => v && a.indexOf(v) === i)
                    .join(', ');

                return {
                    ...item,
                    status,
                    agentNames: agentNames || 'N/A',
                    agencyNames: agencyNames || ''
                };
            });

            groupedData.sort((a, b) => {
                const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return db - da;
            });

            let filteredGroupedData = groupedData;
            if (isAgencia && agencyAgentIds.length > 0) {
                filteredGroupedData = groupedData.filter(item =>
                    item.agentIds.some(id => agencyAgentIds.includes(id))
                );
            }

            processedLeads = filteredGroupedData;
        } else {
            setAlertVariant('danger');
            setAlertMessage(result.error || 'Error al cargar leads.');
            setShowAlert(true);
        }

        setLeads(processedLeads);
        setDataReady(true);
    }, [currentUser?._id, isAgencia, isAgente]);

    const loadSiteForms = useCallback(async () => {
        const result = await getContactSiteForms();
        let processedLeads = [];
        if (result.success) {
            const rawData = Array.isArray(result.data) ? result.data : [];

            rawData.sort((a, b) => {
                const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return db - da;
            });

            processedLeads = rawData.map(item => ({
                ...item,
                status: normalizeLeadStatus(item.status),
                leadIds: item._id ? [item._id] : []
            }));
        } else {
            setAlertVariant('danger');
            setAlertMessage(result.error || 'Error al cargar leads del sitio.');
            setShowAlert(true);
        }

        setLeads(processedLeads);
        setDataReady(true);
    }, []);

    useEffect(() => {
        const load = async () => {
            setLoadingShow(true);
            setDataReady(false);

            const isBrickly = filterTypeRef.current === 'brickly';

            if (isBrickly) {
                await loadSiteForms();
            } else {
                await loadAgentLeads();
            }

            setLoadingShow(false);
        };
        load();
    }, [filterType, loadAgentLeads, loadSiteForms]);

    // DataTable initialization (only when leads or filterType changes and dataReady is true)
    useEffect(() => {
        if (!tableRef.current || !dataReady) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }

        const isBrickly = filterType === 'brickly';

        dataTableRef.current = $(tableRef.current).DataTable({
            language: espanol,
            responsive: true,
            lengthChange: false,
            pageLength: 10,
            info: false,
            data: leads,
            columns: (() => {
                const cols = [
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
                        title: 'Nombre',
                        data: null,
                        render: (row) => {
                            const name = [row.name, row.lastname].filter(Boolean).join(' ') || 'N/A';
                            return `<span>${name}</span>`;
                        }
                    },
                    {
                        title: 'Correo',
                        data: null,
                        render: (row) => row.email || 'N/A'
                    },
                    {
                        title: 'Fecha',
                        data: null,
                        render: (row) => formatDate(row.createdAt),
                        orderable: true
                    },
                    {
                        title: 'Teléfono',
                        data: null,
                        render: (row) => row.phone || 'N/A'
                    },
                    {
                        title: 'Status',
                        data: null,
                        render: (row) => renderLeadStatusBadge(row.status)
                    },
                    {
                        title: 'Acciones',
                        data: null,
                        className: 'text-center',
                        orderable: false,
                        searchable: false,
                        render: (row) => {
                            return `<div class="d-flex justify-content-center">
                                        <button class="view-lead-btn text-body" style="border: none; background: none; padding: 4px 8px;" data-index="${leads.indexOf(row)}" title="Ver detalles">
                                            <i class="fa-solid fa-eye"></i>
                                        </button>
                                    </div>`;
                        }
                    }
                ];

                if (isBrickly) {
                    cols.splice(1, 0, {
                        title: 'Tipo',
                        data: null,
                        render: (row) => {
                            return row.type || 'N/A';
                        }
                    });
                }

                if (isAdmin && !isBrickly) {
                    cols.splice(1, 0, {
                        title: 'Agencia',
                        data: null,
                        render: (row) => {
                            return row.agencyNames || 'N/A';
                        }
                    });
                }

                return cols;
            })(),
            order: [[isBrickly || isAdmin ? 4 : 3, 'desc']],
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
        $(tableRef.current).on('click', '.view-lead-btn', function () {
            const index = $(this).data('index');
            const lead = leads[index];
            if (lead) {
                handleOpenModal(lead);
            }
        });

        return () => {
            if (dataTableRef.current) {
                dataTableRef.current.destroy();
                dataTableRef.current = null;
            }
        };
    }, [leads, dataReady, filterType, isAdmin]);

    // cleanup al desmontar
    useEffect(() => {
        return () => {
            if (dataTableRef.current) {
                dataTableRef.current.destroy();
                dataTableRef.current = null;
            }
        };
    }, []);

    return (
        <Container>
            <div className='fs-1'>Leads de contacto</div>
            <p className="text-muted mt-2 mb-4">
                {isAgencia
                    ? 'Todos los leads de tus agentes.'
                    : isAgente
                        ? 'Tus leads de contacto recibidos.'
                        : 'Administración de leads del sistema.'
                }
            </p>

            {showAlert && (
                <Alert variant={alertVariant} onClose={() => setShowAlert(false)} dismissible className="position-fixed bottom-0 end-0 m-3 shadow-sm" style={{ zIndex: 9999 }}>
                    <div className="d-flex align-items-center gap-2">
                        <i className={`fa-solid ${alertVariant === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        <span>{alertMessage}</span>
                    </div>
                </Alert>
            )}

            {/* Botones de filtro - solo visibles para admin */}
            {isAdmin && (
                <div className="d-flex gap-2 align-items-center flex-wrap mb-4">
                    <div
                        onClick={() => setFilterType('agentes')}
                        className='border py-1 px-3 rounded-1'
                        style={{
                            fontSize: '14px',
                            color: filterType === 'agentes' ? '#fff' : '#5D5B5A',
                            backgroundColor: filterType === 'agentes' ? '#000' : '#FAFAFA',
                            width: 'fit-content',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Leads Agentes
                    </div>
                    <div
                        onClick={() => setFilterType('brickly')}
                        className='border py-1 px-3 rounded-1'
                        style={{
                            fontSize: '14px',
                            color: filterType === 'brickly' ? '#fff' : '#5D5B5A',
                            backgroundColor: filterType === 'brickly' ? '#000' : '#FAFAFA',
                            width: 'fit-content',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Leads Brickly
                    </div>
                </div>
            )}

            <div className='containerTable'>
                {loadingShow && (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" />
                        <p className="mt-3">Cargando leads...</p>
                    </div>
                )}
            </div>

            <div className="w-100" style={{ display: loadingShow ? 'none' : 'block' }}>
                <table ref={tableRef} id="leads-table" className="display nowrap" style={{ width: '100%' }} />
            </div>

            {/* Modal de detalle del lead */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Detalle del lead</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedLead && (
                        <>
                            <div className="row g-3">
                                <div className="col-lg-4 col-md-6">
                                    <strong>Nombre:</strong>
                                    <p className="mb-0 text-muted">{[selectedLead.name, selectedLead.lastname].filter(Boolean).join(' ') || 'N/A'}</p>
                                </div>
                                <div className="col-lg-4 col-md-6">
                                    <strong>Correo:</strong>
                                    <p className="mb-0 text-muted">{selectedLead.email || 'N/A'}</p>
                                </div>
                                <div className="col-lg-4 col-md-6">
                                    <strong>Teléfono:</strong>
                                    <p className="mb-0 text-muted">{selectedLead.phone || 'N/A'}</p>
                                </div>
                                <div className="col-lg-4 col-md-6">
                                    <strong>Tipo:</strong>
                                    <p className="mb-0 text-muted">{selectedLead.type || 'N/A'}</p>
                                </div>
                                <div className="col-lg-4 col-md-6">
                                    <strong>Status:</strong>
                                    <div className="mt-1">
                                        <span className={`badge rounded-pill ${getLeadStatusBadgeClass(selectedLead.status)}`}>
                                            {getLeadStatusLabel(selectedLead.status)}
                                        </span>
                                    </div>
                                </div>
                                <div className="col-lg-4 col-md-6">
                                    <strong>Info adicional:</strong>
                                    <p className="mb-0 text-muted">{selectedLead.info || '-'}</p>
                                </div>
                                {(!selectedLead.type || filterType === 'agentes') && (
                                    <div className="col-lg-4 col-md-6">
                                        <strong>Agente(s):</strong>
                                        <p className="mb-0 text-muted">{selectedLead.agentNames || 'N/A'}</p>
                                    </div>
                                )}
                                <div className="col-12">
                                    <strong>Fecha:</strong>
                                    <p className="mb-0 text-muted">{formatDate(selectedLead.createdAt)}</p>
                                </div>
                            </div>
                            <hr />
                            <div>
                                <strong>Mensaje:</strong>
                                <p className="mb-0 text-muted" style={{ whiteSpace: 'pre-wrap' }}>{selectedLead.message || 'N/A'}</p>
                            </div>
                        </>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    {selectedLead && normalizeLeadStatus(selectedLead.status) !== 'revisado' && (
                        <button className="btn btn-dark" onClick={handleMarkAsReviewed} disabled={reviewLoading}>
                            {reviewLoading ? 'Marcando...' : 'Marcar como revisado'}
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={handleCloseModal}>Cerrar</button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default Leads;
