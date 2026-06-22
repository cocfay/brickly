import { useEffect, useState, useRef, useCallback } from 'react';
import { Container, Alert, Modal, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { getPropiedadesPaginadas, deletePropiedad, updatePropiedad, assignAgents } from '../../services/propiedades';
import { invalidateCache } from '../../services/propiedadesCache';
import { validateRequiredFields } from '../../services/validacionPropiedades';
import { saveEasyBrokerApiKey, syncEasyBroker } from '../../services/sync';
import { getCurrentUser, API_URL } from '../../../services/authService';
import { getAgentes } from '../../services/agentes';
import { getUsers } from '../../../services/listUsers';
import sinPropiedad from './../../assets/images/iconos/sinPropiedad.png'
import diamond from '../../../assets/images/iconos/diamond.png';
import crm2 from '../../assets/images/crms/EasyBroker.png';
import confirm from './../../components/confirmUp'
import alertify from 'alertifyjs';
import $ from 'jquery';
import 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import 'datatables.net-responsive-dt';
import 'datatables.net-responsive-dt/css/responsive.dataTables.css';
import espanol from 'datatables.net-plugins/i18n/es-ES.mjs';
import './../../../assets/css/asesores.css';

function Index() {
  // Clave de sessionStorage para persistir estado del DataTable entre navegaciones
  // MUST estar antes de cualquier useState/useRef que la use (temporal dead zone)
  const idUser = getCurrentUser();
  const DT_SESSION_KEY = `cpanel_propiedades_dt_${idUser?._id ?? 'u'}`;

  const [listPro, setListPro] = useState([]);
  const [activeFilter, setActiveFilter] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DT_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activeFilter) return parsed.activeFilter;
      }
    } catch {}
    return 'all';
  });
  const activeFilterRef = useRef(activeFilter);
  const [statusFilter, setStatusFilter] = useState('');
  const [All, setAll] = useState(0);
  const [Sold, setSold] = useState(0);
  const [Rent, setRent] = useState(0);
  const [activeStatusBtn, setActiveStatusBtn] = useState(() => {
    const user = getCurrentUser();
    const defaultStatus = user?.roles?.includes('admin') ? 'pre-published' : 'all';
    try {
      const saved = sessionStorage.getItem(DT_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activeStatusBtn) return parsed.activeStatusBtn;
      }
    } catch {}
    return defaultStatus;
  });
  const activeStatusBtnRef = useRef(activeStatusBtn);
  const [CountDraft, setCountDraft] = useState(0);
  const [CountPublished, setCountPublished] = useState(0);
  const [CountPrePublished, setCountPrePublished] = useState(0);
  const [CountSold, setCountSold] = useState(0);
  const [CountDisabled, setCountDisabled] = useState(0);
  const [CountRejected, setCountRejected] = useState(0);
  const tableRef = useRef(null);
  const dataTableRef = useRef(null);
  // Leer búsqueda y página guardados desde sessionStorage (al volver de view/edit)
  const savedSearchRef = useRef(
    (() => {
      try {
        const saved = sessionStorage.getItem(DT_SESSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.search || '';
        }
      } catch {}
      return '';
    })()
  );
  const savedPageRef = useRef(
    (() => {
      try {
        const saved = sessionStorage.getItem(DT_SESSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.page || 0;
        }
      } catch {}
      return 0;
    })()
  );
  const navigate = useNavigate();

  const isAgencia = idUser?.roles?.includes('agencia');
  const isAdmin = idUser?.roles?.includes('admin');
  const isAgente = idUser?.roles?.includes('agente');

  // Refs para valores que necesita el DataTable (evitar re-ejecución del useEffect)
  const isAdminRef = useRef(isAdmin);
  const isAgenciaRef = useRef(isAgencia);
  const isAgenteRef = useRef(isAgente);
  const idUserRef = useRef(idUser);
  const usersMapRef = useRef({});
  const agenciesMapRef = useRef({});

  // Escuchar cambios de estado desde view.jsx (rechazar, aprobar, etc.)
  useEffect(() => {
    const handler = (e) => {
      const { id, newStatus } = e.detail;
      if (!id || !newStatus) return;

      setListPro(prev => prev.map(item =>
        item._id === id ? { ...item, status: newStatus } : item
      ));
    };

    window.addEventListener('propiedad-status-changed', handler);
    return () => window.removeEventListener('propiedad-status-changed', handler);
  }, []);

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState('success');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Procesando...');
  const [loadingShow, setLoadingShow] = useState(true); // inicia en true hasta que lleguen los datos

  // Modal asignar agentes
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [modalPropId, setModalPropId] = useState(null);
  const [agentesOptions, setAgentesOptions] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [savingAgents, setSavingAgents] = useState(false);
  const hasAgentsRef = useRef(false);

  // Modal EasyBroker
  const [showEasyBrokerModal, setShowEasyBrokerModal] = useState(false);
  const [easyBrokerApiKey, setEasyBrokerApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [easyBrokerConnected, setEasyBrokerConnected] = useState(false);
  const [syncingEasyBroker, setSyncingEasyBroker] = useState(false);

  // Si el usuario ya tiene una API Key de EasyBroker en su perfil, mostrar directamente el botón Sincronizar
  useEffect(() => {
    if (idUser?.easyBrokerApiKey) {
      setEasyBrokerConnected(true);
    }
  }, []);

  // Modal destacar propiedades
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [highlightIds, setHighlightIds] = useState([]);
  const [highlightDate, setHighlightDate] = useState('');
  const [savingHighlight, setSavingHighlight] = useState(false);

  // Modal rechazar propiedad
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReasons, setRejectReasons] = useState({ lowImagen: false, incompleteData: false });
  const [rejectPropId, setRejectPropId] = useState(null);

  // Modal ver motivo de rechazo (solo lectura)
  const [showViewRejectModal, setShowViewRejectModal] = useState(false);
  const [viewRejectReasons, setViewRejectReasons] = useState({ lowImagen: false, incompleteData: false });

  // Mapa de usuarios para mostrar agencia en columna #
  const [usersMap, setUsersMap] = useState({});
  const [agenciesMap, setAgenciesMap] = useState({});

  // Mantener refs sincronizadas con los maps
  useEffect(() => { usersMapRef.current = usersMap; }, [usersMap]);
  useEffect(() => { agenciesMapRef.current = agenciesMap; }, [agenciesMap]);

  // Función para cargar propiedades paginadas desde la API (usa refs para evitar dependencias)
  const fetchPage = useCallback(async (page, limit, status, mode) => {
    const params = { page, limit };
    if (status && status !== 'all') params.status = status;
    if (mode && mode !== 'all') params.mode = mode;
    if (!isAdminRef.current) params.userId = idUserRef.current._id;

    const response = await getPropiedadesPaginadas(params);
    if (response.success) {
      return response.data;
    }
    return { data: [], total: 0, page: 1, limit, totalPages: 1 };
  }, []);

  // Cargar contadores con consultas limit=1 (solo obtenemos el total)
  const loadCounters = useCallback(async () => {
    if (!idUser?._id) return;

    const baseParams = { limit: 1, page: 1 };
    if (!isAdmin) baseParams.userId = idUser._id;

    const statuses = ['draft', 'published', 'pre-published', 'sold', 'disabled', 'rejected'];
    const results = await Promise.allSettled(
      statuses.map(s => getPropiedadesPaginadas({ ...baseParams, status: s }))
    );

    const counts = results.map(r => {
      if (r.status === 'fulfilled' && r.value.success) {
        return r.value.data.total || 0;
      }
      return 0;
    });

    setCountDraft(counts[0]);
    setCountPublished(counts[1]);
    setCountPrePublished(counts[2]);
    setCountSold(counts[3]);
    setCountDisabled(counts[4]);
    setCountRejected(counts[5]);

    const [allResult, ventaResult, alquilerResult] = await Promise.allSettled([
      getPropiedadesPaginadas({ ...baseParams, limit: 1, page: 1 }),
      getPropiedadesPaginadas({ ...baseParams, limit: 1, page: 1, mode: 'Venta' }),
      getPropiedadesPaginadas({ ...baseParams, limit: 1, page: 1, mode: 'Alquiler' }),
    ]);

    setAll(allResult.status === 'fulfilled' && allResult.value.success ? allResult.value.data.total : 0);
    setSold(ventaResult.status === 'fulfilled' && ventaResult.value.success ? ventaResult.value.data.total : 0);
    setRent(alquilerResult.status === 'fulfilled' && alquilerResult.value.success ? alquilerResult.value.data.total : 0);

    return counts[2]; // retorna CountPrePublished
  }, [idUser, isAdmin]);

  useEffect(() => {
    if (!isAgencia) return;
    getAgentes().then(result => {
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        const completos = data.filter(a =>
          a.name && a.phone &&
          a.agentInfo?.description &&
          a.agentInfo?.specialization &&
          a.agentInfo?.expe &&
          a.agentInfo?.address &&
          a.agentInfo?.languages?.length > 0
        );
        const opts = completos.map(a => ({
          value: a._id,
          label: a.name || a.email,
          avatar: a.avatar ? API_URL + a.avatar.replace('/uploads', '') : null,
          isEnabled: a.isEnabled !== false
        }));
        setAgentesOptions(opts);
        hasAgentsRef.current = opts.filter(o => o.isEnabled).length > 0;
      }
    });
  }, []);

  // Cargar mapa de usuarios (para mostrar agencia en columna #)
  useEffect(() => {
    if (!isAdmin) return;
    getUsers().then(result => {
      if (result.success && Array.isArray(result.data)) {
        const uMap = {};
        const aMap = {};
        result.data.forEach(u => {
          uMap[u._id] = u;
          if (Array.isArray(u.roles) && u.roles.includes('agencia')) {
            aMap[u._id] = u.name || u.username || 'N/A';
          }
        });
        setUsersMap(uMap);
        setAgenciesMap(aMap);
      }
    });
  }, []);

  useEffect(() => {
    if (idUser?._id) {
      loadCounters().then((countPrePublished) => {
        setLoadingShow(false);
        // Solo sobrescribir status si el usuario NO tenía uno guardado en sessionStorage
        if (isAdmin && countPrePublished === 0) {
          try {
            const saved = sessionStorage.getItem(DT_SESSION_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.activeStatusBtn) return; // ya tenía status guardado, no sobrescribir
            }
          } catch {}
          setActiveStatusBtn('all');
          activeStatusBtnRef.current = 'all';
        }
      });
    }
  }, [idUser, isAdmin, loadCounters]);

  // Efecto para inicializar el DataTable UNA SOLA VEZ (cuando loadingShow pasa a false)
  useEffect(() => {
    if (!loadingShow && tableRef.current && !dataTableRef.current) {
      const firstLoadRef = { current: true };

      dataTableRef.current = $(tableRef.current).DataTable({
        language: espanol,
        responsive: true,
        deferRender: true,
        pageLength: 6,
        serverSide: true,
        ajax: async function(data, callback, settings) {
          // En la primera carga, usar la página guardada para que DataTables
          // muestre el indicador de página correcto y reciba los datos correctos
          if (firstLoadRef.current && savedPageRef.current > 0) {
            data.start = savedPageRef.current * data.length;
            firstLoadRef.current = false;
          }
          const page = Math.floor(data.start / data.length) + 1;
          const limit = data.length;

          const status = activeStatusBtnRef.current !== 'all' ? activeStatusBtnRef.current : undefined;
          const mode = activeFilterRef.current !== 'all' ? activeFilterRef.current : undefined;

          const result = await fetchPage(page, limit, status, mode);

          callback({
            draw: data.draw,
            recordsTotal: result.total,
            recordsFiltered: result.total,
            data: result.data
          });
        },
        layout: {
          topStart: function() {
            let div = document.createElement('div');
            div.className = 'd-flex flex-column gap-2 w-100 align-items-start';

            const filterRow = document.createElement('div');
            filterRow.className = 'd-flex align-items-center gap-2 flex-wrap';
            
            const btnAll = document.createElement('button');
            btnAll.id = 'btnFilterAll';
            btnAll.className = `filterButtonTable ${activeFilter === 'all' && activeStatusBtn === 'all' ? 'active' : ''}`;
            btnAll.innerHTML = `Todas (${All})`;
            btnAll.onclick = function() {
              filterByType('all');
              filterByStatus('all');
            }
            
            filterRow.appendChild(btnAll);

            const modeDropdown = document.createElement('div');
            modeDropdown.className = 'dropdown ms2 align-items-center';
            modeDropdown.style.position = 'relative';
            modeDropdown.style.display = 'flex';

            const modeBtn = document.createElement('button');
            modeBtn.id = 'btnModeDropdown';
            modeBtn.className = 'btn btn-sm btn-outline-dark dropdown-toggle rounded-pill px-3 py-1';
            modeBtn.type = 'button';
            var modeLabel = 'Modalidad';
            if (activeFilter === 'Venta') modeLabel = 'Venta';
            else if (activeFilter === 'Alquiler') modeLabel = 'Alquiler';
            modeBtn.innerHTML = '<i class="fa-solid fa-layer-group me-1"></i> ' + modeLabel;

            const modeMenu = document.createElement('ul');
            modeMenu.className = 'dropdown-menu status-dropdown-menu';
            modeMenu.style.position = 'absolute';
            modeMenu.style.top = '100%';
            modeMenu.style.left = '0';
            modeMenu.style.zIndex = '1000';
            modeMenu.style.display = 'none';
            modeMenu.style.minWidth = '180px';
            modeMenu.style.padding = '8px 0';
            modeMenu.style.margin = '4px 0 0';
            modeMenu.style.fontSize = '14px';
            modeMenu.style.backgroundColor = '#fff';
            modeMenu.style.backgroundClip = 'padding-box';
            modeMenu.style.border = '1px solid rgba(0,0,0,0.15)';
            modeMenu.style.borderRadius = '8px';
            modeMenu.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
            modeMenu.style.listStyle = 'none';

            modeBtn.onclick = function(e) {
              e.stopPropagation();
              var isOpen = modeMenu.style.display === 'block';
              document.querySelectorAll('.status-dropdown-menu.open').forEach(function(m) {
                m.style.display = 'none';
                m.classList.remove('open');
              });
              if (!isOpen) {
                modeMenu.style.display = 'block';
                modeMenu.classList.add('open');
              } else {
                modeMenu.style.display = 'none';
                modeMenu.classList.remove('open');
              }
            };

            document.addEventListener('click', function closeModeMenu(e) {
              if (!modeDropdown.contains(e.target)) {
                modeMenu.style.display = 'none';
                modeMenu.classList.remove('open');
              }
            });

            const modeBtnConfig = [
              { mode: 'Venta', label: 'Venta', count: Sold },
              { mode: 'Alquiler', label: 'Alquiler', count: Rent }
            ];

            modeBtnConfig.forEach(function(cfg) {
              var li = document.createElement('li');
              var a = document.createElement('a');
              a.href = '#';
              a.style.display = 'flex';
              a.style.alignItems = 'center';
              a.style.gap = '8px';
              a.style.padding = '6px 16px';
              a.style.color = '#212529';
              a.style.textDecoration = 'none';
              a.style.cursor = 'pointer';
              a.style.whiteSpace = 'nowrap';
              var isActive = activeFilter === cfg.mode;
              if (isActive) {
                a.style.backgroundColor = '#0d6efd';
                a.style.color = '#fff';
              } else {
                a.style.backgroundColor = 'transparent';
              }
              a.onmouseenter = function() {
                if (!isActive) a.style.backgroundColor = '#f0f0f0';
              };
              a.onmouseleave = function() {
                if (!isActive) a.style.backgroundColor = 'transparent';
              };
              a.innerHTML = cfg.label + ' <span class="badge bg-secondary rounded-pill ms-auto">' + cfg.count + '</span>';
              a.onclick = function(e) {
                e.preventDefault();
                modeMenu.style.display = 'none';
                modeMenu.classList.remove('open');
                filterByType(cfg.mode);
              };
              li.appendChild(a);
              modeMenu.appendChild(li);
            });

            modeDropdown.appendChild(modeBtn);
            modeDropdown.appendChild(modeMenu);
            filterRow.appendChild(modeDropdown);

            const statusDropdown = document.createElement('div');
            statusDropdown.className = 'dropdown ms2 align-items-center';
            statusDropdown.style.position = 'relative';
            statusDropdown.style.display = 'flex';

            const statusBtn = document.createElement('button');
            statusBtn.id = 'btnStatusDropdown';
            statusBtn.className = 'btn btn-sm btn-outline-dark dropdown-toggle rounded-pill px-3 py-1';
            statusBtn.type = 'button';
            var statusLabel = 'Status';
            if (activeStatusBtn === 'pre-published') statusLabel = 'Pendiente';
            else if (activeStatusBtn === 'published') statusLabel = 'Publicado';
            else if (activeStatusBtn === 'draft') statusLabel = 'Borrador';
            else if (activeStatusBtn === 'disabled') statusLabel = 'Desactivado';
            else if (activeStatusBtn === 'rejected') statusLabel = 'Rechazado';
            else if (activeStatusBtn === 'sold') statusLabel = 'Vendido';
            statusBtn.innerHTML = '<i class="fa-solid fa-filter me-1"></i> ' + statusLabel;

            const statusMenu = document.createElement('ul');
            statusMenu.className = 'dropdown-menu';
            statusMenu.style.position = 'absolute';
            statusMenu.style.top = '100%';
            statusMenu.style.left = '0';
            statusMenu.style.zIndex = '1000';
            statusMenu.style.display = 'none';
            statusMenu.style.minWidth = '220px';
            statusMenu.style.padding = '8px 0';
            statusMenu.style.margin = '4px 0 0';
            statusMenu.style.fontSize = '14px';
            statusMenu.style.backgroundColor = '#fff';
            statusMenu.style.backgroundClip = 'padding-box';
            statusMenu.style.border = '1px solid rgba(0,0,0,0.15)';
            statusMenu.style.borderRadius = '8px';
            statusMenu.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
            statusMenu.style.listStyle = 'none';

            statusBtn.onclick = function(e) {
              e.stopPropagation();
              var isOpen = statusMenu.style.display === 'block';
              document.querySelectorAll('.status-dropdown-menu.open').forEach(function(m) {
                m.style.display = 'none';
                m.classList.remove('open');
              });
              if (!isOpen) {
                statusMenu.style.display = 'block';
                statusMenu.classList.add('open');
              } else {
                statusMenu.style.display = 'none';
                statusMenu.classList.remove('open');
              }
            };

            document.addEventListener('click', function closeMenu(e) {
              if (!statusDropdown.contains(e.target)) {
                statusMenu.style.display = 'none';
                statusMenu.classList.remove('open');
              }
            });

            const statusBtnConfig = [
              { status: 'pre-published', label: 'Pendiente', count: CountPrePublished, bg: '#ffc107' },
              { status: 'published', label: 'Publicado', count: CountPublished, bg: '#198754' },
              { status: 'draft', label: 'Borrador', count: CountDraft, bg: '#6c757d' },
              { status: 'disabled', label: 'Desactivado', count: CountDisabled, bg: '#212529' },
              { status: 'rejected', label: 'Rechazado', count: CountRejected, bg: '#dc3545' }
            ];

            statusBtnConfig.forEach(function(cfg) {
              var li = document.createElement('li');
              var a = document.createElement('a');
              a.href = '#';
              a.style.display = 'flex';
              a.style.alignItems = 'center';
              a.style.gap = '8px';
              a.style.padding = '6px 16px';
              a.style.color = '#212529';
              a.style.textDecoration = 'none';
              a.style.cursor = 'pointer';
              a.style.whiteSpace = 'nowrap';
              var isActive = activeStatusBtn === cfg.status;
              if (isActive) {
                a.style.backgroundColor = '#0d6efd';
                a.style.color = '#fff';
              } else {
                a.style.backgroundColor = 'transparent';
              }
              a.onmouseenter = function() {
                if (!isActive) a.style.backgroundColor = '#f0f0f0';
              };
              a.onmouseleave = function() {
                if (!isActive) a.style.backgroundColor = 'transparent';
              };
              var dot = document.createElement('span');
              dot.style.display = 'inline-block';
              dot.style.width = '10px';
              dot.style.height = '10px';
              dot.style.borderRadius = '50%';
              dot.style.backgroundColor = cfg.bg;
              dot.style.flexShrink = '0';
              a.appendChild(dot);
              a.innerHTML += cfg.label + ' <span class="badge bg-secondary rounded-pill ms-auto">' + cfg.count + '</span>';
              a.onclick = function(e) {
                e.preventDefault();
                statusMenu.style.display = 'none';
                statusMenu.classList.remove('open');
                filterByStatus(cfg.status);
              };
              li.appendChild(a);
              statusMenu.appendChild(li);
            });

            statusDropdown.appendChild(statusBtn);
            statusDropdown.appendChild(statusMenu);
            filterRow.appendChild(statusDropdown);

            const actionRow = document.createElement('div');
            actionRow.className = 'd-flex align-items-center gap-3 mt-4 px-3';
          
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'form-check d-flex align-items-center gap-2 mb-0';
            checkboxDiv.innerHTML = `
              <input type="checkbox" class="form-check-input border-dark" id="selectAllCheckbox">
            `;

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
            publicarBtn.innerHTML = isAdminRef.current
              ? '<i class="fa-solid fa-check"></i> Publicar'
              : '<i class="fa-solid fa-paper-plane"></i> Enviar a revisión';

            const borradorBtn = document.createElement('button');
            borradorBtn.className = 'btn btn-sm btn-outline-secondary rounded-4 px-3 action-btn';
            borradorBtn.id = 'btnBorrador';
            borradorBtn.disabled = true;
            borradorBtn.innerHTML = '<i class="fa-duotone fa-solid fa-file-pen"></i> Borrador';

            let destacarBtn = null;
            if (isAdminRef.current) {
              destacarBtn = document.createElement('button');
              destacarBtn.className = 'btn btn-sm btn-dark rounded-4 px-3 action-btn d-flex align-items-center gap-1';
              destacarBtn.id = 'btnDestacar';
              destacarBtn.disabled = true;
              destacarBtn.innerHTML = `<img src="${diamond}" alt="icon" style="width:14px;height:14px;object-fit:contain;flex-shrink:0;" /> Destacar`;
            }

            actionRow.appendChild(checkboxDiv);
            actionRow.appendChild(publicarBtn);
            actionRow.appendChild(borradorBtn);
            actionRow.appendChild(desactivarBtn);
            actionRow.appendChild(eliminarBtn);
            if (destacarBtn) {
              actionRow.appendChild(destacarBtn);
            }

            div.appendChild(filterRow);
            div.appendChild(actionRow);

            return div;
          },
        },
        columns: [
          {
            title: "#",
            data: null,
            defaultContent: '',
            width: isAdminRef.current ? '120px' : '40px',
            className: 'text-center',
            render: function(data, type, row, meta) {
              let html = `<span class="fw-bold row-number">${meta.row + 1}</span>`;
              if (isAdminRef.current && row.agents && row.agents.length > 0) {
                const agencyNames = row.agents
                  .map(aId => {
                    const user = usersMapRef.current[aId];
                    if (user?.parentId && agenciesMapRef.current[user.parentId]) {
                      return agenciesMapRef.current[user.parentId];
                    }
                    return null;
                  })
                  .filter((v, i, a) => v && a.indexOf(v) === i)
                  .join(', ');
                if (agencyNames) {
                  html += `<br><small class="text-muted text-nowrap" style="font-size:14px;line-height:1.2;display:inline-block;">${agencyNames}</small>`;
                }
              }
              html += `<br><span class="text-muted text-nowrap" style="font-size:12px;">${new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
  .format(new Date(data.createdAt)).replace(/\//g, '-')}</span>`;
              return html;
            },
            orderable: false,
            searchable: false
          },
          {
            title: "",
            data: null,
            defaultContent: '',
            responsivePriority: 1,
            render: function(row){
              return `
                <div class="d-flex justify-content-center align-items-center">
                  <input type="checkbox" class="form-check-input border-dark delete-checkbox" data-id="${row._id}" style="color-scheme: auto;">
                </div>
              `
            },
            orderable: false,
            searchable: false
          },
          { 
            title: "", 
            data: null,
            defaultContent: '',
            render: function(row) {
              let imagen = ''
              if(row?.media?.photos && row?.media?.photos.length > 0){
                const myPhoto = row.media.photos.find(photo => photo.isMain === true)
                if(myPhoto?.thumbnail){
                  imagen = API_URL+'/'+myPhoto.thumbnail 
                }
              }
              return `
                <div class="d-flex justify-content-center">
                  <img src="${imagen || sinPropiedad}" alt="image" style="width:150px;height:150px;object-fit:cover;" class="m-auto" />
                </div>
              `;
            },
            orderable: false,
            searchable: false
          },
          { 
            title: "Propiedad", 
            data: null,
            defaultContent: '',
            width: '280px',
            render: function(row) { 
              let data = ''
              if(row.market?.title !== ''){
              data += `<div style="min-width:220px;position:relative;"><span class="prop-title-text text-truncate"> ${row.market?.title || ''}</span>`;
                if (row.featured?.isActive) {
                  data += `<span class="planes-propiedad btn btn-sm rounded-4 d-inline-flex align-items-center gap-2 px-3 py-1" style="background-color:#198754; color:#fff; border:none; white-space:nowrap; text-decoration:none;">
                    <i class="fa-solid fa-diamond" style="font-size:12px;"></i>Destacada
                  </span>`;
                }
                if (isAdminRef.current && !row.featured?.isActive && row.status === 'published') {
                  data += `<a href="#" class="planes-propiedad btn btn-sm btn-dark rounded-4 d-inline-flex align-items-center gap-2 px-3 py-1" style="white-space:nowrap;text-decoration:none;">
                    <img src="${diamond}" alt="icon" style="width:14px;height:14px;object-fit:contain;flex-shrink:0;" /> Destacar
                  </a>`;
                }
                data += `</div>`;
              }
              return data
            }
          },
          { 
            title: "Tipo propiedad", 
            data: null,
            defaultContent: '',
            render: function(row) { return row.market?.type || 'N/A'; }
          },
          { 
            title: "Ubicación", 
            data: null,
            defaultContent: '',
            render: function(row) { return row.location?.zone || 'N/A'; }
          },
          { 
            title: "Modalidad", 
            data: null,
            defaultContent: '',
            render: function(row) { return row.market?.mode }
          },
          { 
            title: "Precio", 
            data: null,
            defaultContent: '',
            render: function(row) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(row.market?.priceUSD || 0); }
          },
          { 
            title: "Estado", 
            data: "status",
            render: function(data, type, row) {
              const estados = {
                'draft': '<span class="badge bg-secondary">Borrador</span>',
                'published': '<span class="badge bg-success">Publicado</span>',
                'pre-published': '<span class="badge bg-warning text-dark">Pendiente</span>',
                'sold': '<span class="badge bg-danger">Vendido</span>',
                'disabled': '<span class="badge bg-dark">Desabilitado</span>',
                'rented': '<span class="badge bg-light">Alquilado</span>',
                'rejected': '<span class="badge bg-danger">Rechazado</span>'
              };
              let html = estados[data] || data;
              if (data === 'rejected' && row?.reasonRejected) {
                html += `<br><a href="#" class="view-reject-reason small text-danger" data-id="${row._id}" style="text-decoration:underline;cursor:pointer;">Ver motivo</a>`;
              }
              return html;
            }
          },
          { 
          title: "Acciones", 
          data: null,
          defaultContent: '',
          responsivePriority: 1,
          render: function(row) {
            const agentsJson = JSON.stringify(row.agents || []);
            const hasAgents = hasAgentsRef.current;
            const assignBtn = isAgenciaRef.current && hasAgents
              ? `<a href="#" class="text-body assign-agents" data-id="${row._id}" data-agents='${agentsJson}' data-userid="${row.userId || ''}" title="Asignar agentes">
                   <i class="fa-solid fa-user-tie"></i>
                 </a>`
              : '';
            const editBtn = `<a href="#" class="text-body edit-propiedad" data-id="${row._id}">
                   <i class="fa-solid fa-edit"></i>
                 </a>`;
            const rejectBtn = isAdminRef.current && (row.status === 'pre-published' || row.status === 'disabled')
              ? `<a href="#" class="text-body reject-propiedad" data-id="${row._id}" title="Rechazar propiedad">
                   <i class="fa-solid fa-xmark" style="color:#dc3545"></i>
                 </a>`
              : '';
            return `
              <div class="d-flex gap-3 justify-content-center">
                ${editBtn}
                <a href="#" class="text-body view-propiedad" data-id="${row._id}">
                  <i class="fa-solid fa-eye"></i>
                </a>
                ${rejectBtn}
                ${assignBtn}
              </div>
            `;
          },
          orderable: false,
          searchable: false
        },
        { 
          data: null,
          visible: false,
          searchable: true,
          render: function(row) { return row.location?.address || ''; }
        },
        { 
          data: null,
          visible: false,
          searchable: true,
          render: function(row) { return row.location?.department || ''; }
        },
        { 
          data: null,
          visible: false,
          searchable: true,
          render: function(row) { return row.location?.municipality || ''; }
        },
        { 
          data: null,
          visible: false,
          searchable: true,
          render: function(row) { return row.market?.description || ''; }
        }
        ],
        rowCallback: function(row, data, index) {
          const api = this.api();
          const info = api.page.info();
          const rowNum = info.start + index + 1;
          $(row).find('td:first-child .row-number').text(rowNum);
        },
        destroy: true
      });

      const dtContainer = $(tableRef.current).closest('.dt-container');

      $(tableRef.current).on('search.dt', function() {
        if (!dataTableRef.current) return;
        try {
          const search = dataTableRef.current.search() || '';
          const page   = dataTableRef.current.page()   || 0;
          const saved  = sessionStorage.getItem(DT_SESSION_KEY);
          const current = saved ? JSON.parse(saved) : {};
          sessionStorage.setItem(DT_SESSION_KEY, JSON.stringify({ ...current, search, page }));
          savedSearchRef.current = search;
        } catch { /* ignorar */ }
      });

      const toggleActionButtons = () => {
        const selectedCount = dataTableRef.current.$('.delete-checkbox:checked').length;

        const btnSelector = isAdminRef.current
          ? '#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador, #btnDestacar'
          : '#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador';
        $(btnSelector).prop('disabled', selectedCount === 0);

        if (selectedCount === 0) return;

        const currentData = dataTableRef.current.rows({ filter: 'applied' }).data().toArray();
        const selectedIds = dataTableRef.current.$('.delete-checkbox:checked')
          .map(function() { return $(this).data('id'); }).get();

        const allDisabled = selectedIds.every(id => {
          const item = currentData.find(p => p._id === id);
          return item?.status === 'disabled';
        });
        $('#btnDesactivar').html(
          allDisabled
            ? '<i class="fa-solid fa-toggle-on"></i> Activar'
            : '<i class="fa-solid fa-toggle-off"></i> Desactivar'
        );

        const statuses = selectedIds.map(id => currentData.find(p => p._id === id)?.status);
        const algunaPrePublished = statuses.some(s => s === 'pre-published');
        const algunaPublished = statuses.some(s => s === 'published');
        const algunaDraft = statuses.some(s => s === 'draft');

        if (isAdminRef.current) {
          $('#btnPublicar').prop('disabled', !algunaPrePublished);
        } else {
          $('#btnPublicar').prop('disabled', !algunaDraft);
        }
        $('#btnBorrador').prop('disabled', !algunaPublished && !algunaPrePublished);

        if (isAdminRef.current) {
          const algunaPublishedNoDestacada = selectedIds.some(id => {
            const item = currentData.find(p => p._id === id);
            return item?.status === 'published' && item?.featured?.isActive !== true;
          });
          $('#btnDestacar').prop('disabled', !algunaPublishedNoDestacada);
        }
      };

      dtContainer.on('change', '#selectAllCheckbox', function() {
        const isChecked = $(this).prop('checked');
        dataTableRef.current.$('.delete-checkbox').prop('checked', isChecked);
        toggleActionButtons();
      });

      $(tableRef.current).on('change', '.delete-checkbox', function() {
        const total = dataTableRef.current.$('.delete-checkbox').length;
        const checked = dataTableRef.current.$('.delete-checkbox:checked').length;
        
        $('#selectAllCheckbox').prop('checked', total === checked && total > 0);
        toggleActionButtons();
      });

      dtContainer.on('click', '#btnDesactivar', async function() {
        const idsSeleccionados = dataTableRef.current.$('.delete-checkbox:checked')
          .map(function() { return $(this).data('id'); }).get();

        if (idsSeleccionados.length === 0) return;

        const botonTexto = $('#btnDesactivar').text().trim();
        const esActivar = botonTexto.includes('Activar');

        if (esActivar) {
          const idsAActivar = idsSeleccionados.filter(id => {
            const currentData = dataTableRef.current.rows({ filter: 'applied' }).data().toArray();
            const prop = currentData.find(p => p._id === id);
            return prop?.status === 'disabled';
          });

          if (idsAActivar.length === 0) {
            setAlertVariant('warning');
            setAlertMessage('Ninguna de las propiedades seleccionadas puede ser activada.');
            setShowAlert(true);
            setTimeout(() => setShowAlert(false), 4000);
            return;
          }

          setLoading(true);
          try {
            await Promise.all(idsAActivar.map(id => updatePropiedad(id, { status: 'draft' })));
            invalidateCache();
            setAlertVariant('success');
            setAlertMessage(`${idsAActivar.length} propiedad(es) activada(s) como borrador. Puedes enviarla(s) a revisión cuando estén listas.`);
            dataTableRef.current.ajax.reload(null, false);
          } catch (error) {
            setAlertVariant('danger');
            setAlertMessage('Error al activar.');
          } finally {
            setLoading(false);
          }
        } else {
          const idsADesactivar = idsSeleccionados.filter(id => {
            const currentData = dataTableRef.current.rows({ filter: 'applied' }).data().toArray();
            const prop = currentData.find(p => p._id === id);
            return prop?.status !== 'disabled';
          });

          if (idsADesactivar.length === 0) {
            setAlertVariant('warning');
            setAlertMessage('Ninguna de las propiedades seleccionadas puede ser desactivada.');
            setShowAlert(true);
            setTimeout(() => setShowAlert(false), 4000);
            return;
          }

          setLoading(true);
          try {
            await Promise.all(idsADesactivar.map(id => updatePropiedad(id, { status: 'disabled' })));
            invalidateCache();
            setAlertVariant('success');
            setAlertMessage(`${idsADesactivar.length} propiedad(es) desactivada(s) correctamente.`);
            dataTableRef.current.ajax.reload(null, false);
          } catch (error) {
            setAlertVariant('danger');
            setAlertMessage('Error al desactivar.');
          } finally {
            setLoading(false);
          }
        }

        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 4000);
        $('#selectAllCheckbox').prop('checked', false);
        $('#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador').prop('disabled', true);
      });

      dtContainer.on('click', '#btnPublicar', async function() {
        const ids = dataTableRef.current.$('.delete-checkbox:checked')
          .map(function() { return $(this).data('id'); }).get();
        if (ids.length === 0) return;

        const currentData = dataTableRef.current.rows({ filter: 'applied' }).data().toArray();

        const idsFiltrados = ids.filter(id => {
          const prop = currentData.find(p => p._id === id);
          if (!prop) return false;
          if (isAdminRef.current) return prop.status === 'pre-published';
          return prop.status === 'draft';
        });

        const idsDesactivados = ids.filter(id => {
          const prop = currentData.find(p => p._id === id);
          return prop?.status === 'disabled';
        });

        if (!isAdminRef.current && idsDesactivados.length > 0 && idsFiltrados.length === 0) {
          setAlertVariant('warning');
          setAlertMessage('Las propiedades desactivadas deben activarse primero antes de enviarse a revisión.');
          setShowAlert(true);
          setTimeout(() => setShowAlert(false), 5000);
          return;
        }

        if (idsFiltrados.length === 0) {
          setAlertVariant('warning');
          setAlertMessage('Ninguna de las propiedades seleccionadas puede ser procesada con esta acción.');
          setShowAlert(true);
          setTimeout(() => setShowAlert(false), 4000);
          return;
        }

        const nuevoStatus = isAdminRef.current ? 'published' : 'pre-published';
        const mensaje = isAdminRef.current ? 'Aprobando propiedades...' : 'Enviando a revisión...';
        const mensajeExito = isAdminRef.current ? 'Propiedad(es) aprobada(s).' : 'Propiedad(es) enviada(s) a revisión.';

        const propiedadesConError = [];

        for (const id of idsFiltrados) {
          const prop = currentData.find(p => p._id === id);
          if (!prop) continue;

          const missingFields = validateRequiredFields(prop);
          if (missingFields.length > 0) {
            const fieldList = missingFields.map(f => `&nbsp;&nbsp;• <b>${f.seccion}</b> - ${f.campo}`).join('<br>');
            propiedadesConError.push({
              title: prop.market?.title || 'Sin título',
              fields: fieldList
            });
          }
        }

        if (propiedadesConError.length > 0) {
          const errorHtml = propiedadesConError.map(p =>
            `<div style="margin-bottom:12px;"><b style="font-size: 20px">${p.title}</b><br>${p.fields}</div>`
          ).join('<hr style="margin:8px 0;">');

          alertify.alert(
            "BRICKLY HOMES",
            `<center><b>${propiedadesConError.length} propiedad(es) no cumplen con las condiciones para ser aprobada(s):</b></center>
             <div class="scroll-moderno" style="max-height:400px;margin-top:10px;text-align:left;padding-right:10px;">
               ${errorHtml}
             </div>`
          );
          return;
        }

        setLoading(true);
        setLoadingMessage(mensaje);
        try {
          await Promise.all(idsFiltrados.map(id => updatePropiedad(id, { status: nuevoStatus })));
          invalidateCache();
          setAlertVariant('success');
          setAlertMessage(mensajeExito);
          setShowAlert(true);
          setTimeout(() => setShowAlert(false), 4000);
          $('#selectAllCheckbox').prop('checked', false);
          $('#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador').prop('disabled', true);
          dataTableRef.current.ajax.reload(null, false);
        } catch (error) {
          setAlertVariant('danger');
          setAlertMessage('Error al publicar.');
          setShowAlert(true);
        } finally {
          setLoading(false);
        }
      });

      dtContainer.on('click', '#btnBorrador', async function() {
        const ids = dataTableRef.current.$('.delete-checkbox:checked')
          .map(function() { return $(this).data('id'); }).get();
        if (ids.length === 0) return;

        const currentData = dataTableRef.current.rows({ filter: 'applied' }).data().toArray();

        const idsFiltrados = ids.filter(id => {
          const prop = currentData.find(p => p._id === id);
          return prop?.status === 'published' || prop?.status === 'pre-published';
        });

        if (idsFiltrados.length === 0) {
          setAlertVariant('warning');
          setAlertMessage('Ninguna de las propiedades seleccionadas puede ser colocada como borrador.');
          setShowAlert(true);
          setTimeout(() => setShowAlert(false), 4000);
          return;
        }

        setLoading(true);
        setLoadingMessage('Colocando como borrador...');
        try {
          await Promise.all(idsFiltrados.map(id => updatePropiedad(id, { status: 'draft' })));
          invalidateCache();
          setAlertVariant('success');
          setAlertMessage('Propiedad(es) colocada(s) como borrador.');
          setShowAlert(true);
          setTimeout(() => setShowAlert(false), 4000);
          $('#selectAllCheckbox').prop('checked', false);
          $('#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador').prop('disabled', true);
          dataTableRef.current.ajax.reload(null, false);
        } catch (error) {
          setAlertVariant('danger');
          setAlertMessage('Error al colocar como borrador.');
          setShowAlert(true);
        } finally {
          setLoading(false);
        }
      });

      dtContainer.on('click', '#btnDestacar', function() {
        const ids = dataTableRef.current.$('.delete-checkbox:checked')
          .map(function() { return $(this).data('id'); }).get();
        if (ids.length === 0) return;
        setHighlightIds(ids);
        setHighlightDate('');
        setShowHighlightModal(true);
      });

      dtContainer.on('click', '#btnEliminar', async function() {
        const idsAEliminar = dataTableRef.current.$('.delete-checkbox:checked')
          .map(function() {
            return $(this).data('id');
          }).get();

        if (idsAEliminar.length > 0) {
          const respuesta = await confirm(idsAEliminar.length)
          if(respuesta){
            setLoading(true);
            setLoadingMessage('Eliminando propiedades...');
            
            try {
              const response = await deletePropiedad(idsAEliminar);
              
              if (response.success) {
                invalidateCache();
                setAlertVariant('success');
                setAlertMessage(response.message || 'Propiedad(es) eliminada(s) correctamente.');
                setShowAlert(true);
                
                loadCounters();

                $('#selectAllCheckbox').prop('checked', false);
                $('#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador').prop('disabled', true);
                
                dataTableRef.current.ajax.reload(null, false);
              } else {
                setAlertVariant('danger');
                setAlertMessage(response.error || 'Hubo un error al intentar eliminar.');
                setShowAlert(true);
              }
            } catch(error) {
              console.error("Error al eliminar", error);
              setAlertVariant('danger');
              setAlertMessage('Ocurrió un error inesperado de conexión.');
              setShowAlert(true);
            } finally {
              setLoading(false);
              setTimeout(() => {
                setShowAlert(false);
              }, 4000);
            }
          }
        }
      });

      // Restaurar búsqueda y página UNA SOLA VEZ después de la 1ra inicialización
      // Usar one() para evitar que se ejecute en cada recarga AJAX
      dataTableRef.current.one('init.dt', function() {
        try {
          // Primero página, luego búsqueda (ambos con draw('page') para no resetear)
          if (savedPageRef.current > 0) {
            dataTableRef.current.page(savedPageRef.current).draw('page');
          }
          if (savedSearchRef.current) {
            dataTableRef.current.search(savedSearchRef.current).draw('page');
          }
        } catch (e) { /* ignorar */ }

        setTimeout(() => {
          const searchInput = $(tableRef.current).closest('.dt-container').find('.dt-search .dt-input');
          if (searchInput.length && savedSearchRef.current) {
            searchInput.val(savedSearchRef.current);
          }
        }, 0);
      });
    }

    // Cleanup al desmontar
    return () => {
      if (dataTableRef.current) {
        try {
          const search = dataTableRef.current.search() || '';
          const page   = dataTableRef.current.page()   || 0;
          sessionStorage.setItem(DT_SESSION_KEY, JSON.stringify({
            search,
            page,
            activeFilter,
            activeStatusBtn,
          }));
          savedSearchRef.current = search;
          savedPageRef.current   = page;
        } catch { /* ignorar */ }
        dataTableRef.current.destroy();
        dataTableRef.current = null;
      }
    };
  }, [loadingShow]);

  // Editar propiedad
  useEffect(() => {
    const handleEdit = function(e) {
      e.preventDefault();
      const id = this.dataset.id;
      navigate(`/cpanel/propiedades/edit/${id}`);
    };

    $(document).on('click', '.edit-propiedad', handleEdit);

    return () => {
      $(document).off('click', '.edit-propiedad', handleEdit);
    };
  }, [navigate]);

  useEffect(() => {
    const handleView = function(e) {
      e.preventDefault();
      const id = this.dataset.id;
      navigate(`/cpanel/propiedades/view/${id}`);
    };

    $(document).on('click', '.view-propiedad', handleView);

    return () => {
      $(document).off('click', '.view-propiedad', handleView);
    };
  }, [navigate]);

  // Rechazar propiedad
  useEffect(() => {
    const handleReject = function(e) {
      e.preventDefault();
      const id = this.dataset.id;
      if (!id) return;
      setRejectPropId(id);
      setRejectReasons({ lowImagen: false, incompleteData: false });
      setShowRejectModal(true);
    };

    $(document).on('click', '.reject-propiedad', handleReject);

    return () => {
      $(document).off('click', '.reject-propiedad', handleReject);
    };
  }, [navigate]);

  // Ver motivo de rechazo
  useEffect(() => {
    const handleViewReject = function(e) {
      e.preventDefault();
      const id = this.dataset.id;
      if (!id) return;
      const currentData = dataTableRef.current ? dataTableRef.current.rows({ filter: 'applied' }).data().toArray() : [];
      const prop = currentData.find(p => p._id === id);
      if (prop?.reasonRejected) {
        setViewRejectReasons({
          lowImagen: prop.reasonRejected.lowImagen || false,
          incompleteData: prop.reasonRejected.incompleteData || false
        });
        setShowViewRejectModal(true);
      }
    };

    $(document).on('click', '.view-reject-reason', handleViewReject);

    return () => {
      $(document).off('click', '.view-reject-reason', handleViewReject);
    };
  }, []);

  // Confirmar rechazo desde el modal
  const confirmRejectFromTable = async () => {
    const id = rejectPropId;
    if (!id) return;

    try {
      await updatePropiedad(id, {
        status: 'rejected',
        reasonRejected: {
          lowImagen: rejectReasons.lowImagen,
          incompleteData: rejectReasons.incompleteData
        }
      });
      invalidateCache();
      setAlertVariant('success');
      setAlertMessage('Propiedad rechazada correctamente.');
      loadCounters();
      if (dataTableRef.current) dataTableRef.current.ajax.reload(null, false);
    } catch (error) {
      setAlertVariant('danger');
      setAlertMessage('Error al rechazar la propiedad.');
    }
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 4000);
    setShowRejectModal(false);
    setRejectPropId(null);
  };

  useEffect(() => {
    const handlePlanes = function(e) {
      e.preventDefault();
      const row = $(this).closest('tr');
      const propId = row.find('.delete-checkbox').data('id');
      if (propId) {
        setHighlightIds([propId]);
        setHighlightDate('');
        setShowHighlightModal(true);
      }
    };

    $(document).on('click', '.planes-propiedad', handlePlanes);

    return () => {
      $(document).off('click', '.planes-propiedad', handlePlanes);
    };
  }, [navigate]);

  useEffect(() => {
    if (!isAgencia) return;
    const handleAssign = function(e) {
      e.preventDefault();
      const id = this.dataset.id;
      const agents = JSON.parse(this.dataset.agents || '[]');
      const userId = this.dataset.userid || '';

      const preSelected = new Set(agents);
      if (userId) preSelected.add(userId);

      setSelectedAgents(
        agentesOptions.filter(opt => preSelected.has(opt.value))
      );
      setModalPropId(id);
      setShowAgentModal(true);
    };
    $(document).on('click', '.assign-agents', handleAssign);
    return () => $(document).off('click', '.assign-agents', handleAssign);
  }, [navigate, agentesOptions]);

  const handleSaveAgents = async () => {
    if (!modalPropId) return;
    setSavingAgents(true);
    
    const result = await assignAgents(modalPropId, selectedAgents.map(a => a.value));
    setSavingAgents(false);
    if (result.success) {
      invalidateCache();
      setAlertVariant('success');
      setAlertMessage('Agentes asignados correctamente.');
      if (dataTableRef.current) dataTableRef.current.ajax.reload(null, false);
    } else {
      setAlertVariant('danger');
      setAlertMessage(result.error || 'Error al asignar agentes.');
    }
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 4000);
    setShowAgentModal(false);
  };

  const handleSaveEasyBroker = async () => {
    setLoading(true);
    setLoadingMessage('Guardando API Key de EasyBroker...');
    try {
      const saveResult = await saveEasyBrokerApiKey(easyBrokerApiKey);
      if (!saveResult.success && saveResult.error) {
        throw new Error(saveResult.error);
      }

      setShowEasyBrokerModal(false);
      setEasyBrokerApiKey('');
      setShowApiKey(false);
      setEasyBrokerConnected(true);
      setAlertVariant('success');
      setAlertMessage('API Key de EasyBroker guardada correctamente.');
      setShowAlert(true);
    } catch (error) {
      setAlertVariant('danger');
      setAlertMessage(`Error al conectar con EasyBroker: ${error.message}`);
      setShowAlert(true);
    } finally {
      setLoading(false);
      setTimeout(() => setShowAlert(false), 4000);
    }
  };

  const handleSyncEasyBroker = async () => {
    setSyncingEasyBroker(true);
    setLoadingMessage('Sincronizando propiedades con EasyBroker...');
    try {
      const syncResult = await syncEasyBroker(idUser._id);
      if (!syncResult.success && syncResult.error) {
        throw new Error(syncResult.error);
      }
      setAlertVariant('success');
      setAlertMessage('Propiedades sincronizadas con EasyBroker correctamente.');
      setShowAlert(true);
    } catch (error) {
      setAlertVariant('danger');
      setAlertMessage(`Error al sincronizar con EasyBroker: ${error.message}`);
      setShowAlert(true);
    } finally {
      setSyncingEasyBroker(false);
      setTimeout(() => setShowAlert(false), 4000);
    }
  };

  const handleSaveHighlight = async () => {
    if (highlightIds.length === 0 || !highlightDate) return;
    setSavingHighlight(true);
    
    try {
      await Promise.all(highlightIds.map(id =>
        updatePropiedad(id, { featured: { isActive: true, expiresAt: highlightDate } })
      ));
      invalidateCache();
      setAlertVariant('success');
      setAlertMessage('Propiedad(es) destacada(s) exitosamente.');
      if (dataTableRef.current) dataTableRef.current.ajax.reload(null, false);
    } catch (error) {
      setAlertVariant('danger');
      setAlertMessage('Error al destacar propiedad(es).');
    }
    setSavingHighlight(false);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 4000);
    setShowHighlightModal(false);
  };

  const filterByType = (type) => {
    setActiveFilter(type);
    activeFilterRef.current = type;
    
    // Actualizar label del botón de modalidad
    const modeBtn = document.getElementById('btnModeDropdown');
    if (modeBtn) {
      var modeLabel = 'Modalidad';
      if (type === 'Venta') modeLabel = 'Venta';
      else if (type === 'Alquiler') modeLabel = 'Alquiler';
      modeBtn.innerHTML = '<i class="fa-solid fa-layer-group me-1"></i> ' + modeLabel;
    }

    // Actualizar clase del botón "Todas": solo active si AMBOS filtros son 'all'
    const btnAll = document.getElementById('btnFilterAll');
    if (btnAll) {
      const isActive = type === 'all' && activeStatusBtnRef.current === 'all';
      btnAll.className = `filterButtonTable ${isActive ? 'active' : ''}`;
    }

    // Actualizar el estilo visual de los items del dropdown de modalidad
    const modeItems = document.querySelectorAll('.status-dropdown-menu li a');
    modeItems.forEach(item => {
      const itemText = item.textContent.trim();
      const itemMode = itemText.startsWith('Venta') ? 'Venta' : itemText.startsWith('Alquiler') ? 'Alquiler' : '';
      const isActive = type === itemMode;
      item.style.backgroundColor = isActive ? '#0d6efd' : 'transparent';
      item.style.color = isActive ? '#fff' : '#212529';
    });

    if (dataTableRef.current) {
      // Resetear a página 1 al cambiar filtro (evita página vacía)
      dataTableRef.current.page(0).draw('page');
    }
    try {
      const saved = sessionStorage.getItem(DT_SESSION_KEY);
      const current = saved ? JSON.parse(saved) : {};
      sessionStorage.setItem(DT_SESSION_KEY, JSON.stringify({ ...current, activeFilter: type, page: 0 }));
    } catch { /* ignorar */ }
  };

  const filterByStatus = (status) => {
    setActiveStatusBtn(status);
    activeStatusBtnRef.current = status;
    
    // Actualizar label del botón de status
    const statusBtn = document.getElementById('btnStatusDropdown');
    if (statusBtn) {
      var statusLabel = 'Status';
      if (status === 'pre-published') statusLabel = 'Pendiente';
      else if (status === 'published') statusLabel = 'Publicado';
      else if (status === 'draft') statusLabel = 'Borrador';
      else if (status === 'disabled') statusLabel = 'Desactivado';
      else if (status === 'rejected') statusLabel = 'Rechazado';
      else if (status === 'sold') statusLabel = 'Vendido';
      statusBtn.innerHTML = '<i class="fa-solid fa-filter me-1"></i> ' + statusLabel;
    }

    // Actualizar clase del botón "Todas": solo active si AMBOS filtros son 'all'
    const btnAll = document.getElementById('btnFilterAll');
    if (btnAll) {
      const isActive = status === 'all' && activeFilterRef.current === 'all';
      btnAll.className = `filterButtonTable ${isActive ? 'active' : ''}`;
    }

    // Actualizar el estilo visual de los items del dropdown de status
    const statusMap = { Pendiente: 'pre-published', Publicado: 'published', Borrador: 'draft', Desactivado: 'disabled', Rechazado: 'rejected', Vendido: 'sold' };
    const statusItems = document.querySelectorAll('.dropdown-menu:not(.status-dropdown-menu) li a');
    statusItems.forEach(item => {
      const itemLabel = item.textContent.trim().split(' ')[0];
      const itemStatus = statusMap[itemLabel] || '';
      const isActive = status === itemStatus;
      item.style.backgroundColor = isActive ? '#0d6efd' : 'transparent';
      item.style.color = isActive ? '#fff' : '#212529';
    });

    if (dataTableRef.current) {
      // Resetear a página 1 al cambiar filtro (evita página vacía)
      dataTableRef.current.page(0).draw('page');
    }
    try {
      const saved = sessionStorage.getItem(DT_SESSION_KEY);
      const current = saved ? JSON.parse(saved) : {};
      sessionStorage.setItem(DT_SESSION_KEY, JSON.stringify({ ...current, activeStatusBtn: status, page: 0 }));
    } catch { /* ignorar */ }
  };

  return (
    <Container>
      <div className="d-flex flex-column-reverse flex-md-row justify-content-between">
        <div>
          <div className='fs-1'>Mis propiedades</div>
          <p>Consulta el listado de tus propiedades en alquiler o venta.</p>
          {!isAdmin &&
            <Link to="/cpanel/propiedades/add" className='mt-4 d-flex gap-1 align-items-center text-body mb-5'>
              <i className="fa-solid fa-plus bg-black p-1 rounded-circle text-white" style={{ fontSize: '10px', width: '20px', height: '20px', display: 'grid', placeItems: 'center', paddingRight: '1px' }}></i> 
              <span>Subir propiedad</span>
            </Link>
          }
        </div>
        {isAgencia && (
          <div className='d-flex gap-3 align-items-start mb-4 mb-md-0'>
            <div className='border rounded-3 d-flex p-3 gap-3 align-items-center'>
              <img src={crm2} className='rounded-circle' style={{ width: '50px', height: "50px" }} alt="" />
              <div className='text-center'>
                Integra con EasyBroker CRM
                {easyBrokerConnected ? (
                  <Button variant="dark" className="d-flex align-items-center rounded-pill px-4 py-1 mx-auto mt-2 lh-1" onClick={handleSyncEasyBroker} disabled={syncingEasyBroker}>
                    {syncingEasyBroker ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="fa-solid fa-rotate me-2"></i>}
                    Sincronizar
                  </Button>
                ) : (
                  <Button variant="dark" className="d-flex align-items-center rounded-pill px-4 py-1 mx-auto mt-2 lh-1" onClick={() => { setShowEasyBrokerModal(true); if (idUser?.easyBrokerApiKey) setEasyBrokerApiKey(idUser.easyBrokerApiKey); }}>Conectar <i className='ms-2 fa-thin fa-arrow-right' style={{ fontSize: '12px' }}></i></Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAlert && (
        <Alert 
          variant={alertVariant} 
          onClose={() => setShowAlert(false)} 
          dismissible 
          className="position-fixed bottom-0 end-0 m-3 shadow-sm" 
          style={{ zIndex: 9999 }}
        >
          <div className="d-flex align-items-center gap-2">
            <i className={`fa-solid ${alertVariant === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            <span>{alertMessage}</span>
          </div>
        </Alert>
      )}

      <div className={`containerTable ${isAdmin ? 'mt-5' : ''} `}>
        {loading && (
          <div className="text-center text-primary fw-bold">
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> 
            {loadingMessage}
          </div>
        )}

        {loadingShow && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-3">Cargando propiedades...</p>
          </div>
        )}
      </div>

      {!loadingShow && (
        <div className="w-100">
          <table ref={tableRef} className="display propiedades-table" style={{ width: '100%' }}>
          </table>
        </div>
      )}

      {/* Modal asignar agentes */}
      <Modal show={showAgentModal} onHide={() => setShowAgentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title><i className="fa-solid fa-user-tie me-2"></i>Asignar agentes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Select
            isMulti
            options={agentesOptions}
            value={selectedAgents}
            onChange={setSelectedAgents}
            placeholder="Seleccionar agentes..."
            noOptionsMessage={() => 'No hay agentes disponibles'}
            formatOptionLabel={(opt) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {opt.avatar
                  ? <img src={opt.avatar} alt={opt.label} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#ccc', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-user" style={{ fontSize: '12px', color: '#666' }}></i></div>
                }
                <span style={{ color: opt.isEnabled ? 'inherit' : '#dc3545' }}>{opt.label}</span>
                {!opt.isEnabled && (
                  <span className="text-danger d-flex align-items-center gap-1" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                    <i className="fa-solid fa-triangle-exclamation"></i> Inactivo
                  </span>
                )}
              </div>
            )}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-dark" className="rounded-pill px-4" onClick={() => setShowAgentModal(false)}>Cancelar</Button>
          <Button variant="dark" className="rounded-pill px-4" onClick={handleSaveAgents} disabled={savingAgents}>
            {savingAgents ? <span className="spinner-border spinner-border-sm me-2" /> : null}
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showEasyBrokerModal} onHide={() => { setShowEasyBrokerModal(false); setShowApiKey(false); }} centered>
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center gap-2" style={{ fontSize: '20px' }}>
            <img src={crm2} alt="EasyBroker" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
            Conectar con EasyBroker CRM
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">Para conectar tu cuenta de EasyBroker CRM, ingresa tu API Key.</p>
          <div className="mb-3">
            <label className="form-label fw-semibold">API Key</label>
            <div className="position-relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                className="form-control rounded-pill pe-5"
                placeholder="Ingresa tu API Key"
                value={easyBrokerApiKey}
                onChange={(e) => setEasyBrokerApiKey(e.target.value)}
              />
              <i
                className={`fa-regular ${showApiKey ? 'fa-eye-slash' : 'fa-eye'} position-absolute top-50 end-0 translate-middle-y me-3`}
                style={{ color: '#6c757d', fontSize: '16px', cursor: 'pointer', zIndex: 1 }}
                onClick={() => setShowApiKey(!showApiKey)}
              ></i>
            </div>
          </div>
          <a
            href="https://dev.easybroker.com/docs/autenticaci%C3%B3n"
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none small text-link d-flex align-items-center gap-1"
          >
            <i className="fa-solid fa-circle-info"></i>
            ¿Dónde encuentro mi API Key?
          </a>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-dark" className="rounded-pill px-4" onClick={() => { setShowEasyBrokerModal(false); setShowApiKey(false); }}>Cerrar</Button>
          <Button variant="dark" className="rounded-pill px-4" onClick={handleSaveEasyBroker} disabled={!easyBrokerApiKey.trim()}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showRejectModal} onHide={() => { setShowRejectModal(false); setRejectPropId(null); }} centered>
        <Modal.Header closeButton>
          <Modal.Title>Rechazar propiedad</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">Selecciona el motivo del rechazo:</p>
          <div className="d-flex flex-column gap-3">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="chkLowImagenIdx"
                checked={rejectReasons.lowImagen}
                onChange={(e) => setRejectReasons(prev => ({ ...prev, lowImagen: e.target.checked }))}
              />
              <label className="form-check-label" htmlFor="chkLowImagenIdx">
                Baja calidad de imagenes
              </label>
            </div>
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="chkIncompleteDataIdx"
                checked={rejectReasons.incompleteData}
                onChange={(e) => setRejectReasons(prev => ({ ...prev, incompleteData: e.target.checked }))}
              />
              <label className="form-check-label" htmlFor="chkIncompleteDataIdx">
                Información incompleta
              </label>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-dark" className="rounded-pill px-4" onClick={() => { setShowRejectModal(false); setRejectPropId(null); }}>
            Cancelar
          </Button>
          <Button variant="danger" className="rounded-pill px-4" onClick={confirmRejectFromTable}>
            Rechazar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showViewRejectModal} onHide={() => setShowViewRejectModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Motivo del rechazo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">Esta propiedad fue rechazada por el administrador por el(los) siguiente(s) motivo(s):</p>
          <div className="d-flex flex-column gap-3">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="viewChkLowImagen"
                checked={viewRejectReasons.lowImagen}
                onChange={() => {}}
                style={{ pointerEvents: 'none' }}
              />
              <label className="form-check-label text-dark" htmlFor="viewChkLowImagen" style={{ pointerEvents: 'none' }}>
                Baja calidad de imagenes
              </label>
            </div>
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="viewChkIncompleteData"
                checked={viewRejectReasons.incompleteData}
                onChange={() => {}}
                style={{ pointerEvents: 'none' }}
              />
              <label className="form-check-label text-dark" htmlFor="viewChkIncompleteData" style={{ pointerEvents: 'none' }}>
                Información incompleta
              </label>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-dark" className="rounded-pill px-4" onClick={() => setShowViewRejectModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showHighlightModal} onHide={() => setShowHighlightModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Destacar {highlightIds.length > 1 ? `${highlightIds.length} propiedades` : 'propiedad'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label fw-semibold">Fecha de expiración</label>
            <div className="position-relative">
              <input
                type="date" required
                className="form-control rounded-pill"
                value={highlightDate}
                onChange={(e) => setHighlightDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <i
                className="fa-regular fa-calendar position-absolute top-50 end-0 translate-middle-y me-3"
                style={{ color: '#6c757d', fontSize: '16px', pointerEvents: 'none', zIndex: 1 }}
              ></i>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-dark" className="rounded-pill px-4" onClick={() => setShowHighlightModal(false)}>Cancelar</Button>
          <Button variant="dark" className="rounded-pill px-4" onClick={handleSaveHighlight} disabled={savingHighlight || !highlightDate}>
            {savingHighlight ? <span className="spinner-border spinner-border-sm me-2" /> : null}
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Index;