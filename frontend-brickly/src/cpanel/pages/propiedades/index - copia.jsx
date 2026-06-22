import { useEffect, useState, useRef, useCallback } from 'react';
import { Container, Alert, Modal, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { getPropiedades, deletePropiedad, updatePropiedad, assignAgents } from '../../services/propiedades';
import { getPropiedadesConCache, invalidateCache, onCacheUpdate } from '../../services/propiedadesCache';
import { validateRequiredFields } from '../../services/validacionPropiedades';
import { saveEasyBrokerApiKey, syncEasyBroker } from '../../services/sync';
import { getCurrentUser, API_URL } from '../../../services/authService';
import { getAgentes } from '../../services/agentes';
import { getUsers } from '../../../services/listUsers';
import sinPropiedad from './../../assets/images/iconos/sinPropiedad.png'
import diamond from '../../../assets/images/iconos/diamond.png';
import crm1 from '../../assets//images/crms/Wasi.png';
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
  const [listPro, setListPro] = useState([]);
  const [allPropiedades, setAllPropiedades] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [All, setAll] = useState(0);
  const [Sold, setSold] = useState(0);
  const [Rent, setRent] = useState(0);
  const [activeStatusBtn, setActiveStatusBtn] = useState(() => {
    const user = getCurrentUser();
    return user?.roles?.includes('admin') ? 'pre-published' : 'all';
  });
  const [CountDraft, setCountDraft] = useState(0);
  const [CountPublished, setCountPublished] = useState(0);
  const [CountPrePublished, setCountPrePublished] = useState(0);
  const [CountSold, setCountSold] = useState(0);
  const [CountDisabled, setCountDisabled] = useState(0);
  const [CountRejected, setCountRejected] = useState(0);
  const tableRef = useRef(null);
  const dataTableRef = useRef(null);
  const savedSearchRef = useRef('');
  const savedPageRef = useRef(0);
  const navigate = useNavigate();

  const idUser = getCurrentUser();
  const isAgencia = idUser?.roles?.includes('agencia');
  const isAdmin = idUser?.roles?.includes('admin');
  const isAgente = idUser?.roles?.includes('agente');

  // Clave de sessionStorage para persistir estado del DataTable entre navegaciones
  const DT_SESSION_KEY = `cpanel_propiedades_dt_${idUser?._id ?? 'u'}`;

  // Limpiar estado guardado en sessionStorage al montar para evitar filtros residuales
  useEffect(() => {
    try {
      sessionStorage.removeItem(DT_SESSION_KEY);
    } catch { /* ignorar */ }
  }, []);

  // Escuchar cambios de estado desde view.jsx (rechazar, aprobar, etc.)
  useEffect(() => {
    const handler = (e) => {
      const { id, newStatus } = e.detail;
      if (!id || !newStatus) return;

      // Actualizar allPropiedades y listPro para que el DataTable se refresque
      setAllPropiedades(prev => prev.map(item =>
        item._id === id ? { ...item, status: newStatus } : item
      ));
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
  const [usersMap, setUsersMap] = useState({});  // _id -> user object
  const [agenciesMap, setAgenciesMap] = useState({}); // _id -> agency name

 /*  const firstWord = (valor) => {
    return valor.charAt(0).toUpperCase() + valor.slice(1)
  } */

  // Función para filtrar combinando tipo y estado
  const applyFilters = (type, status) => {
    let filtered = allPropiedades;
    if (type !== 'all') {
      filtered = filtered.filter(item => item.market?.mode === type);
    }
    if (status !== 'all') {
      filtered = filtered.filter(item => item.status === status);
    }
    setListPro(filtered);
  };

  // Función para filtrar por tipo
  const filterByType = (type) => {
    setActiveFilter(type);
    applyFilters(type, activeStatusBtn);
    // Persistir en sessionStorage
    try {
      const saved = sessionStorage.getItem(DT_SESSION_KEY);
      const current = saved ? JSON.parse(saved) : {};
      sessionStorage.setItem(DT_SESSION_KEY, JSON.stringify({ ...current, activeFilter: type }));
    } catch { /* ignorar */ }
  };

  // Función para filtrar por estado (botones de colores)
  const filterByStatus = (status) => {
    setActiveStatusBtn(status);
    applyFilters(activeFilter, status);
    // Persistir en sessionStorage
    try {
      const saved = sessionStorage.getItem(DT_SESSION_KEY);
      const current = saved ? JSON.parse(saved) : {};
      sessionStorage.setItem(DT_SESSION_KEY, JSON.stringify({ ...current, activeStatusBtn: status }));
    } catch { /* ignorar */ }
  };

  // Función para cambiar filtro de estado (solo admin)
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
  };

  useEffect(() => {
    if (!isAgencia) return;
    getAgentes().then(result => {
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        // Cargar TODOS los agentes (activos e inactivos) que tengan perfil completo
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

  // Procesar y aplicar los datos de propiedades al estado del componente
  const aplicarDatos = useCallback((rawData, mostrarSpinner = false) => {
    const data = Array.isArray(rawData) ? rawData : [];

    let propiedadesFiltradas;
    if (isAdmin) {
      propiedadesFiltradas = data;
    } else if (isAgencia) {
      propiedadesFiltradas = data.filter(item =>
        item.userId === idUser._id ||
        (Array.isArray(item.agents) && item.agents.includes(idUser._id))
      );
    } else if (isAgente) {
      propiedadesFiltradas = data.filter(item =>
        item.userId === idUser._id ||
        (Array.isArray(item.agents) && item.agents.includes(idUser._id))
      );
    } else {
      propiedadesFiltradas = data.filter(item => item.userId === idUser._id);
    }

    const statusOrder = { 'pre-published': 0, 'published': 1, 'draft': 2, 'disabled': 3, 'sold': 4 };
    propiedadesFiltradas.sort((a, b) => {
      const statusDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
      if (statusDiff !== 0) return statusDiff;
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Leer filtros guardados para aplicarlos
    let restoredActiveFilter = 'all';
    let restoredActiveStatusBtn = 'all';
    try {
      const saved = sessionStorage.getItem(DT_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        restoredActiveFilter = parsed.activeFilter || 'all';
        restoredActiveStatusBtn = parsed.activeStatusBtn || 'all';
      }
    } catch { /* ignorar */ }

    let listaFinal = propiedadesFiltradas;
    if (restoredActiveFilter !== 'all') {
      listaFinal = listaFinal.filter(item => item.market?.mode === restoredActiveFilter);
    }
    if (restoredActiveStatusBtn !== 'all') {
      listaFinal = listaFinal.filter(item => item.status === restoredActiveStatusBtn);
    }

    setAllPropiedades(propiedadesFiltradas);
    setListPro(listaFinal);
    setAll(propiedadesFiltradas.length);
    setSold(propiedadesFiltradas.filter(item => item.market?.mode === 'Venta').length);
    setRent(propiedadesFiltradas.filter(item => item.market?.mode === 'Alquiler').length);
    setCountDraft(propiedadesFiltradas.filter(item => item.status === 'draft').length);
    setCountPublished(propiedadesFiltradas.filter(item => item.status === 'published').length);
    setCountPrePublished(propiedadesFiltradas.filter(item => item.status === 'pre-published').length);
    setCountSold(propiedadesFiltradas.filter(item => item.status === 'sold').length);
    setCountDisabled(propiedadesFiltradas.filter(item => item.status === 'disabled').length);
    if (mostrarSpinner) setLoadingShow(false);
  }, [isAdmin, isAgencia, isAgente, idUser?._id, DT_SESSION_KEY]);

  useEffect(() => {
    // Suscribirse a actualizaciones en background del caché
    const unsub = onCacheUpdate((freshData) => {
      aplicarDatos(freshData);
    });
    return unsub;
  }, [aplicarDatos]);

  useEffect(() => {    
    const getPro = async () => {
      try {
        const params = statusFilter ? { status: statusFilter } : {};

        const response = await getPropiedadesConCache(
          getPropiedades,
          idUser._id,
          params,
          // Callback en background: actualiza datos sin spinner
          (freshData) => aplicarDatos(freshData)
        );

        const data = Array.isArray(response?.data) ? response.data : [];
        // fromCache=true → ocultar spinner inmediatamente (carga instantánea)
        // fromCache=false → el finally lo oculta tras recibir datos reales
        aplicarDatos(data, true);

      } catch (error) {
        console.error("Error al cargar propiedades:", error);
        setAllPropiedades([]);
        setListPro([]);
        setAll(0);
        setSold(0);
        setRent(0);
        setCountDraft(0);
        setCountPublished(0);
        setCountPrePublished(0);
        setCountSold(0);
        setCountDisabled(0);
      } finally {
        setLoadingShow(false);
      }
    };

    if (idUser?._id) {
      getPro();
    }
  }, [statusFilter]);

  useEffect(() => {
    if (tableRef.current) {
      // Guardar estado actual del DataTable antes de destruir
      if (dataTableRef.current) {
        try {
          savedSearchRef.current = dataTableRef.current.search() || '';
          savedPageRef.current = dataTableRef.current.page() || 0;
        } catch (e) {
          // Si hay error al leer el estado, ignorar
        }
        dataTableRef.current.destroy();
      }

      dataTableRef.current = $(tableRef.current).DataTable({
        language: espanol,
        responsive: true,
        deferRender: true,
        pageLength: 6,
        layout: {
          topStart: function() {
            let div = document.createElement('div');
            div.className = 'd-flex flex-column gap-2 w-100 align-items-start';

            // Fila de botones de filtro
            const filterRow = document.createElement('div');
            filterRow.className = 'd-flex align-items-center gap-2 flex-wrap';
            
            const btnAll = document.createElement('button');
            btnAll.className = `filterButtonTable ${activeFilter === 'all' && activeStatusBtn === 'all' ? 'active' : ''}`;
            btnAll.innerHTML = `Todas (${All})`;
            btnAll.onclick = function() {
              filterByType('all');
              filterByStatus('all');
            }
            
            filterRow.appendChild(btnAll);

            // Dropdown de filtro por modalidad (Venta / Alquiler)
            const modeDropdown = document.createElement('div');
            modeDropdown.className = 'dropdown ms2 align-items-center';
            modeDropdown.style.position = 'relative';
            modeDropdown.style.display = 'flex';

            const modeBtn = document.createElement('button');
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

            // Toggle del menú al hacer click en el botón
            modeBtn.onclick = function(e) {
              e.stopPropagation();
              var isOpen = modeMenu.style.display === 'block';
              // Cerrar todos los dropdowns abiertos
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

            // Cerrar al hacer click fuera
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

            // Dropdown de filtro por estado (vanilla JS, sin Bootstrap JS)
            const statusDropdown = document.createElement('div');
            statusDropdown.className = 'dropdown ms2 align-items-center';
            statusDropdown.style.position = 'relative';
            statusDropdown.style.display = 'flex';

            const statusBtn = document.createElement('button');
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

            // Toggle del menú al hacer click en el botón
            statusBtn.onclick = function(e) {
              e.stopPropagation();
              var isOpen = statusMenu.style.display === 'block';
              // Cerrar todos los dropdowns abiertos
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

            // Cerrar al hacer click fuera
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
              // Color dot
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

            // Segunda fila con checkbox y botones

            const actionRow = document.createElement('div');
            actionRow.className = 'd-flex align-items-center gap-3 mt-4 px-3';
          
            // Checkbox "Seleccionar Todos"
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'form-check d-flex align-items-center gap-2 mb-0';
            checkboxDiv.innerHTML = `
              <input type="checkbox" class="form-check-input border-dark" id="selectAllCheckbox">
            `;

            // Botones (Agregamos IDs y los iniciamos deshabilitados)
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

            // Botón "Destacar" masivo (solo admin)
            let destacarBtn = null;
            if (isAdmin) {
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
        lengthChange: false,
        info: false,
        order: [],
        data: listPro,
        columns: [
          {
            title: "#",
            data: null,
            defaultContent: '',
            width: isAdmin ? '120px' : '40px',
            className: 'text-center',
            render: function(data, type, row, meta) {
              let html = `<span class="fw-bold row-number">${meta.row + 1}</span>`;
              // Si es admin, mostrar la(s) agencia(s) de los agentes asignados
              if (isAdmin && row.agents && row.agents.length > 0) {
                const agencyNames = row.agents
                  .map(aId => {
                    const user = usersMap[aId];
                    if (user?.parentId && agenciesMap[user.parentId]) {
                      return agenciesMap[user.parentId];
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
  .format(new Date(data.createdAt)).replace(/\//g, '-')}</span>`; // Para búsqueda por ID de usuario (agencia)
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
                  //const isRealRoute = row.media.photos.find(photo => !photo.path?.includes('C:\\Users\\JcFar\\Documents'))
                  //if(isRealRoute){
                    imagen = API_URL+'/'+myPhoto.thumbnail 
                  //}
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
                // Indicador de propiedad destacada
                if (row.featured?.isActive) {
                  data += `<span class="planes-propiedad btn btn-sm rounded-4 d-inline-flex align-items-center gap-2 px-3 py-1" style="background-color:#198754; color:#fff; border:none; white-space:nowrap; text-decoration:none;">
                    <i class="fa-solid fa-diamond" style="font-size:12px;"></i>Destacada
                  </span>`;
                }
                if (isAdmin && !row.featured?.isActive && row.status === 'published') {
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
          /* { 
            title: "Dirección", 
            data: null,
            defaultContent: '',
            render: function(row) { return row.location?.address || 'N/A'; }
          }, */
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
              // Si está rechazada, agregar enlace "Ver motivo"
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
            const assignBtn = isAgencia && hasAgents
              ? `<a href="#" class="text-body assign-agents" data-id="${row._id}" data-agents='${agentsJson}' data-userid="${row.userId || ''}" title="Asignar agentes">
                   <i class="fa-solid fa-user-tie"></i>
                 </a>`
              : '';
            const editBtn = `<a href="#" class="text-body edit-propiedad" data-id="${row._id}">
                   <i class="fa-solid fa-edit"></i>
                 </a>`;
            const rejectBtn = isAdmin && (row.status === 'pre-published' || row.status === 'disabled')
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
        // Columnas invisibles para búsqueda (no se renderizan en la tabla)
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

      // Guardar búsqueda en sessionStorage en tiempo real al escribir en el input
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

      // Función auxiliar para habilitar/deshabilitar botones
      const toggleActionButtons = () => {
        const selectedCount = dataTableRef.current.$('.delete-checkbox:checked').length;
        const btnSelector = isAdmin
          ? '#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador, #btnDestacar'
          : '#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador';
        $(btnSelector).prop('disabled', selectedCount === 0);

        if (selectedCount > 0) {
          const selectedIds = dataTableRef.current.$('.delete-checkbox:checked')
            .map(function() { return $(this).data('id'); }).get();

          // Lógica Desactivar/Activar
          const allDisabled = selectedIds.every(id => {
            const item = listPro.find(p => p._id === id);
            return item?.status === 'disabled';
          });
          $('#btnDesactivar').html(
            allDisabled
              ? '<i class="fa-solid fa-toggle-on"></i> Activar'
              : '<i class="fa-solid fa-toggle-off"></i> Desactivar'
          );

          // Lógica Publicar / Borrador
          const statuses = selectedIds.map(id => listPro.find(p => p._id === id)?.status);
          const algunaPrePublished = statuses.some(s => s === 'pre-published');
          const algunaPublished = statuses.some(s => s === 'published');
          const algunaDraft = statuses.some(s => s === 'draft');

          if (isAdmin) {
            // Admin: Publicar si AL MENOS UNA es pre-published
            $('#btnPublicar').prop('disabled', !algunaPrePublished);
          } else {
            // Agencia/Agente: Publicar solo si AL MENOS UNA es draft (disabled debe activarse primero)
            $('#btnPublicar').prop('disabled', !algunaDraft);
          }
          // Borrador: si AL MENOS UNA es published o pre-published
          $('#btnBorrador').prop('disabled', !algunaPublished && !algunaPrePublished);

          // Destacar: si AL MENOS UNA está publicada y no destacada (solo admin)
          if (isAdmin) {
            const algunaPublishedNoDestacada = selectedIds.some(id => {
              const item = listPro.find(p => p._id === id);
              return item?.status === 'published' && item?.featured?.isActive !== true;
            });
            $('#btnDestacar').prop('disabled', !algunaPublishedNoDestacada);
          }
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

      // ==========================================
      // Evento: Clic en el botón "Desactivar/Activar"
      // ==========================================
      dtContainer.on('click', '#btnDesactivar', async function() {
        const idsSeleccionados = dataTableRef.current.$('.delete-checkbox:checked')
          .map(function() { return $(this).data('id'); }).get();

        if (idsSeleccionados.length === 0) return;

        // Determinar la acción según el texto del botón
        const botonTexto = $('#btnDesactivar').text().trim();
        const esActivar = botonTexto.includes('Activar');

        if (esActivar) {
          // Modo ACTIVAR: solo propiedades disabled
          const idsAActivar = idsSeleccionados.filter(id => {
            const prop = listPro.find(p => p._id === id);
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
            // Guardar estado de búsqueda antes de actualizar
            if (dataTableRef.current) {
              try {
                savedSearchRef.current = dataTableRef.current.search() || '';
                savedPageRef.current = dataTableRef.current.page() || 0;
              } catch (e) { /* ignorar */ }
            }
            
            // Al activar una propiedad desactivada, se coloca como borrador (draft)
            await Promise.all(idsAActivar.map(id => updatePropiedad(id, { status: 'draft' })));
            invalidateCache();
            setAllPropiedades(prev => prev.map(item => idsAActivar.includes(item._id) ? { ...item, status: 'draft' } : item));
            setListPro(prev => prev.map(item => idsAActivar.includes(item._id) ? { ...item, status: 'draft' } : item));
            setAlertVariant('success');
            setAlertMessage(`${idsAActivar.length} propiedad(es) activada(s) como borrador. Puedes enviarla(s) a revisión cuando estén listas.`);
          } catch (error) {
            setAlertVariant('danger');
            setAlertMessage('Error al activar.');
          } finally {
            setLoading(false);
          }
        } else {
          // Modo DESACTIVAR: solo propiedades que NO están disabled
          const idsADesactivar = idsSeleccionados.filter(id => {
            const prop = listPro.find(p => p._id === id);
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
            // Guardar estado de búsqueda antes de actualizar
            if (dataTableRef.current) {
              try {
                savedSearchRef.current = dataTableRef.current.search() || '';
                savedPageRef.current = dataTableRef.current.page() || 0;
              } catch (e) { /* ignorar */ }
            }
            
            await Promise.all(idsADesactivar.map(id => updatePropiedad(id, { status: 'disabled' })));
            invalidateCache();
            setAllPropiedades(prev => prev.map(item => idsADesactivar.includes(item._id) ? { ...item, status: 'disabled' } : item));
            setListPro(prev => prev.map(item => idsADesactivar.includes(item._id) ? { ...item, status: 'disabled' } : item));
            setAlertVariant('success');
            setAlertMessage(`${idsADesactivar.length} propiedad(es) desactivada(s) correctamente.`);
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

      // ==========================================
      // Evento: Publicar
      // Admin: pre-published → published
      // Agencia/Agente: draft/disabled → pre-published
      // ==========================================
      dtContainer.on('click', '#btnPublicar', async function() {
        const ids = dataTableRef.current.$('.delete-checkbox:checked')
          .map(function() { return $(this).data('id'); }).get();
        if (ids.length === 0) return;

        // Filtrar solo las propiedades que aplican según el rol
        const idsFiltrados = ids.filter(id => {
          const prop = listPro.find(p => p._id === id);
          if (!prop) return false;
          if (isAdmin) return prop.status === 'pre-published';
          // No-admin: solo draft puede enviarse a revisión; disabled debe activarse primero
          return prop.status === 'draft';
        });

        // Verificar si hay propiedades desactivadas seleccionadas (para mostrar mensaje claro)
        const idsDesactivados = ids.filter(id => {
          const prop = listPro.find(p => p._id === id);
          return prop?.status === 'disabled';
        });
        if (!isAdmin && idsDesactivados.length > 0 && idsFiltrados.length === 0) {
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

        const nuevoStatus = isAdmin ? 'published' : 'pre-published';
        const mensaje = isAdmin ? 'Aprobando propiedades...' : 'Enviando a revisión...';
        const mensajeExito = isAdmin ? 'Propiedad(es) aprobada(s).' : 'Propiedad(es) enviada(s) a revisión.';

        // ─── Validar campos obligatorios ───
        const propiedadesConError = [];

        for (const id of idsFiltrados) {
          const prop = listPro.find(p => p._id === id);
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
          // Guardar estado de búsqueda antes de actualizar
          if (dataTableRef.current) {
            try {
              savedSearchRef.current = dataTableRef.current.search() || '';
              savedPageRef.current = dataTableRef.current.page() || 0;
            } catch (e) { /* ignorar */ }
          }
          
          await Promise.all(idsFiltrados.map(id => updatePropiedad(id, { status: nuevoStatus })));
          invalidateCache();
          const actualizarLista = (lista) =>
            lista.map(item => idsFiltrados.includes(item._id) ? { ...item, status: nuevoStatus } : item);
          setAllPropiedades(prev => actualizarLista(prev));
          setListPro(prev => actualizarLista(prev));
          setAlertVariant('success');
          setAlertMessage(mensajeExito);
          setShowAlert(true);
          setTimeout(() => setShowAlert(false), 4000);
          $('#selectAllCheckbox').prop('checked', false);
          $('#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador').prop('disabled', true);
        } catch (error) {
          setAlertVariant('danger');
          setAlertMessage('Error al publicar.');
          setShowAlert(true);
        } finally {
          setLoading(false);
        }
      });

      // ==========================================
      // Evento: Borrador (published/pre-published → draft)
      // ==========================================
      dtContainer.on('click', '#btnBorrador', async function() {
        const ids = dataTableRef.current.$('.delete-checkbox:checked')
          .map(function() { return $(this).data('id'); }).get();
        if (ids.length === 0) return;

        // Filtrar solo las que están en published o pre-published
        const idsFiltrados = ids.filter(id => {
          const prop = listPro.find(p => p._id === id);
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
          // Guardar estado de búsqueda antes de actualizar
          if (dataTableRef.current) {
            try {
              savedSearchRef.current = dataTableRef.current.search() || '';
              savedPageRef.current = dataTableRef.current.page() || 0;
            } catch (e) { /* ignorar */ }
          }
          
          await Promise.all(idsFiltrados.map(id => updatePropiedad(id, { status: 'draft' })));
          invalidateCache();
          const actualizarLista = (lista) =>
            lista.map(item => idsFiltrados.includes(item._id) ? { ...item, status: 'draft' } : item);
          setAllPropiedades(prev => actualizarLista(prev));
          setListPro(prev => actualizarLista(prev));
          setAlertVariant('success');
          setAlertMessage('Propiedad(es) colocada(s) como borrador.');
          setShowAlert(true);
          setTimeout(() => setShowAlert(false), 4000);
          $('#selectAllCheckbox').prop('checked', false);
          $('#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador').prop('disabled', true);
        } catch (error) {
          setAlertVariant('danger');
          setAlertMessage('Error al colocar como borrador.');
          setShowAlert(true);
        } finally {
          setLoading(false);
        }
      });

      // ==========================================
      // Evento: Clic en el botón "Destacar" (masivo)
      // ==========================================
      dtContainer.on('click', '#btnDestacar', function() {
        const ids = dataTableRef.current.$('.delete-checkbox:checked')
          .map(function() { return $(this).data('id'); }).get();
        if (ids.length === 0) return;
        setHighlightIds(ids);
        setHighlightDate('');
        setShowHighlightModal(true);
      });

      // ==========================================
      // Evento: Clic en el botón "Eliminar" TERMINADO
      // ==========================================
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
            
            // Guardar estado de búsqueda antes de actualizar
            if (dataTableRef.current) {
              try {
                savedSearchRef.current = dataTableRef.current.search() || '';
                savedPageRef.current = dataTableRef.current.page() || 0;
              } catch (e) { /* ignorar */ }
            }
          
            try {
              const response = await deletePropiedad(idsAEliminar);
              
              if (response.success) {
                // 1. Mostrar alerta de éxito
                invalidateCache();
                setAlertVariant('success');
                setAlertMessage(response.message || 'Propiedad(es) eliminada(s) correctamente.');
                setShowAlert(true);

                // 2. Filtrar las listas para remover los elementos eliminados sin recargar la página
                setAllPropiedades(prevAll => {
                  const updatedAll = prevAll.filter(item => !idsAEliminar.includes(item._id));
                  
                  // Actualizamos los contadores basados en la nueva lista
                  setAll(updatedAll.length);
                  setSold(updatedAll.filter(item => item.market?.mode === 'Venta').length);
                  setRent(updatedAll.filter(item => item.market?.mode === 'Alquiler').length);
                  
                  return updatedAll;
                });

                setListPro(prevList => prevList.filter(item => !idsAEliminar.includes(item._id)));

                // 3. Reiniciar el checkbox principal y botones
                $('#selectAllCheckbox').prop('checked', false);
                $('#btnDesactivar, #btnEliminar, #btnPublicar, #btnBorrador').prop('disabled', true);
                
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
              // Ocultar alerta automáticamente después de 4 segundos
              setTimeout(() => {
                setShowAlert(false);
              }, 4000);
            }
          }
        }
      });
    }

      // Restaurar estado guardado del DataTable (búsqueda y página)
      try {
        if (savedPageRef.current > 0) {
          dataTableRef.current.page(savedPageRef.current).draw('page');
        }
        if (savedSearchRef.current) {
          dataTableRef.current.search(savedSearchRef.current).draw();
        }
      } catch (e) {
        // Si hay error al restaurar, ignorar silenciosamente
      }

      // Restaurar el texto visible en el input de búsqueda después del render
      setTimeout(() => {
        const searchInput = $(tableRef.current).closest('.dt-container').find('.dt-search .dt-input');
        if (searchInput.length && savedSearchRef.current) {
          searchInput.val(savedSearchRef.current);
        }
      }, 0);

    // Cleanup al desmontar o cuando cambie listPro
    return () => {
      // Guardar estado del DataTable en sessionStorage antes de desmontar
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
      }

      if (tableRef.current) {
        $(tableRef.current).off('change', '.delete-checkbox');
        $(tableRef.current).off('search.dt');
        const dtContainer = $(tableRef.current).closest('.dt-container');
        if (dtContainer.length) {
          dtContainer.off('change', '#selectAllCheckbox');
          dtContainer.off('click', '#btnEliminar');
          dtContainer.off('click', '#btnDesactivar');
          dtContainer.off('click', '#btnPublicar');
          dtContainer.off('click', '#btnBorrador');
          dtContainer.off('click', '#btnDestacar');
        }
      }
    };

  }, [listPro]);

  // Editar propiedad (usamos event delegation en document para que funcione aunque la tabla no esté renderizada)
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

  // Rechazar propiedad (solo admin, solo pre-published) - abre modal con checkboxes
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

  // Ver motivo de rechazo - abre modal de solo lectura
  useEffect(() => {
    const handleViewReject = function(e) {
      e.preventDefault();
      const id = this.dataset.id;
      if (!id) return;
      // Buscar la propiedad en listPro para obtener reasonRejected
      const prop = listPro.find(p => p._id === id);
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
  }, [listPro]);

  // Confirmar rechazo desde el modal
  const confirmRejectFromTable = async () => {
    const id = rejectPropId;
    if (!id) return;

    // Guardar estado de búsqueda antes de actualizar
    if (dataTableRef.current) {
      try {
        savedSearchRef.current = dataTableRef.current.search() || '';
        savedPageRef.current = dataTableRef.current.page() || 0;
      } catch (e) { /* ignorar */ }
    }

    try {
      await updatePropiedad(id, {
        status: 'rejected',
        reasonRejected: {
          lowImagen: rejectReasons.lowImagen,
          incompleteData: rejectReasons.incompleteData
        }
      });
      setAllPropiedades(prev => prev.map(item => item._id === id ? { ...item, status: 'rejected', reasonRejected: { ...rejectReasons } } : item));
      setListPro(prev => prev.map(item => item._id === id ? { ...item, status: 'rejected', reasonRejected: { ...rejectReasons } } : item));
      setAlertVariant('success');
      setAlertMessage('Propiedad rechazada correctamente.');
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
      const id = $(this).closest('div').find('.prop-title-text').data('id') || $(this).closest('[data-id]').data('id');
      // Buscar el data-id desde el checkbox más cercano
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

      // Preseleccionar agentes asignados (incluyendo los inactivos)
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
    
    // Guardar estado de búsqueda antes de actualizar
    if (dataTableRef.current) {
      try {
        savedSearchRef.current = dataTableRef.current.search() || '';
        savedPageRef.current = dataTableRef.current.page() || 0;
      } catch (e) { /* ignorar */ }
    }
    
    const result = await assignAgents(modalPropId, selectedAgents.map(a => a.value));
    setSavingAgents(false);
    if (result.success) {
      invalidateCache();
      setAlertVariant('success');
      setAlertMessage('Agentes asignados correctamente.');
      // Actualizar la lista local con los nuevos agentes
      const updateAgents = (list) => list.map(p =>
        p._id === modalPropId ? { ...p, agents: selectedAgents.map(a => a.value) } : p
      );
      setAllPropiedades(prev => updateAgents(prev));
      setListPro(prev => updateAgents(prev));
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
    
    // Guardar estado de búsqueda antes de actualizar
    if (dataTableRef.current) {
      try {
        savedSearchRef.current = dataTableRef.current.search() || '';
        savedPageRef.current = dataTableRef.current.page() || 0;
      } catch (e) { /* ignorar */ }
    }
    
    try {
      await Promise.all(highlightIds.map(id =>
        updatePropiedad(id, { featured: { isActive: true, expiresAt: highlightDate } })
      ));
      invalidateCache();
      // Actualizar estado local
      const actualizarLista = (lista) =>
        lista.map(item =>
          highlightIds.includes(item._id)
            ? { ...item, featured: { isActive: true, expiresAt: highlightDate } }
            : item
        );
      setAllPropiedades(prev => actualizarLista(prev));
      setListPro(prev => actualizarLista(prev));
      setAlertVariant('success');
      setAlertMessage('Propiedad(es) destacada(s) exitosamente.');
    } catch (error) {
      setAlertVariant('danger');
      setAlertMessage('Error al destacar propiedad(es).');
    }
    setSavingHighlight(false);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 4000);
    setShowHighlightModal(false);
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
            {/* <div className='border rounded-3 d-flex p-3 gap-3 align-items-center'>
              <img src={crm1} className='rounded-circle' style={{ width: '50px', height: "50px" }} alt="" />
              <div className='text-center'>
                Integra con Wasi CRM
                <Button variant="dark" className="d-flex align-items-center rounded-pill px-4 py-1 mx-auto mt-2 lh-1">Conectar <i className='ms-2 fa-thin fa-arrow-right' style={{ fontSize: '12px' }}></i></Button>
              </div>
            </div> */}
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

      {/* Alerta flotante */}
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


      {/* Contenedor seguro para mensajes condicionales (React controla esto) */}
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

      {/* Contenedor AISLADO para DataTables (React no toca el interior de este div) */}
      {!loadingShow && (
        <div className="w-100">
          <table ref={tableRef} className="display propiedades-table" style={{ width: '100%' }}>
            {/* DataTables generará las columnas y sus propios divs automáticamente aquí dentro */}
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

      {/* Modal EasyBroker */}
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

      {/* Modal rechazar propiedad */}
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

      {/* Modal ver motivo de rechazo (solo lectura) */}
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

      {/* Modal destacar propiedades */}
      <Modal show={showHighlightModal} onHide={() => setShowHighlightModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {/* <img src={diamond} alt="icon" style={{ width: '18px', height: '18px', objectFit: 'contain', marginRight: '8px' }} /> */}
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