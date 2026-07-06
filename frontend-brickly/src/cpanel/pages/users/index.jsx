import { useEffect, useState, useRef, useCallback } from 'react';
import { Container, Alert, Modal, Button } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getUsers, getUsersPaginados } from '../../../services/listUsers';
import { updateAgente } from '../../services/agentes';
import confirm from '../../components/confirmUp';
import { API_URL, getToken } from '../../../services/authService';
import { isProfileComplete } from '../../../utils/profileUtils';
import $ from 'jquery';
import 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import 'datatables.net-responsive-dt';
import 'datatables.net-responsive-dt/css/responsive.dataTables.css';
import espanol from 'datatables.net-plugins/i18n/es-ES.mjs';

const deleteUser = async (id) => {
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterRole = searchParams.get('roles') || '';
  const filterRoleRef = useRef(filterRole);
  const [users, setUsers] = useState([]);
  const usersRef = useRef([]);
  const [loadingShow, setLoadingShow] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState('success');
  const tableRef = useRef(null);
  const dataTableRef = useRef(null);
  const highlightEligibleUserIdsRef = useRef(new Set());
  const navigate = useNavigate();

  const [showAgentsModal, setShowAgentsModal] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [agencyAgents, setAgencyAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const agentsTableRef = useRef(null);
  const agentsDataTableRef = useRef(null);

  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [highlightIds, setHighlightIds] = useState([]);
  const [highlightDate, setHighlightDate] = useState('');
  const [highlightPurpleTag, setHighlightPurpleTag] = useState(false);
  const [savingHighlight, setSavingHighlight] = useState(false);

  const rolesDisponibles = ['agente', 'agencia', 'cliente', 'arquitecto', 'desarrolladora', 'admin'];

  useEffect(() => { filterRoleRef.current = filterRole; }, [filterRole]);
  useEffect(() => { usersRef.current = users; }, [users]);

  const firstMay = useCallback((value) => {
    if (!value || typeof value !== 'string') return value || '';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }, []);

  const getRoles = useCallback((user) => Array.isArray(user?.roles) ? user.roles : [user?.roles].filter(Boolean), []);

  const getUserPublishedCount = useCallback((user) => {
    if (Array.isArray(user?.propertiesPublished)) return user.propertiesPublished.length;
    return Number(user?.propCount || user?.propertiesCount || user?.publishedPropertiesCount || 0);
  }, []);

  const getUserId = useCallback((user) => {
    if (!user?._id) return '';
    return typeof user._id === 'string' ? user._id : user._id.toString();
  }, []);

  const isHighlightEligible = useCallback((user) => {
    const userId = getUserId(user);
    return Boolean(userId && highlightEligibleUserIdsRef.current.has(userId)) || getUserPublishedCount(user) > 0;
  }, [getUserId, getUserPublishedCount]);

  const reloadUsersTable = useCallback((resetPaging = false) => {
    if (dataTableRef.current) dataTableRef.current.ajax.reload(null, resetPaging);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadHighlightEligibleUsers = async () => {
      const [agentsResult, agenciesResult] = await Promise.all([
        getUsers({ roles: 'agente', hasProperty: 'published' }),
        getUsers({ roles: 'agencia', hasProperty: 'published' })
      ]);

      if (cancelled) return;

      const eligibleIds = new Set();
      [agentsResult, agenciesResult].forEach((result) => {
        if (!result.success) {
          console.error('Error al cargar usuarios elegibles para destacar:', result.error);
          return;
        }

        result.data.forEach((user) => {
          const userId = getUserId(user);
          if (userId) eligibleIds.add(userId);
        });
      });

      highlightEligibleUserIdsRef.current = eligibleIds;

      if (dataTableRef.current) {
        dataTableRef.current.rows().invalidate('data').draw(false);
      }
      if (agentsDataTableRef.current) {
        agentsDataTableRef.current.rows().invalidate('data').draw(false);
      }
    };

    loadHighlightEligibleUsers();

    return () => {
      cancelled = true;
    };
  }, [getUserId]);

  useEffect(() => {
    if (!tableRef.current || dataTableRef.current) return;

    dataTableRef.current = $(tableRef.current).DataTable({
      language: espanol,
      responsive: true,
      deferRender: true,
      pageLength: 10,
      processing: true,
      serverSide: true,
      ajax: async function(data, callback) {
        const page = Math.floor(data.start / data.length) + 1;
        const limit = data.length;
        const search = data.search?.value || '';
        const params = { page, limit };
        if (filterRoleRef.current) params.roles = filterRoleRef.current;
        if (filterRoleRef.current === 'agente') params.parentId = 'none';
        if (search) params.search = search;

        const SORT_COLUMNS = { 1: 'name', 2: 'email', 3: 'roles', 4: 'isEnabled' };
        const order = data.order?.[0];
        if (order) params.orderby = `${SORT_COLUMNS[order.column]}:${order.dir}`;

        const result = await getUsersPaginados(params);
        if (!result.success) {
          setAlertVariant('danger');
          setAlertMessage(result.error || 'Error al cargar usuarios.');
          setShowAlert(true);
        }

        const payload = result?.data || { data: [], total: 0 };
        const rows = Array.isArray(payload.data) ? payload.data : [];
        setUsers(rows);
        setLoadingShow(false);

        callback({
          draw: data.draw,
          recordsTotal: payload.total || rows.length,
          recordsFiltered: payload.total || rows.length,
          data: rows
        });
      },
      columns: [
        {
          title: 'Foto',
          data: null,
          render: (row) => {
            const img = row.avatar
              ? `<img src="${API_URL + row.avatar.replace('/uploads', '')}" alt="avatar" class="rounded-circle object-fit-cover" style="width:40px;height:40px;" />`
              : `<i class="fa-solid fa-circle-user fs-1"></i>`;
            return `<div class="d-flex justify-content-center">${img}</div>`;
          },
          orderable: false,
          searchable: false
        },
        {
          title: 'Nombre',
          data: null,
          render: (row) => {
            const roles = getRoles(row);
            const isAgente = roles.includes('agente');
            const isAgencia = roles.includes('agencia');
            const hasProfile = isProfileComplete(row);
            const hasProps = isHighlightEligible(row);
            const isFeatured = !!row.featured_user;
            const showDestacar = (isAgente || isAgencia) && !isFeatured && hasProfile && hasProps;
            const destacarBtn = showDestacar
              ? `<a href="#" class="planes-agente d-inline-flex align-items-center gap-1 text-decoration-none destacar-btn" data-id="${row._id}" style="font-size: 12px;"><i class="fa-solid fa-diamond text-warning" style="width: 14px; flex-shrink: 0;"></i><span class="destacar-label">Destacar</span></a>`
              : '';
            const featuredBadge = isFeatured
              ? `<span class="badge" style="background-color:${row.featured_user === 2 ? '#6f42c1' : '#ffc107'}; color:${row.featured_user === 2 ? '#fff' : '#000'}; font-size: 10px;"><i class="fa-solid fa-diamond me-1"></i>Destacado</span>`
              : '';
            return `<div class="d-flex align-items-center gap-2 flex-wrap"><span>${row.name || row.username || 'N/A'}</span>${featuredBadge}${destacarBtn}</div>`;
          }
        },
        { title: 'Correo', data: null, render: (row) => row.email || 'N/A' },
        { title: 'Rol', data: null, render: (row) => getRoles(row).map(r => firstMay(r)).join(', ') || 'N/A' },
        {
          title: 'Estado',
          className: 'text-center',
          data: null,
          render: (row) => row.isEnabled !== false ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'
        },
        {
          title: '<div class="text-center">Acciones</div>',
          data: null,
          responsivePriority: 1,
          orderable: false,
          searchable: false,
          render: (row) => {
            const roles = getRoles(row);
            const isAgencia = roles.includes('agencia');
            const showEye = isAgencia;
            const eyeBtn = showEye ? `<a href="#" class="text-body view-agents" data-id="${row._id}" title="Ver agentes"><i class="fa-solid fa-eye"></i></a>` : '';
            return `<div class="d-flex gap-3 justify-content-center"><a href="#" class="text-body edit-user" data-id="${row._id}"><i class="fa-solid fa-pen-to-square"></i></a>${eyeBtn}<a href="#" class="text-body delete-user" data-id="${row._id}"><i class="fa-solid fa-trash"></i></a></div>`;
          }
        },
      ],
      destroy: true
    });

    return () => {
      if (dataTableRef.current) {
        dataTableRef.current.destroy();
        dataTableRef.current = null;
      }
    };
  }, [firstMay, getRoles, isHighlightEligible]);

  useEffect(() => {
    filterRoleRef.current = filterRole;
    reloadUsersTable(true);
  }, [filterRole, reloadUsersTable]);

  useEffect(() => {
    const handleEdit = function(e) {
      e.preventDefault();
      navigate(`/cpanel/users/edit/${this.dataset.id}`);
    };

    const handleDelete = async function(e) {
      e.preventDefault();
      const id = this.dataset.id;
      const ok = await confirm(1);
      if (!ok) return;
      const result = await deleteUser(id);
      if (result.success) {
        setUsers(prev => prev.filter(u => u._id !== id));
        setAlertVariant('success');
        setAlertMessage('Usuario eliminado correctamente.');
        reloadUsersTable(false);
      } else {
        setAlertVariant('danger');
        setAlertMessage(result.error || 'Error al eliminar.');
      }
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
    };

    const handleViewAgentsClick = async function(e) {
      e.preventDefault();
      const userId = this.dataset.id;
      const user = usersRef.current.find(u => u._id === userId);
      if (!user) return;
      const roles = getRoles(user);
      const agencyId = roles.includes('agencia') ? userId : user.parentId;
      if (!agencyId) {
        setAlertVariant('warning');
        setAlertMessage('Este agente no está asociado a una agencia.');
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 4000);
        return;
      }

      setSelectedAgency(roles.includes('agencia') ? user : { _id: agencyId, name: user.agencyName || user.parentName || 'la agencia' });
      setAgencyAgents([]);
      setShowAgentsModal(true);
      setLoadingAgents(true);
      const agentsRes = await getUsersPaginados({ roles: 'agente', parentId: agencyId, page: 1, limit: 500 });
      setLoadingAgents(false);
      if (agentsRes.success) setAgencyAgents(Array.isArray(agentsRes.data?.data) ? agentsRes.data.data : []);
      else {
        setAlertVariant('danger');
        setAlertMessage(agentsRes.error || 'Error al cargar agentes.');
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 4000);
      }
    };

    const handleDestacar = function(e) {
      e.preventDefault();
      const id = this.dataset.id;
      if (!id) return;
      setHighlightIds([id]);
      setHighlightDate('');
      setHighlightPurpleTag(false);
      setShowHighlightModal(true);
    };

    if (tableRef.current) {
      $(tableRef.current).on('click', '.edit-user', handleEdit);
      $(tableRef.current).on('click', '.delete-user', handleDelete);
      $(tableRef.current).on('click', '.view-agents', handleViewAgentsClick);
      $(tableRef.current).on('click', '.planes-agente', handleDestacar);
    }

    return () => {
      if (tableRef.current) {
        $(tableRef.current).off('click', '.edit-user', handleEdit);
        $(tableRef.current).off('click', '.delete-user', handleDelete);
        $(tableRef.current).off('click', '.view-agents', handleViewAgentsClick);
        $(tableRef.current).off('click', '.planes-agente', handleDestacar);
      }
    };
  }, [navigate, getRoles, reloadUsersTable]);

  useEffect(() => {
    const handleDestacarModal = function(e) {
      e.preventDefault();
      const id = this.dataset.id;
      if (!id) return;
      setHighlightIds([id]);
      setHighlightDate('');
      setHighlightPurpleTag(false);
      setShowHighlightModal(true);
    };
    const handleEditModal = function(e) {
      e.preventDefault();
      navigate(`/cpanel/agentes/edit/${this.dataset.id}?from=users`);
    };
    const handleDeleteModal = async function(e) {
      e.preventDefault();
      const id = this.dataset.id;
      const ok = await confirm(1, 'agente(s)');
      if (!ok) return;
      const { deleteAgente } = await import('../../services/agentes');
      const result = await deleteAgente(id);
      if (result.success) {
        setAgencyAgents(prev => prev.filter(a => a._id !== id));
        setUsers(prev => prev.filter(u => u._id !== id));
        setAlertVariant('success');
        setAlertMessage('Agente eliminado correctamente.');
        reloadUsersTable(false);
      } else {
        setAlertVariant('danger');
        setAlertMessage(result.error || 'Error al eliminar.');
      }
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
    };
    if (agentsTableRef.current) {
      $(agentsTableRef.current).on('click', '.planes-agente', handleDestacarModal);
      $(agentsTableRef.current).on('click', '.edit-agent-modal', handleEditModal);
      $(agentsTableRef.current).on('click', '.delete-agent-modal', handleDeleteModal);
    }
    return () => {
      if (agentsTableRef.current) {
        $(agentsTableRef.current).off('click', '.planes-agente', handleDestacarModal);
        $(agentsTableRef.current).off('click', '.edit-agent-modal', handleEditModal);
        $(agentsTableRef.current).off('click', '.delete-agent-modal', handleDeleteModal);
      }
    };
  }, [showAgentsModal, agencyAgents, navigate, reloadUsersTable]);

  useEffect(() => {
    if (!showAgentsModal || !agentsTableRef.current || agencyAgents.length === 0) return;
    if (agentsDataTableRef.current) {
      agentsDataTableRef.current.destroy();
      agentsDataTableRef.current = null;
    }
    const timer = setTimeout(() => {
      if (!agentsTableRef.current) return;
      agentsDataTableRef.current = $(agentsTableRef.current).DataTable({
        language: espanol,
        responsive: true,
        paging: true,
        pagingType: 'simple_numbers',
        lengthChange: false,
        info: true,
        pageLength: 5,
        data: agencyAgents,
        columns: [
          { title: 'Foto', data: null, render: (row) => row.avatar ? `<img src="${API_URL + row.avatar.replace('/uploads', '')}" alt="avatar" class="rounded-circle object-fit-cover" style="width:35px;height:35px;" />` : '<i class="fa-solid fa-circle-user fs-4"></i>', orderable: false, searchable: false },
          { title: 'Nombre', data: null, render: (row) => `${row.name || row.username || 'N/A'}${!row.featured_user && isProfileComplete(row) && isHighlightEligible(row) ? ` <a href="#" class="planes-agente d-inline-flex align-items-center gap-1 text-decoration-none destacar-btn" data-id="${row._id}" style="font-size: 12px;"><i class="fa-solid fa-diamond text-warning"></i><span>Destacar</span></a>` : ''}` },
          { title: 'Correo', data: null, render: (row) => row.email || 'N/A' },
          { title: 'Teléfono', data: null, render: (row) => row.phone || 'N/A' },
          { title: 'Estado', data: null, render: (row) => row.isEnabled !== false ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>' },
          { title: '<div class="text-center">Acciones</div>', data: null, responsivePriority: 1, orderable: false, searchable: false, render: (row) => `<div class="d-flex gap-3 justify-content-center"><a href="#" class="text-body edit-agent-modal" data-id="${row._id}"><i class="fa-solid fa-pen-to-square"></i></a><a href="#" class="text-body delete-agent-modal" data-id="${row._id}"><i class="fa-solid fa-trash"></i></a></div>` }
        ],
        destroy: true
      });
    }, 100);
    return () => {
      clearTimeout(timer);
      if (agentsDataTableRef.current) {
        agentsDataTableRef.current.destroy();
        agentsDataTableRef.current = null;
      }
    };
  }, [showAgentsModal, agencyAgents, isHighlightEligible]);

  const handleSaveHighlight = async () => {
    if (highlightIds.length === 0 || !highlightDate) return;
    setSavingHighlight(true);
    try {
      const featuredUserValue = highlightPurpleTag ? 2 : 1;
      const payload = { featured_user: featuredUserValue, featured_expire: new Date(highlightDate + 'T00:00:00.000Z') };
      const results = await Promise.all(highlightIds.map(id => updateAgente(id, payload)));
      const errores = results.filter(r => !r.success);
      if (errores.length > 0) throw new Error(errores[0].error || 'Error al destacar usuario(s).');
      const updateList = (list) => list.map(item => highlightIds.includes(item._id) ? { ...item, featured_user: featuredUserValue, featured_expire: highlightDate } : item);
      setUsers(prev => updateList(prev));
      setAgencyAgents(prev => updateList(prev));
      reloadUsersTable(false);
      setAlertVariant('success');
      setAlertMessage('Usuario(es) destacado(s) exitosamente.');
    } catch (error) {
      setAlertVariant('danger');
      setAlertMessage(error.message || 'Error al destacar usuario(s).');
    }
    setSavingHighlight(false);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 4000);
    setShowHighlightModal(false);
  };

  const handleRoleFilter = (role) => setSearchParams(role ? { roles: role } : {});
  const highlightedUser = highlightIds.length === 1 ? [...users, ...agencyAgents].find(u => u._id === highlightIds[0]) : null;
  const highlightedIsAgent = highlightedUser && getRoles(highlightedUser).includes('agente');

  return (
    <Container>
      <div className='fs-1'>Lista de usuarios</div>
      <Link to="/cpanel/users/add" className='mt-4 d-flex gap-1 align-items-center text-body mb-5'>
        <i className="fa-solid fa-plus bg-black rounded-circle text-white" style={{ fontSize: '10px', width: '20px', height: '20px', display: 'grid', placeItems: 'center', paddingRight: '1px' }}></i>
        <span>Crear usuario</span>
      </Link>

      {showAlert && <Alert variant={alertVariant} onClose={() => setShowAlert(false)} dismissible className="position-fixed bottom-0 end-0 m-3 shadow-sm" style={{ zIndex: 9999 }}><div className="d-flex align-items-center gap-2"><i className={`fa-solid ${alertVariant === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i><span>{alertMessage}</span></div></Alert>}

      {loadingShow && <div className="text-center py-5"><div className="spinner-border text-primary" /><p className="mt-3">Cargando usuarios...</p></div>}

      {!loadingShow && <div className="d-flex gap-2 align-items-center flex-wrap mb-4">
        <div onClick={() => handleRoleFilter('')} className='border py-1 px-3 rounded-1' style={{ fontSize: '14px', color: !filterRole ? '#fff' : '#5D5B5A', backgroundColor: !filterRole ? '#000' : '#FAFAFA', width: 'fit-content', cursor: 'pointer', transition: 'all 0.2s ease' }}>Todos</div>
        {rolesDisponibles.map(rol => <div key={rol} onClick={() => handleRoleFilter(filterRole === rol ? '' : rol)} className='border py-1 px-3 rounded-1' style={{ fontSize: '14px', color: filterRole === rol ? '#fff' : '#5D5B5A', backgroundColor: filterRole === rol ? '#000' : '#FAFAFA', width: 'fit-content', cursor: 'pointer', transition: 'all 0.2s ease' }}>{rol.charAt(0).toUpperCase() + rol.slice(1)}</div>)}
      </div>}

      <div className="w-100" style={{ display: loadingShow ? 'none' : 'block' }}><table ref={tableRef} className="display nowrap" style={{ width: '100%' }} /></div>

      <Modal show={showAgentsModal} onHide={() => setShowAgentsModal(false)} centered size="lg">
        <Modal.Header closeButton><Modal.Title><i className="fa-solid fa-users me-2"></i>Agentes de {selectedAgency?.name || selectedAgency?.username || 'la agencia'}</Modal.Title></Modal.Header>
        <Modal.Body>{loadingAgents ? <div className="text-center py-4"><div className="spinner-border text-primary" /><p className="mt-3 mb-0">Cargando agentes...</p></div> : agencyAgents.length === 0 ? <div className="text-center py-4 text-muted"><i className="fa-solid fa-user-slash fs-1 mb-3 d-block"></i><p>Esta agencia no tiene agentes registrados.</p></div> : <div className="w-100"><table ref={agentsTableRef} className="display nowrap" style={{ width: '100%' }} /></div>}</Modal.Body>
        <Modal.Footer><Button variant="outline-dark" className="rounded-pill px-4" onClick={() => setShowAgentsModal(false)}>Cerrar</Button></Modal.Footer>
      </Modal>

      <Modal show={showHighlightModal} onHide={() => setShowHighlightModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Destacar</Modal.Title></Modal.Header>
        <Modal.Body><div className="mb-3">{highlightedIsAgent && <div className="form-check d-flex align-items-baseline gap-2 mb-3"><input type="checkbox" className="form-check-input border-dark" id="purpleTagCheckbox" checked={highlightPurpleTag} onChange={(e) => setHighlightPurpleTag(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} /><label className="form-check-label fw-semibold mt-0 pt-0" htmlFor="purpleTagCheckbox" style={{ cursor: 'pointer' }}>Etiqueta morada</label></div>}<label className="form-label fw-semibold">Fecha de expiración</label><div className="position-relative"><input type="date" required className="form-control rounded-pill" value={highlightDate} onChange={(e) => setHighlightDate(e.target.value)} min={new Date().toISOString().split('T')[0]} /><i className="fa-regular fa-calendar position-absolute top-50 end-0 translate-middle-y me-3" style={{ color: '#6c757d', fontSize: '16px', pointerEvents: 'none', zIndex: 1 }}></i></div></div></Modal.Body>
        <Modal.Footer><Button variant="outline-dark" className="rounded-pill px-4" onClick={() => setShowHighlightModal(false)}>Cancelar</Button><Button variant="dark" className="rounded-pill px-4" onClick={handleSaveHighlight} disabled={savingHighlight || !highlightDate}>{savingHighlight ? <span className="spinner-border spinner-border-sm me-2" /> : null}Guardar</Button></Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Index;
