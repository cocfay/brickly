import { useEffect, useState, useRef } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { getProyectos, getProyectosByUser, deleteProyecto, updateProyecto } from '../../services/proyectos';
import { getCurrentUser } from '../../../services/authService';
import confirm from '../../components/confirmUp';
import $ from 'jquery';
import 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import 'datatables.net-responsive-dt';
import 'datatables.net-responsive-dt/css/responsive.dataTables.css';
import espanol from 'datatables.net-plugins/i18n/es-ES.mjs';
import { getLogoUrl } from '../../../services/logoService';
import sinPropiedad from './../../assets/images/iconos/sinPropiedad.png';

function CpProyectos() {
    const [proyectos, setProyectos] = useState([]);
    const [loadingShow, setLoadingShow] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Procesando...');
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertVariant, setAlertVariant] = useState('success');
    const [currentUser, setCurrentUser] = useState(null);
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            setLoadingShow(true);
            const user = getCurrentUser();
            const userId = user?._id || user?.id;
            if (!userId) {
                setAlertVariant('danger');
                setAlertMessage('No se pudo identificar al usuario.');
                setShowAlert(true);
                setLoadingShow(false);
                setLoaded(true);
                return;
            }
            // Admin ve todos los proyectos, arquitectos solo los suyos
            let result;
            const isAdmin = user?.roles?.includes("admin");
            setCurrentUser(user);
            if (isAdmin) {
                result = await getProyectos();
            } else {
                result = await getProyectosByUser(userId);
            }
            if (result.success) {
                let data = Array.isArray(result.data) ? result.data : [];
                // pre-published primero, luego el resto ordenado por fecha descendente
                const order = { 'pre-published': 0, 'published': 1, 'draft': 2, 'disabled': 3, 'sold': 4, 'rented': 5 };
                data = [...data].sort((a, b) => {
                    const statusDiff = (order[a.status] ?? 99) - (order[b.status] ?? 99);
                    if (statusDiff !== 0) return statusDiff;
                    // Mismo grupo: ordenar por fecha descendente (más reciente primero)
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                });
                setProyectos(data);
            } else {
                setAlertVariant('danger');
                setAlertMessage(result.error || 'Error al cargar proyectos.');
                setShowAlert(true);
            }
            setLoadingShow(false);
            setLoaded(true);
        };
        load();
    }, []);

    const showAlertMessage = (variant, message) => {
        setAlertVariant(variant);
        setAlertMessage(message);
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 4000);
    };

    useEffect(() => {
        if (!tableRef.current || !loaded) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }

        const isAdmin = currentUser?.roles?.includes("admin");

        const columns = [
            {
                title: "#",
                data: null,
                defaultContent: '',
                width: '40px',
                className: 'text-center',
                render: function(data, type, row, meta) {
                    return `<span class="fw-bold row-number">${meta.row + 1}</span>`;
                },
                orderable: false,
                searchable: false
            },
            {
                title: "",
                data: null,
                defaultContent: '',
                responsivePriority: 1,
                render: function(row) {
                    return `
                        <div class="d-flex justify-content-center align-items-center">
                            <input type="checkbox" class="form-check-input border-dark delete-checkbox" data-id="${row._id}" style="color-scheme: auto;">
                        </div>
                    `;
                },
                orderable: false,
                searchable: false
            },
            {
                title: '',
                data: null,
                render: function(row) {
                    // Intentar móvil primero, si no hay usar escritorio
                    let src = '';
                    if (row?.mainImageAlter && row.mainImageAlter !== '') {
                        src = row.mainImageAlter.startsWith('http') ? row.mainImageAlter : getLogoUrl(row.mainImageAlter);
                    } else if (row?.mainImage && row.mainImage !== '') {
                        src = row.mainImage.startsWith('http') ? row.mainImage : getLogoUrl(row.mainImage);
                    }
                    return `
                        <div class="d-flex justify-content-center">
                            <img src="${src || sinPropiedad}" alt="proyecto" style="width: 150px; height: 150px; object-fit: cover;" class="m-auto" />
                        </div>
                    `;
                },
                orderable: false,
                searchable: false
            },
            {
                title: 'Título',
                data: null,
                render: (row) => {
                    return `
                        <div class="d-flex align-items-center gap-2">
                            <span>${row.title || row.name || 'Sin título'}</span>
                        </div>
                    `;
                }
            },
            { 
                title: "Estado", 
                data: "status",
                render: function(data) {
                const estados = {
                    'draft': '<span class="badge bg-secondary">Borrador</span>',
                    'published': '<span class="badge bg-success">Publicado</span>',
                    'pre-published': '<span class="badge bg-warning text-dark">Pendiente</span>',
                    'sold': '<span class="badge bg-danger">Vendido</span>',
                    'disabled': '<span class="badge bg-dark">Desabilitado</span>',
                    'rented': '<span class="badge bg-light">Alquilado</span>'
                };
                return estados[data] || data;
                }
            },
            { 
                title: "Fecha", 
                data: "createdAt",
                render: function(data) {
                    if (!data) return '';
                    const date = new Date(data);
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();
                    return `${day}-${month}-${year}`;
                }
            },
            {
                title: '<div class="text-center">Acciones</div>',
                data: null,
                responsivePriority: 1,
                orderable: false,
                searchable: false,
                render: (row) => {
                    const editBtn = !isAdmin
                        ? `<a href="#" class="text-body edit-proyecto" data-id="${row._id}">
                             <i class="fa-solid fa-pen-to-square"></i>
                           </a>`
                        : '';
                    return `
                        <div class="d-flex gap-3 justify-content-center">
                            <a href="#" class="text-body view-proyecto" data-id="${row._id}">
                                <i class="fa-solid fa-eye"></i>
                            </a>
                            ${editBtn}
                            <a href="#" class="text-body delete-proyecto" data-id="${row._id}">
                                <i class="fa-solid fa-trash"></i>
                            </a>
                        </div>
                    `;
                }
            }
        ];

        dataTableRef.current = $(tableRef.current).DataTable({
            language: espanol,
            responsive: true,
            lengthChange: false,
            pageLength: 6,
            info: false,
            data: proyectos,
            columns,
            layout: {
                topStart: function () {
                    const div = document.createElement('div');
                    div.className = 'd-flex flex-column gap-2 w-100 align-items-start';

                    // Fila con checkbox "Seleccionar Todos" y botones
                    const actionRow = document.createElement('div');
                    actionRow.className = 'd-flex align-items-center gap-3 mt-4 px-3';

                    // Checkbox "Seleccionar Todos"
                    const checkboxDiv = document.createElement('div');
                    checkboxDiv.className = 'form-check d-flex align-items-center gap-2 mb-0';
                    checkboxDiv.innerHTML = `
                        <input type="checkbox" class="form-check-input border-dark" id="selectAllCheckbox">
                    `;

                    // Botones
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

                    const publicarBtn = document.createElement('button');
                    publicarBtn.className = 'btn btn-sm btn-outline-success rounded-4 px-3 action-btn';
                    publicarBtn.id = 'btnPublicar';
                    publicarBtn.disabled = true;
                    publicarBtn.innerHTML = isAdmin
                        ? '<i class="fa-solid fa-check"></i> Publicar'
                        : '<i class="fa-solid fa-paper-plane"></i> Enviar a revisión';

                    const borradorBtn = document.createElement('button');
                    borradorBtn.className = 'btn btn-sm btn-outline-secondary rounded-4 px-3 action-btn';
                    borradorBtn.id = 'btnBorrador';
                    borradorBtn.disabled = true;
                    borradorBtn.innerHTML = '<i class="fa-duotone fa-solid fa-file-pen"></i> Borrador';

                    actionRow.appendChild(checkboxDiv);
                    actionRow.appendChild(publicarBtn);
                    actionRow.appendChild(borradorBtn);
                    actionRow.appendChild(desactivarBtn);
                    actionRow.appendChild(eliminarBtn);

                    div.appendChild(actionRow);

                    return div;
                }
            },
            rowCallback: function(row, data, index) {
                const api = this.api();
                const info = api.page.info();
                const rowNum = info.start + index + 1;
                $(row).find('td:first-child .row-number').text(rowNum);
            },
            destroy: true
        });

        const dtContainer = $(tableRef.current).closest('.dt-container');

        // Función auxiliar para habilitar/deshabilitar botones
        const toggleActionButtons = () => {
            const selectedCount = dataTableRef.current.$('.delete-checkbox:checked').length;
            $('#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador').prop('disabled', selectedCount === 0);

            if (selectedCount > 0) {
                const selectedIds = dataTableRef.current.$('.delete-checkbox:checked')
                    .map(function() { return $(this).data('id'); }).get();

                // Lógica Desactivar/Activar
                const allDisabled = selectedIds.every(id => {
                    const item = proyectos.find(p => p._id === id);
                    return item?.status === 'disabled';
                });
                $('#btnDesactivar').html(
                    allDisabled
                        ? '<i class="fa-solid fa-toggle-on"></i> Activar'
                        : '<i class="fa-solid fa-toggle-off"></i> Desactivar'
                );

                // Lógica Publicar / Borrador
                const statuses = selectedIds.map(id => proyectos.find(p => p._id === id)?.status);
                const allPrePublished = statuses.every(s => s === 'pre-published');
                const allPublished = statuses.every(s => s === 'published');
                const allDraftOrDisabled = statuses.every(s => s === 'draft' || s === 'disabled');

                if (isAdmin) {
                    $('#btnPublicar').prop('disabled', !allPrePublished);
                } else {
                    $('#btnPublicar').prop('disabled', !allDraftOrDisabled);
                }
                $('#btnBorrador').prop('disabled', !allPublished && !allPrePublished);
            }
        };

        // Evento: Cambiar el "Seleccionar Todos"
        dtContainer.on('change', '#selectAllCheckbox', function() {
            const isChecked = $(this).prop('checked');
            dataTableRef.current.$('.delete-checkbox').prop('checked', isChecked);
            toggleActionButtons();
        });

        // Evento: Marcar/Desmarcar un checkbox individual
        $(tableRef.current).on('change', '.delete-checkbox', function() {
            const total = dataTableRef.current.$('.delete-checkbox').length;
            const checked = dataTableRef.current.$('.delete-checkbox:checked').length;

            $('#selectAllCheckbox').prop('checked', total === checked && total > 0);
            toggleActionButtons();
        });

        // Evento: Desactivar/Activar
        dtContainer.on('click', '#btnDesactivar', async function() {
            const idsSeleccionados = dataTableRef.current.$('.delete-checkbox:checked')
                .map(function() { return $(this).data('id'); }).get();

            if (idsSeleccionados.length === 0) return;

            setLoading(true);
            try {
                const primera = proyectos.find(p => p._id === idsSeleccionados[0]);
                const nuevoStatus = primera?.status === 'disabled' ? 'published' : 'disabled';
                setLoadingMessage(nuevoStatus === 'disabled' ? 'Desactivando proyectos...' : 'Activando proyectos...');

                await Promise.all(idsSeleccionados.map(id => updateProyecto(id, { status: nuevoStatus })));

                setProyectos(prev => prev.map(item =>
                    idsSeleccionados.includes(item._id) ? { ...item, status: nuevoStatus } : item
                ));

                showAlertMessage('success', `Proyecto(s) ${nuevoStatus === 'disabled' ? 'desactivado(s)' : 'activado(s)'} correctamente.`);

                $('#selectAllCheckbox').prop('checked', false);
                $('#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador').prop('disabled', true);
            } catch (error) {
                showAlertMessage('danger', 'Error al cambiar el estado.');
            } finally {
                setLoading(false);
            }
        });

        // Evento: Publicar / Enviar a revisión
        dtContainer.on('click', '#btnPublicar', async function() {
            const ids = dataTableRef.current.$('.delete-checkbox:checked')
                .map(function() { return $(this).data('id'); }).get();
            if (ids.length === 0) return;

            const nuevoStatus = isAdmin ? 'published' : 'pre-published';
            const mensajeExito = isAdmin ? 'Proyecto(s) aprobado(s).' : 'Proyecto(s) enviado(s) a revisión.';

            setLoading(true);
            setLoadingMessage(isAdmin ? 'Publicando...' : 'Enviando a revisión...');
            try {
                await Promise.all(ids.map(id => updateProyecto(id, { status: nuevoStatus })));
                setProyectos(prev => prev.map(item =>
                    ids.includes(item._id) ? { ...item, status: nuevoStatus } : item
                ));
                showAlertMessage('success', mensajeExito);
                $('#selectAllCheckbox').prop('checked', false);
                $('#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador').prop('disabled', true);
            } catch (error) {
                showAlertMessage('danger', 'Error al publicar.');
            } finally {
                setLoading(false);
            }
        });

        // Evento: Borrador
        dtContainer.on('click', '#btnBorrador', async function() {
            const ids = dataTableRef.current.$('.delete-checkbox:checked')
                .map(function() { return $(this).data('id'); }).get();
            if (ids.length === 0) return;
            setLoading(true);
            setLoadingMessage('Colocando como borrador...');
            try {
                await Promise.all(ids.map(id => updateProyecto(id, { status: 'draft' })));
                setProyectos(prev => prev.map(item =>
                    ids.includes(item._id) ? { ...item, status: 'draft' } : item
                ));
                showAlertMessage('success', 'Proyecto(s) colocado(s) como borrador.');
                $('#selectAllCheckbox').prop('checked', false);
                $('#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador').prop('disabled', true);
            } catch (error) {
                showAlertMessage('danger', 'Error al colocar como borrador.');
            } finally {
                setLoading(false);
            }
        });

        // Evento: Eliminar múltiple
        dtContainer.on('click', '#btnEliminar', async function() {
            const idsAEliminar = dataTableRef.current.$('.delete-checkbox:checked')
                .map(function() { return $(this).data('id'); }).get();

            if (idsAEliminar.length > 0) {
                const respuesta = await confirm(idsAEliminar.length);
                if (respuesta) {
                    setLoading(true);
                    setLoadingMessage('Eliminando proyectos...');
                    try {
                        await Promise.all(idsAEliminar.map(id => deleteProyecto(id)));
                        setProyectos(prev => prev.filter(item => !idsAEliminar.includes(item._id)));
                        showAlertMessage('success', 'Proyecto(s) eliminado(s) correctamente.');
                        $('#selectAllCheckbox').prop('checked', false);
                        $('#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador').prop('disabled', true);
                    } catch (error) {
                        showAlertMessage('danger', 'Error al eliminar.');
                    } finally {
                        setLoading(false);
                    }
                }
            }
        });

        return () => {
            if (tableRef.current) {
                $(tableRef.current).off('change', '.delete-checkbox');
                const dc = $(tableRef.current).closest('.dt-container');
                if (dc.length) {
                    dc.off('change', '#selectAllCheckbox');
                    dc.off('click', '#btnEliminar');
                    dc.off('click', '#btnDesactivar');
                    dc.off('click', '#btnPublicar');
                    dc.off('click', '#btnBorrador');
                }
            }
        };
    }, [proyectos, loaded, currentUser]);

    // Click handler: Ver proyecto
    useEffect(() => {
        const handleView = function(e) {
            e.preventDefault();
            navigate(`/cpanel/proyectos/view/${this.dataset.id}`);
        };

        $(tableRef.current).on('click', '.view-proyecto', handleView);

        return () => {
            $(tableRef.current).off('click', '.view-proyecto', handleView);
        };
    }, [navigate]);

    // Click handlers: Editar / Eliminar individual (fila)
    useEffect(() => {
        const isAdmin = currentUser?.roles?.includes("admin");

        const handleEdit = function(e) {
            e.preventDefault();
            navigate(`/cpanel/proyectos/edit/${this.dataset.id}`);
        };
        const handleDelete = async function(e) {
            e.preventDefault();
            const id = this.dataset.id;
            const ok = await confirm(1);
            if (!ok) return;
            const result = await deleteProyecto(id);
            if (result.success) {
                setProyectos(prev => prev.filter(p => p._id !== id));
                showAlertMessage('success', 'Proyecto eliminado correctamente.');
            } else {
                showAlertMessage('danger', result.error || 'Error al eliminar.');
            }
        };

        // Admin solo puede eliminar, no editar
        if (isAdmin) {
            $(tableRef.current).on('click', '.delete-proyecto', handleDelete);
            return () => {
                $(tableRef.current).off('click', '.delete-proyecto', handleDelete);
            };
        }

        $(tableRef.current).on('click', '.edit-proyecto', handleEdit);
        $(tableRef.current).on('click', '.delete-proyecto', handleDelete);

        return () => {
            $(tableRef.current).off('click', '.edit-proyecto', handleEdit);
            $(tableRef.current).off('click', '.delete-proyecto', handleDelete);
        };
    }, [navigate, currentUser]);

    // cleanup solo al desmontar
    useEffect(() => {
        return () => {
            if (dataTableRef.current) {
                dataTableRef.current.destroy();
                dataTableRef.current = null;
            }
        };
    }, []);

    const isAdmin = currentUser?.roles?.includes("admin");
    const hasPublishedProject = proyectos.some(p => p.status === 'published');

    return (
        <Container>
            <div className='fs-1'>{isAdmin ? 'Proyectos' : 'Mis Proyectos'}</div>
            {!isAdmin && (
                <Link to="/cpanel/proyectos/add" className='mt-4 d-flex gap-1 align-items-center text-body mb-5'>
                    <i className="fa-solid fa-plus bg-black rounded-circle text-white" style={{ fontSize: '10px', width: '20px', height: '20px', display: 'grid', placeItems: 'center', paddingRight: '1px' }}></i>
                    <span>Crear proyecto</span>
                </Link>
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
                        <p className="mt-3">Cargando proyectos...</p>
                    </div>
                )}
            </div>

            <div className="w-100">
                <table ref={tableRef} id="proyectos-table" className="display nowrap" style={{ width: '100%' }} />
            </div>

            {!isAdmin && hasPublishedProject && (
                <div className="position-fixed bottom-0 end-0 me-3 mb-3" style={{ zIndex: 1999 }}>
                    <div
                        className="bg-dark text-white py-2 px-4 rounded-3 d-flex align-items-center gap-2"
                        style={{ width: 'fit-content', cursor: 'pointer' }}
                        onClick={() => navigate('/cpanel/proyectos/favoritos')}
                    >
                        <i className="fa-solid fa-star"></i>
                        <span>Proyecto favorito</span>
                    </div>
                </div>
            )}
        </Container>
    );
}

export default CpProyectos;
