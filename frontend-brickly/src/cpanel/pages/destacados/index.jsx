import { useEffect, useState, useRef, useCallback } from 'react';

import { Container, Alert } from 'react-bootstrap';
import { getPropiedades, updatePropiedad } from '../../services/propiedades';
import { getUsers } from '../../../services/listUsers';
import { updateAgente } from '../../services/agentes';
import { API_URL } from '../../../services/authService';
import sinPropiedad from './../../assets/images/iconos/sinPropiedad.png';
import diamond from '../../../assets/images/iconos/diamond.png';
import alertify from 'alertifyjs';
import $ from 'jquery';
import 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import 'datatables.net-responsive-dt';
import 'datatables.net-responsive-dt/css/responsive.dataTables.css';
import espanol from 'datatables.net-plugins/i18n/es-ES.mjs';

function Destacados() {
  const [listDestacadas, setListDestacadas] = useState([]);
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filterType, setFilterType] = useState('propiedades');
  const tableRef = useRef(null);
  const dataTableRef = useRef(null);

  const [showAlert, setShowAlert] = useState(false);

  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState('success');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Procesando...');
  const [loadingShow, setLoadingShow] = useState(false);

  // Cargar propiedades destacadas al montar
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingShow(true);

        // Cargar solo propiedades destacadas (featured.isActive=true&status=published)
        const propsRes = await getPropiedades({ 'featured.isActive': true, status: 'published' });
        const propsData = Array.isArray(propsRes?.data) ? propsRes.data : [];

        setListDestacadas(propsData);
        setUsers([]);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setListDestacadas([]);
        setUsers([]);
      } finally {
        setLoadingShow(false);
        setLoaded(true);
      }
    };

    loadData();
  }, []);

  // Cargar usuarios según el filtro seleccionado (agencia/agente)
  useEffect(() => {
    if (!loaded) return;
    if (filterType === 'propiedades') return; // No cargar usuarios para propiedades

    const loadUsers = async () => {
      try {
        setLoadingShow(true);

        let params = {};
        if (filterType === 'agencia') {
          params = { roles: 'agencia', isEnabled: true, featured_user: 1 };
        } else if (filterType === 'agente') {
          params = { roles: 'agente', isEnabled: true };
        }

        const usersRes = await getUsers(params);
        const usersData = Array.isArray(usersRes?.data) ? usersRes.data : [];

        setUsers(usersData);
      } catch (error) {
        console.error('Error al cargar usuarios:', error);
        setUsers([]);
      } finally {
        setLoadingShow(false);
      }
    };

    loadUsers();
  }, [filterType, loaded]);



  // Obtener datos filtrados según el tipo seleccionado
  const getFilteredData = useCallback(() => {
    if (filterType === 'propiedades') {
      return listDestacadas
        .filter(item => item.featured?.isActive === true)
        .sort((a, b) => {
          const dateA = a.featured?.expiresAt ? new Date(a.featured.expiresAt).getTime() : 0;
          const dateB = b.featured?.expiresAt ? new Date(b.featured.expiresAt).getTime() : 0;
          return dateA - dateB;
        });
    } else if (filterType === 'agencia') {
      return users.filter(u => {
        const roles = Array.isArray(u.roles) ? u.roles : [u.roles];
        return roles.includes('agencia') && u.featured_user;
      });
    } else if (filterType === 'agente') {
      return users.filter(u => {
        const roles = Array.isArray(u.roles) ? u.roles : [u.roles];
        return roles.includes('agente') && u.featured_user;
      });
    }
    return [];
  }, [filterType, listDestacadas, users]);

  useEffect(() => {
    if (!tableRef.current || !loaded) return;

    // Destruir DataTable anterior si existe
    if (dataTableRef.current) {
      try {
        dataTableRef.current.destroy();
      } catch (e) {
        // Ignorar errores de destrucción
      }
      dataTableRef.current = null;
    }

    // Limpiar el contenido del table para evitar conflictos
    $(tableRef.current).empty();

    const columns = [];
    const data = getFilteredData();

    if (filterType === 'propiedades') {
      columns.push(
        {
          title: '#',
          data: null,
          width: '40px',
          className: 'text-center',
          render: function (data, type, row, meta) {
            return `<span class="fw-bold">${meta.row + 1}</span>`;
          },
          orderable: false,
          searchable: false,
        },
        {
          title: 'Imagen',
          data: null,
          render: function (row) {
            let imagen = '';
            if (row?.media?.photos && row?.media?.photos.length > 0) {
              const myPhoto = row.media.photos.find(photo => photo.isMain === true);
              if (myPhoto?.path) {
                const isRealRoute = row.media.photos.find(
                  photo => !photo.path?.includes('C:\\Users\\JcFar\\Documents')
                );
                if (isRealRoute) {
                  imagen = API_URL + '/' + myPhoto.path;
                }
              }
            }
            return `
              <div class="d-flex justify-content-center">
                <img src="${imagen || sinPropiedad}" alt="image" style="width:80px;height:80px;object-fit:cover;border-radius:50%;" />
              </div>
            `;
          },
          orderable: false,
          searchable: false,
        },
        {
          title: 'Propiedad',
          data: null,
          render: function (row) {
            return row.market?.title || 'Sin título';
          },
        },
        {
          title: 'Fecha de expiración',
          data: null,
          render: function (row) {
            if (!row.featured?.expiresAt) return 'N/A';
            const parts = row.featured.expiresAt.split('T')[0].split('-');
            if (parts.length === 3) {
              const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
              return `${parseInt(parts[2])} de ${meses[parseInt(parts[1]) - 1]} de ${parts[0]}`;
            }
            return row.featured.expiresAt.split('T')[0];
          },
        },
        {
          title: '<div class="text-center">Acciones</div>',
          data: null,
          responsivePriority: 1,
          orderable: false,
          searchable: false,
          render: function (row) {
            return `
              <div class="d-flex gap-3 justify-content-center">
                <a href="#" class="text-danger remove-featured" data-id="${row._id}" data-type="propiedad" title="Quitar destacado">
                  <i class="fa-sharp fa-solid fa-xmark fs-3"></i>
                </a>
              </div>
            `;
          },
        }
      );
    } else {
      // Agencias o Agentes
      columns.push(
        {
          title: '#',
          data: null,
          width: '40px',
          className: 'text-center',
          render: function (data, type, row, meta) {
            return `<span class="fw-bold">${meta.row + 1}</span>`;
          },
          orderable: false,
          searchable: false,
        },
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
          searchable: false,
        },
        {
          title: 'Nombre',
          data: null,
          render: (row) => row.name || row.username || 'N/A',
        },
        {
          title: 'Correo',
          data: null,
          render: (row) => row.email || 'N/A',
        },
        {
          title: 'Tipo destacado',
          data: null,
          render: (row) => {
            if (row.featured_user === 2) {
              return '<span class="badge" style="background-color:#6f42c1;">Destacado</span>';
            }
            return '<span class="badge bg-warning text-dark">Destacado</span>';
          },
        },
        {
          title: 'Fecha de expiración',
          data: null,
          render: (row) => {
            if (!row.featured_expire) return 'N/A';
            const parts = row.featured_expire.split('T')[0].split('-');
            if (parts.length === 3) {
              const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
              return `${parseInt(parts[2])} de ${meses[parseInt(parts[1]) - 1]} de ${parts[0]}`;
            }
            return row.featured_expire.split('T')[0];
          },
        },
        {
          title: '<div class="text-center">Acciones</div>',
          data: null,
          responsivePriority: 1,
          orderable: false,
          searchable: false,
          render: function (row) {
            return `
              <div class="d-flex gap-3 justify-content-center">
                <a href="#" class="text-danger remove-featured" data-id="${row._id}" data-type="usuario" title="Quitar destacado">
                  <i class="fa-sharp fa-solid fa-xmark fs-3"></i>
                </a>
              </div>
            `;
          },
        }
      );
    }

    // Inicializar DataTable con los datos correctos
    dataTableRef.current = $(tableRef.current).DataTable({
      language: espanol,
      responsive: true,
      pageLength: 10,
      lengthChange: false,
      info: false,
      data: data,
      columns,
      destroy: true,
    });

    // Evento: Quitar destacado
    $(tableRef.current).on('click', '.remove-featured', async function (e) {
      e.preventDefault();
      const id = $(this).data('id');
      const type = $(this).data('type');

      const respuesta = await new Promise((resolve) => {
        alertify.confirm(
          'BRICKLY HOMES',
          '¿Estás seguro de quitar el destacado?',
          () => resolve(true),
          () => resolve(false)
        );
      });
      if (!respuesta) return;

      setLoading(true);
      setLoadingMessage('Quitando destacado...');
      try {
        if (type === 'propiedad') {
          await updatePropiedad(id, {
            featured: { isActive: false },
          });
          setListDestacadas(prev => prev.map(item =>
            item._id === id ? { ...item, featured: { ...item.featured, isActive: false } } : item
          ));
        } else {
          await updateAgente(id, {
            featured_user: 0,
            featured_expire: null,
          });
          setUsers(prev => prev.map(u =>
            u._id === id ? { ...u, featured_user: 0, featured_expire: null } : u
          ));
        }

        setAlertVariant('success');
        setAlertMessage('Destacado quitado correctamente.');
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 4000);
      } catch (error) {
        setAlertVariant('danger');
        setAlertMessage('Error al quitar el destacado.');
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 4000);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      if (tableRef.current) {
        $(tableRef.current).off('click', '.remove-featured');
      }
    };
  }, [filterType, loaded, listDestacadas, users, getFilteredData]);


  // cleanup al desmontar
  useEffect(() => {
    return () => {
      if (dataTableRef.current) {
        dataTableRef.current.destroy();
        dataTableRef.current = null;
      }
    };
  }, []);

  const tiposFiltro = [
    { key: 'propiedades', label: 'Propiedades' },
    { key: 'agencia', label: 'Agencias' },
    { key: 'agente', label: 'Agentes' },
  ];

  return (
    <Container>
      <div className="d-flex align-items-center gap-2 mb-4">
        <div>
          <div className="fs-1">Destacados</div>
          <p className="mb-0">Gestiona los elementos que están destacados actualmente.</p>
        </div>
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
            <i
              className={`fa-solid ${alertVariant === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}
            ></i>
            <span>{alertMessage}</span>
          </div>
        </Alert>
      )}

      {/* Filtros por tipo - estilo toggle buttons como en usuarios */}
      {!loadingShow && (
        <div className="d-flex gap-2 align-items-center flex-wrap mb-4">
          {tiposFiltro.map(tipo => (
            <div
              key={tipo.key}
              onClick={() => setFilterType(tipo.key)}
              className='border py-1 px-3 rounded-1'
              style={{
                fontSize: '14px',
                color: filterType === tipo.key ? '#fff' : '#5D5B5A',
                backgroundColor: filterType === tipo.key ? '#000' : '#FAFAFA',
                width: 'fit-content',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tipo.label}
            </div>
          ))}
        </div>
      )}

      <div className="containerTable">
        {loading && (
          <div className="text-center text-primary fw-bold">
            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
            {loadingMessage}
          </div>
        )}
        {loadingShow && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-3">Cargando destacados...</p>
          </div>
        )}
      </div>

      <div className="w-100">
        <table
          ref={tableRef}
          id="destacadas-table"
          className="display nowrap"
          style={{ width: '100%' }}
        ></table>
      </div>
    </Container>
  );
}

export default Destacados;
