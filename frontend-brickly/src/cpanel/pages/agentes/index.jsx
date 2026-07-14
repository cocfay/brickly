import { useEffect, useState, useRef } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { getAgentes, deleteAgente, updateAgente, getAgentLimit } from '../../services/agentes';
import confirm from '../../components/confirmUp';
import $ from 'jquery';
import 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import 'datatables.net-responsive-dt';
import 'datatables.net-responsive-dt/css/responsive.dataTables.css';
import espanol from 'datatables.net-plugins/i18n/es-ES.mjs';
import { API_URL, getCurrentUser } from '../../../services/authService';
import diamond from '../../../assets/images/iconos/diamond.png';

function Index() {
    const currentUser = getCurrentUser();
    const isAgencia = currentUser?.roles?.includes('agencia');
    const [agentes, setAgentes] = useState([]);
    const [loadingShow, setLoadingShow] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [propCounts, setPropCounts] = useState({}); // { [agentId]: total }
    const [limitInfo, setLimitInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Procesando...');
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertVariant, setAlertVariant] = useState('success');
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            setLoadingShow(true);
            const result = await getAgentes();
            if (result.success) {
                const data = Array.isArray(result.data) ? result.data : [];
                setAgentes(data);

                // Obtener conteo de propiedades publicadas por agente
                const countPromises = data.map(async (agent) => {
                    try {
                        const res = await fetch(`${API_URL}/properties?agents=${agent._id}&status=published`);
                        if (res.ok) {
                            const json = await res.json();
                            return { id: agent._id, count: Number(json?.total || 0) };
                        }
                    } catch {}
                    return { id: agent._id, count: 0 };
                });
                Promise.all(countPromises).then(counts => {
                    const countsMap = counts.reduce((acc, c) => { acc[c.id] = c.count; return acc; }, {});
                    setPropCounts(countsMap);
                    setLoadingShow(false);
                    setLoaded(true);
                });
            } else {
                setAlertVariant('danger');
                setAlertMessage(result.error || 'Error al cargar agentes.');
                setShowAlert(true);
                setLoadingShow(false);
                setLoaded(true);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (!isAgencia) return;
        getAgentLimit().then(result => {
            if (result.success) setLimitInfo(result.data);
        });
    }, [agentes.length, isAgencia]);

    useEffect(() => {
        const firstMay = (value) => {
            if (!value || typeof value !== 'string') return value || ''
            return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
        }
        if (!tableRef.current || !loaded) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }

        dataTableRef.current = $(tableRef.current).DataTable({
            language: espanol,
            responsive: true,
            lengthChange: false,
            pageLength: 6,
            info: false,
            data: agentes,
            columns: [
                {
                    title: '#',
                    data: null,
                    responsivePriority: 1,
                    render: (row) => `
                        <div class="d-flex justify-content-center align-items-center">
                            <input type="checkbox" class="form-check-input border-dark delete-checkbox" data-id="${row._id}" style="color-scheme: auto;">
                        </div>
                    `,
                    orderable: false,
                    searchable: false
                },
                { 
                    title: "Foto de perfil", 
                    data: null,
                    render: function(row) {
                    let img = ''
                    img = (row?.avatar && row?.avatar != "") ? `<img src="${API_URL + row.avatar.replace("/uploads", "")}" alt="avatar" class="rounded-circle object-fit-cover" style="width: 40px; height: 40px;" />` : '<i class="fa-solid fa-circle-user fs-1"></i>'
                    return `
                        <div class="d-flex justify-content-center">
                            ${img}
                        </div>
                    `;
                    },
                    orderable: false,
                    searchable: false
                },
                {
                    title: 'Nombre',
                    data: null,
                    render: (row) => {
                        const destacarBtn = !isAgencia
                            ? `<a href="#" class="planes-agente d-inline-flex align-items-center gap-1 text-decoration-none destacar-btn" data-id="${row._id}" style="font-size: 12px;">
                                    <i class="fa-solid fa-star text-warning" style="width: 14px; flex-shrink: 0;"></i>
                                    <span class="destacar-label">Destacar</span>
                               </a>`
                            : '';
                        return `
                            <div class="d-flex align-items-center gap-2">
                                <span>${row.name || row.username || 'N/A'}</span>
                                ${destacarBtn}
                            </div>
                        `
                    }
                },
                {
                    title: 'Correo',
                    data: null,
                    render: (row) => row.email || 'N/A'
                },
                /* {
                    title: 'Rol',
                    data: null,
                    render: (row) => (Array.isArray(row.roles) ? row.roles : [row.roles]).map(r => firstMay(r)).join(', ') || 'N/A'
                }, */
                {
                    title: 'Total de propiedades',
                    className: 'text-center',
                    data: null,
                    render: (row) => propCounts[row._id] ?? 0
                },
                {
                    title: 'Estado',
                    data: null,
                    render: (row) => row.isEnabled !== false
                        ? '<span class="badge bg-success">Activo</span>'
                        : '<span class="badge bg-secondary">Inactivo</span>'
                },
                {
                    title: '<div class="text-center">Acciones</div>',
                    data: null,
                    responsivePriority: 1,
                    orderable: false,
                    searchable: false,
                    render: (row) => `
                        <div class="d-flex gap-3 justify-content-center">
                            <a href="#" class="text-body edit-agente" data-id="${row._id}">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </a>
                            <a href="#" class="text-body delete-agente" data-id="${row._id}">
                                <i class="fa-solid fa-trash"></i>
                            </a>
                        </div>
                    `
                },
            ],
            layout: {
                topStart: function () {
                    const div = document.createElement('div');
                    div.className = 'd-flex flex-column gap-2 w-100 align-items-start';

                    // Solo mostrar checkbox y acciones si hay datos
                    if (agentes.length > 0) {
                        const actionRow = document.createElement('div');
                        actionRow.className = 'd-flex align-items-center gap-3 mt-2 px-3';

                        const checkboxDiv = document.createElement('div');
                        checkboxDiv.className = 'form-check d-flex align-items-center gap-2 mb-0';
                        checkboxDiv.innerHTML = `<input type="checkbox" class="form-check-input border-dark" id="selectAllCheckbox">`;

                        const desactivarBtn = document.createElement('button');
                        desactivarBtn.className = 'btn btn-sm btn-outline-dark rounded-4 px-3 action-btn';
                        desactivarBtn.id = 'btnDesactivar';
                        desactivarBtn.disabled = true;
                        desactivarBtn.innerHTML = '<i class="fa-solid fa-toggle-off"></i> Desactivar';

                        const eliminarBtn = document.createElement('button');
                        eliminarBtn.className = 'btn btn-sm btn-outline-dark rounded-4 px-3 action-btn';
                        eliminarBtn.id = 'btnEliminar';
                        eliminarBtn.disabled = true;
                        eliminarBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Eliminar';

                        actionRow.appendChild(checkboxDiv);
                        actionRow.appendChild(desactivarBtn);
                        actionRow.appendChild(eliminarBtn);
                        div.appendChild(actionRow);
                    }
                    return div;
                }
            },
            destroy: true
        });

        const dtContainer = $(tableRef.current).closest('.dt-container');

        const toggleActionButtons = () => {
            const selectedCount = dataTableRef.current.$('.delete-checkbox:checked').length;
            $('#btnDesactivar, #btnEliminar').prop('disabled', selectedCount === 0);

            if (selectedCount > 0) {
                const selectedIds = dataTableRef.current.$('.delete-checkbox:checked')
                    .map(function () { return $(this).data('id'); }).get();
                const allDisabled = selectedIds.every(id => {
                    const item = agentes.find(a => a._id === id);
                    return item?.isEnabled === false;
                });
                $('#btnDesactivar').html(
                    allDisabled
                        ? '<i class="fa-solid fa-toggle-on"></i> Activar'
                        : '<i class="fa-solid fa-toggle-off"></i> Desactivar'
                );
            }
        };

        dtContainer.on('change', '#selectAllCheckbox', function () {
            const isChecked = $(this).prop('checked');
            dataTableRef.current.$('.delete-checkbox').prop('checked', isChecked);
            toggleActionButtons();
        });

        $(tableRef.current).on('change', '.delete-checkbox', function () {
            const total = dataTableRef.current.$('.delete-checkbox').length;
            const checked = dataTableRef.current.$('.delete-checkbox:checked').length;
            $('#selectAllCheckbox').prop('checked', total === checked && total > 0);
            toggleActionButtons();
        });

        // Desactivar / Activar
        dtContainer.on('click', '#btnDesactivar', async function () {
            const idsSeleccionados = dataTableRef.current.$('.delete-checkbox:checked')
                .map(function () { return $(this).data('id'); }).get();
            if (idsSeleccionados.length === 0) return;

            setLoading(true);
            try {
                const primero = agentes.find(a => a._id === idsSeleccionados[0]);
                const nuevoEstado = primero?.isEnabled === false ? true : false;
                setLoadingMessage(nuevoEstado ? 'Activando agentes...' : 'Desactivando agentes...');

                const results = await Promise.all(
                    idsSeleccionados.map(id => updateAgente(id, { isEnabled: nuevoEstado }))
                );

                const failed = results.filter(r => !r.success);
                if (failed.length > 0) {
                    console.error('Errores al actualizar agentes:', failed);
                    setAlertVariant('danger');
                    setAlertMessage(`Error al cambiar estado de ${failed.length} agente(s): ${failed[0].error}`);
                    setShowAlert(true);
                    setLoading(false);
                    return;
                }

                setAgentes(prev =>
                    prev.map(a => idsSeleccionados.includes(a._id) ? { ...a, isEnabled: nuevoEstado } : a)
                );

                setAlertVariant('success');
                setAlertMessage(`Agente(s) ${nuevoEstado ? 'activado(s)' : 'desactivado(s)'} correctamente.`);
                setShowAlert(true);
                setTimeout(() => setShowAlert(false), 4000);

                $('#selectAllCheckbox').prop('checked', false);
                $('#btnDesactivar, #btnEliminar').prop('disabled', true);
            } catch (error) {
                setAlertVariant('danger');
                setAlertMessage('Error al cambiar el estado.');
                setShowAlert(true);
            } finally {
                setLoading(false);
            }
        });

        // Eliminar
        dtContainer.on('click', '#btnEliminar', async function () {
            const idsAEliminar = dataTableRef.current.$('.delete-checkbox:checked')
                .map(function () { return $(this).data('id'); }).get();
            if (idsAEliminar.length === 0) return;

            const respuesta = await confirm(idsAEliminar.length, 'agente(s)');
            if (!respuesta) return;

            setLoading(true);
            setLoadingMessage('Eliminando agentes...');
            try {
                await Promise.all(idsAEliminar.map(id => deleteAgente(id)));
                setAgentes(prev => prev.filter(a => !idsAEliminar.includes(a._id)));
                setAlertVariant('success');
                setAlertMessage('Agente(s) eliminado(s) correctamente.');
                setShowAlert(true);
                setTimeout(() => setShowAlert(false), 4000);
                $('#selectAllCheckbox').prop('checked', false);
                $('#btnDesactivar, #btnEliminar').prop('disabled', true);
            } catch (error) {
                setAlertVariant('danger');
                setAlertMessage('Error al eliminar agentes.');
                setShowAlert(true);
            } finally {
                setLoading(false);
            }
        });

        return () => {
            if (tableRef.current) {
                $(tableRef.current).off('change', '.delete-checkbox');
                const dtContainer = $(tableRef.current).closest('.dt-container');
                if (dtContainer.length) {
                    dtContainer.off('change', '#selectAllCheckbox');
                    dtContainer.off('click', '#btnEliminar');
                    dtContainer.off('click', '#btnDesactivar');
                }
            }
        };
    }, [agentes, loaded]);

    // eventos editar / eliminar individual (fila)
    useEffect(() => {
        const handleEdit = function(e) {
            e.preventDefault();
            navigate(`/cpanel/agentes/edit/${this.dataset.id}`);
        };
        const handleDelete = async function(e) {
            e.preventDefault();
            const id = this.dataset.id;
            const ok = await confirm(1, 'agente(s)');
            if (!ok) return;
            const result = await deleteAgente(id);
            if (result.success) {
                setAgentes(prev => prev.filter(a => a._id !== id));
                setAlertVariant('success');
                setAlertMessage('Agente eliminado correctamente.');
            } else {
                setAlertVariant('danger');
                setAlertMessage(result.error || 'Error al eliminar.');
            }
            setShowAlert(true);
            setTimeout(() => setShowAlert(false), 4000);
        };

        const handleDestacar = function(e) {
            e.preventDefault();
            navigate('/cpanel/agentes/planes');
        };

        $(tableRef.current).on('click', '.edit-agente', handleEdit);
        $(tableRef.current).on('click', '.planes-agente', handleDestacar);
        $(tableRef.current).on('click', '.delete-agente', handleDelete);

        return () => {
            $(tableRef.current).off('click', '.edit-agente', handleEdit);
            $(tableRef.current).off('click', '.planes-agente', handleDestacar);
            $(tableRef.current).off('click', '.delete-agente', handleDelete);
        };
    }, [navigate]);

    // cleanup solo al desmontar
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
            <div className='fs-1'>Lista de agentes</div>
            {isAgencia && limitInfo && (
                <div className={`small mb-2 ${!limitInfo.canCreate ? 'text-danger' : 'text-muted'}`}>
                    Agentes: {limitInfo.current} / {limitInfo.max === 0 ? 'sin cupo en tu plan actual' : limitInfo.max}
                </div>
            )}
            {(!isAgencia || !limitInfo || limitInfo.canCreate) ? (
                <Link to="/cpanel/agentes/add" className='mt-4 d-flex gap-1 align-items-center text-body mb-5'>
                    <i className="fa-solid fa-plus bg-black rounded-circle text-white" style={{ fontSize: '10px', width: '20px', height: '20px', display: 'grid', placeItems: 'center', paddingRight: '1px' }}></i>
                    <span>Crear agente</span>
                </Link>
            ) : (
                <div className='mt-4 d-flex gap-1 align-items-center text-muted mb-5' title={`Límite de ${limitInfo.max} agente(s) alcanzado para tu plan`} style={{ cursor: 'not-allowed' }}>
                    <i className="fa-solid fa-plus bg-secondary rounded-circle text-white" style={{ fontSize: '10px', width: '20px', height: '20px', display: 'grid', placeItems: 'center', paddingRight: '1px' }}></i>
                    <span>Crear agente (límite alcanzado)</span>
                </div>
            )}

            {showAlert && (
                <Alert variant={alertVariant} onClose={() => setShowAlert(false)} dismissible className="position-fixed bottom-0 end-0 m-3 shadow-sm" style={{ zIndex: 9999 }}>
                    <div className="d-flex align-items-center gap-2">
                        <i className={`fa-solid ${alertVariant === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        <span>{alertMessage}</span>
                    </div>

                </Alert>
            )}

            <div className='containerTable'>
                {loading && (
                    <div className="text-center text-primary fw-bold">
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                        {loadingMessage}
                    </div>
                )}
                {loadingShow && (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" />
                        <p className="mt-3">Cargando agentes...</p>
                    </div>
                )}
            </div>

            <div className="w-100">
                <table ref={tableRef} id="agentes-table" className="display nowrap" style={{ width: '100%' }} />
            </div>
        </Container>
    );
}

export default Index;
