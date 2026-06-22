import { useEffect, useState, useRef } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { getAsociados, deleteAsociado } from '../../services/asociados';
import { getLogoUrl } from '../../../services/logoService';
import confirm from '../../components/confirmUp';
import $ from 'jquery';
import 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import 'datatables.net-responsive-dt';
import 'datatables.net-responsive-dt/css/responsive.dataTables.css';
import espanol from 'datatables.net-plugins/i18n/es-ES.mjs';

function Index() {
    const [asociados, setAsociados] = useState([]);
    const [loadingShow, setLoadingShow] = useState(false);
    const [loaded, setLoaded] = useState(false);
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
            const result = await getAsociados();
            if (result.success) {
                const data = Array.isArray(result.data) ? result.data : [];
                setAsociados(data);
            } else {
                setAlertVariant('danger');
                setAlertMessage(result.error || 'Error al cargar asociados.');
                setShowAlert(true);
            }
            setLoadingShow(false);
            setLoaded(true);
        };
        load();
    }, []);

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
            pageLength: 6,
            info: false,
            data: asociados,
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
                    title: 'Logo',
                    data: null,
                    render: (row) => {
                        const imgUrl = row.logo_url ? getLogoUrl(row.logo_url) : null;
                        const img = imgUrl
                            ? `<img src="${imgUrl}" alt="logo" class="rounded-circle object-fit-cover" style="width: 40px; height: 40px;" />`
                            : '<i class="fa-solid fa-image fs-1"></i>';
                        return `<div class="d-flex justify-content-center">${img}</div>`;
                    },
                    orderable: false,
                    searchable: false
                },
                {
                    title: 'Nombre',
                    data: null,
                    render: (row) => row.name || 'N/A'
                },
                {
                    title: 'Categoría',
                    data: null,
                    render: (row) => row.category || 'N/A'
                },
                {
                    title: 'Fecha de expiración',
                    data: null,
                    render: (row) => row.expire_date
                        ? (() => {
                            const parts = row.expire_date.split('T')[0].split('-');
                            if (parts.length === 3) {
                                const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                                return `${parseInt(parts[2])} de ${meses[parseInt(parts[1]) - 1]} de ${parts[0]}`;
                            }
                            return row.expire_date.split('T')[0];
                        })()
                        : 'N/A'
                },
                {
                    title: '<div class="text-center">Acciones</div>',
                    data: null,
                    responsivePriority: 1,
                    orderable: false,
                    searchable: false,
                    render: (row) => `
                        <div class="d-flex gap-3 justify-content-center">
                            <a href="#" class="text-body edit-asociado" data-id="${row._id}">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </a>
                            <a href="#" class="text-body delete-asociado" data-id="${row._id}">
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

                    if (asociados.length > 0) {
                        const actionRow = document.createElement('div');
                        actionRow.className = 'd-flex align-items-center gap-3 mt-2 px-3';

                        const checkboxDiv = document.createElement('div');
                        checkboxDiv.className = 'form-check d-flex align-items-center gap-2 mb-0';
                        checkboxDiv.innerHTML = `<input type="checkbox" class="form-check-input border-dark" id="selectAllCheckbox">`;

                        const eliminarBtn = document.createElement('button');
                        eliminarBtn.className = 'btn btn-sm btn-outline-dark rounded-4 px-3 action-btn';
                        eliminarBtn.id = 'btnEliminar';
                        eliminarBtn.disabled = true;
                        eliminarBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Eliminar';

                        actionRow.appendChild(checkboxDiv);
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
            $('#btnEliminar').prop('disabled', selectedCount === 0);
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

        // Eliminar múltiples
        dtContainer.on('click', '#btnEliminar', async function () {
            const idsAEliminar = dataTableRef.current.$('.delete-checkbox:checked')
                .map(function () { return $(this).data('id'); }).get();
            if (idsAEliminar.length === 0) return;

            const respuesta = await confirm(idsAEliminar.length, 'asociado(s)');
            if (!respuesta) return;

            setLoading(true);
            setLoadingMessage('Eliminando asociados...');
            try {
                await Promise.all(idsAEliminar.map(id => deleteAsociado(id)));
                setAsociados(prev => prev.filter(a => !idsAEliminar.includes(a._id)));
                setAlertVariant('success');
                setAlertMessage('Asociado(s) eliminado(s) correctamente.');
                setShowAlert(true);
                setTimeout(() => setShowAlert(false), 4000);
                $('#selectAllCheckbox').prop('checked', false);
                $('#btnEliminar').prop('disabled', true);
            } catch (error) {
                setAlertVariant('danger');
                setAlertMessage('Error al eliminar asociados.');
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
                }
            }
        };
    }, [asociados, loaded]);

    // Eventos editar / eliminar individual (fila)
    useEffect(() => {
        const handleEdit = function(e) {
            e.preventDefault();
            navigate(`/cpanel/asociados/edit/${this.dataset.id}`);
        };
        const handleDelete = async function(e) {
            e.preventDefault();
            const id = this.dataset.id;
            const ok = await confirm(1, 'asociado(s)');
            if (!ok) return;
            const result = await deleteAsociado(id);
            if (result.success) {
                setAsociados(prev => prev.filter(a => a._id !== id));
                setAlertVariant('success');
                setAlertMessage('Asociado eliminado correctamente.');
            } else {
                setAlertVariant('danger');
                setAlertMessage(result.error || 'Error al eliminar.');
            }
            setShowAlert(true);
            setTimeout(() => setShowAlert(false), 4000);
        };

        $(tableRef.current).on('click', '.edit-asociado', handleEdit);
        $(tableRef.current).on('click', '.delete-asociado', handleDelete);

        return () => {
            $(tableRef.current).off('click', '.edit-asociado', handleEdit);
            $(tableRef.current).off('click', '.delete-asociado', handleDelete);
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
            <div className='fs-1'>Lista de asociados</div>
            <Link to="/cpanel/asociados/add" className='mt-4 d-flex gap-1 align-items-center text-body mb-5'>
                <i className="fa-solid fa-plus bg-black rounded-circle text-white" style={{ fontSize: '10px', width: '20px', height: '20px', display: 'grid', placeItems: 'center', paddingRight: '1px' }}></i>
                <span>Asignar asociado</span>
            </Link>

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
                        <p className="mt-3">Cargando asociados...</p>
                    </div>
                )}
            </div>

            <div className="w-100">
                <table ref={tableRef} id="asociados-table" className="display nowrap" style={{ width: '100%' }} />
            </div>
        </Container>
    );
}

export default Index;
