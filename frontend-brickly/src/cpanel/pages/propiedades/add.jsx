import { useState, useEffect, useRef } from 'react';
import { Container, Accordion, Row, Col, Form, Button, Alert, Badge } from 'react-bootstrap';
import Select from 'react-select';
import { useNavigate, Link } from 'react-router-dom';
import SelectoresUbicacion from './../../components/SelectoresUbicacion';
import SelectorMapaDropdown from './../../components/SelectorMapaDropdown';
import { createPropiedad, assignAgents } from '../../services/propiedades';
import { getCurrentUser, API_URL } from '../../../services/authService';
import { getAgentes } from '../../services/agentes';
import SelectorAmenidades from '../../components/SelectorAmenidades';
import SelectorMultimedia from '../../components/SelectorMultimedia';
import MyTextEditor from '../../components/ckeditor';

import arrow from '../../../assets/images/iconos/arrow.png'

// Definición de secciones con sus campos
const SECCIONES = {
  datosPropiedad: {
    id: 'datosPropiedad',
    titulo: 'Datos de la propiedad',
    icono: 'fa-solid fa-building',
    obligatoria: true,
    campos: {
      title: { type: 'text', label: 'Nombre de la propiedad *', col: 6 },
      type: { 
        type: 'select', 
        label: 'Tipo de propiedad *', 
        col: 2,
        options: ['Apartamento', 'Bodega', 'Casa', 'Edificio', 'Finca', 'Local comercial', 'Oficina', 'Terreno']
      },
      mode: { 
        type: 'select', 
        label: 'Modalidad *', 
        col: 2,
        options: ['Venta', 'Alquiler']
      },
      price: { type: 'number', label: 'Precio total en quetzales *', col: 3 },
      exchangeRate: { type: 'number', label: 'Tasa dólar *', col: 2, opcional: false },
      priceUSD: { type: 'number', label: 'Precio total en dólar *', col: 3, disabled: false, opcional: false }, 
      /* M2Measure: { type: 'number', label: 'Cantidad de M²', col: 3, opcional: true }, */
      pricePerM2: { type: 'number', label: 'Precio por M² en quetzales', col: 3, opcional: true },
      priceM2USD: { type: 'number', label: 'Precio por M² en dólar', col: 3, opcional: true },
      description: { type: 'textarea', label: 'Descripción de la propiedad *', col: 12, opcional: false }
    }
  },
  ubicacion: {
    id: 'ubicacion',
    titulo: 'Ubicación y entorno',
    icono: 'fa-solid fa-location-dot',
    obligatoria: true,
    campos: {
      gatedCommunity: { type: 'text', label: 'Condominio', col: 6, opcional: true },
      address: { type: 'text', label: 'Dirección exacta', col: 6, opcional: true },
      coordinates: { type: 'text', label: 'Coordenadas GPS *', col: 6, opcional: false },
      floor: { type: 'number', label: 'Piso o nivel', col: 3, opcional: true },
      waterRelation: { 
        type: 'select', 
        label: 'Relación con el agua', 
        col: 2, 
        options: ['Frente al mar', 'Frente a canal', 'Ninguna'],
        opcional: true
      },
      department: { type: 'hidden', label: '', col: 0 },
      municipality: { type: 'hidden', label: '', col: 0 },
      zone: { type: 'hidden', label: '', col: 0 },
      view: { type: 'select', label: 'Vista', col: 3, options: ['A los volcanes', 'A la ciudad', 'Al bosque', 'Al mar', 'A la playa', 'Sin vista especial'], opcional: true },
      streettype: { type: 'select', label: 'Tipo de calle', col: 3, options: ['Asfaltada', 'Adoquinada', 'De tierra', 'Calle privada (Condominio)'], opcional: true },
    }
  },
  dimensiones: {
    id: 'dimensiones',
    titulo: 'Dimensiones y áreas',
    icono: 'fa-solid fa-chart-area',
    obligatoria: true,
    campos: {
      landM2: { type: 'number', label: 'Área de terreno (m²)', col: 4, opcional: true },
      landV2: { type: 'number', label: 'Área de terreno (v²)', col: 4, opcional: true },
      constructionM2: { type: 'number', label: 'Área de construcción (m²)', col: 4, opcional: true },
      storageM2: { type: 'number', label: 'Espacio de almacenamiento (m²)', col: 4, opcional: true }
    }
  },
  estruturas: {
    id: 'estruturas',
    titulo: 'Estructuras y obra gris',
    icono: 'fa-solid fa-trowel-bricks',
    obligatoria: false,
    campos: {
      constructionYear: { type: 'number', label: ' Año de construcción', col: 4, opcional: true },
      remodelYear: { type: 'number', label: 'Año de remodelación', col: 4, opcional: true },
      levels: { type: 'number', label: 'Niveles', col: 4, opcional: true },
      ceilingHeight: { type: 'number', label: 'Altura de cielo (mts)', col: 4, opcional: true },
      perimeterWall: { 
        type: 'select', 
        label: 'Muro perimetral de seguridad', 
        col: 4,
        options: ['Si', 'No'],
        optional: true
      }
    }
  },
  ambiente: {
    id: 'ambiente',
    titulo: 'Distribución de ambientes',
    icono: 'fa-solid fa-tree-city',
    obligatoria: false,
    campos: {
      totalRooms: { type: 'number', label: 'Total de Ambientes *', col: 4 },
      bedrooms: { type: 'number', label: 'Dormitorios *', col: 4 },
      bathrooms: { type: 'number', label: 'Baños completos *', col: 4},
      halfBathrooms: { type: 'number', label: 'Medios baños', col: 4, opcional: true },
      serviceRoom: { 
        type: 'select', 
        label: 'Habitación de servicio', 
        col: 4, 
        options: ['Con baño propio', 'Solo habitación', 'No tiene'],
        optional: true
      },
      deck: { 
        type: 'select', 
        label: 'Pérgola / Deck social', 
        col: 4, 
        options: ['Si', 'No'],
        optional: true
      },
      parkingSpots: { type: 'number', label: 'Parqueo / Driveway', col: 4, opcional: true },
      furnished: { 
        type: 'select', 
        label: 'Amueblado / No amueblado', 
        col: 4,  
        options: ['Si', 'No'], 
        opcional: true 
      },
      floors: { type: 'number', label: 'Número de pisos', col: 4, opcional: true },
      laundry: { 
        type: 'select', 
        label: 'Área de lavandería', 
        col: 4, 
        options: ['Techada', 'Al aire libre', 'Closet de lavandería (Torre)'],
        optional: true
      },
      study: { 
        type: 'select', 
        label: 'Estudio/Oficina', 
        col: 4, 
        options: ['Si', 'No'],
        optional: true
      },
      familyroom: { 
        type: 'select', 
        label: 'Sala familiar', 
        col: 4, 
        options: ['Independiente de la sala principal', 'Sala/Comedor integrados', 'Sala de visitas', 'Solo sala Principal'],
        optional: true
      }
    }
  },
  amenidades: {
    id: 'amenidades',
    titulo: 'Amenidades',
    icono: 'fa-solid fa-umbrella-beach',
    obligatoria: false,
    campos: {
      amenities: { type: 'amenities', label: '', col: 12 }
    }
  },
  gastos: {
    id: 'gastos',
    titulo: 'Gastos fijos',
    icono: 'fa-solid fa-book',
    obligatoria: false,
    campos: {
      stoveType: { 
        type: 'select', 
        label: 'Tipo de estufa', 
        col: 4,
        options: ['Gas Propano (Tambo)', 'Gas Centralizado (Contador)', 'Eléctrica 220v', 'Inducción'],
        opcional: true
      },
      waterService: { 
        type: 'select', 
        label: 'Servicio de Agua', 
        col: 4,
        options: ['Público', 'Pozo propio del condominio', 'Empresa privada'],
        opcional: true
      },
      maintenanceCost: { type: 'number', label: 'Mantenimiento (USD)', col: 4, opcional: true },
      includes: { 
        type: 'multiselect', 
        label: 'Incluye', 
        col: 4,
        options: ['Seguridad', 'Agua', 'Basura', 'Áreas verdes', 'Gimnasio'],
        opcional: true
      },
      iusi: { 
        type: 'select', 
        label: 'IUSI', 
        col: 4,
        options: ['Trimestral', 'Anual'],
        opcional: true
      },
      dayIusi: { 
        type: 'select', 
        label: 'Pago de IUSI al día', 
        col: 4,
        options: ['Si', 'No'],
        opcional: true
      }
    }
  },
  multimedia: {
    id: 'multimedia',
    titulo: 'Multimedia',
    icono: 'fa-solid fa-images',
    obligatoria: false,
    campos: {
      media: { type: 'multimedia', label: '', col: 12 }
    }
  }
};

// ─── Visibility rules by property type ───────────────────────────────────────
// Returns an object describing which fields/sections to hide for a given type.
// amenidadesFilter: array of allowed amenity keys (whitelist). null = show all.
function getHiddenFields(type) {
  switch (type) {
    case 'Bodega':
      return {
        ubicacion: ['waterRelation', 'view'],
        ambiente: ['bedrooms', 'halfBathrooms', 'serviceRoom', 'deck', 'familyroom'],
        gastos: ['stoveType'],
        amenidadesFilter: [
          'balcn', 'aireacondicionado', 'calentadordeagua', 'cocinaconisla',
          'cerradurasinteligentes', 'businesscentercoworking', 'rooftopterraza',
          'seguridad247cctv', 'parqueodevisitas', 'plantaelctricadeemergencia',
          'lobbyrecepcin', 'readerecepcindedelivery', 'wifienreascomunes',
          'elevadoresdealtavelocidad', 'cargadoresparavehculoselctricos'
        ]
      };
    case 'Oficina':
    case 'Local comercial':
      return {
        ubicacion: ['waterRelation', 'view'],
        dimensiones: ['landV2'],
        ambiente: ['serviceRoom', 'deck', 'study', 'familyroom'],
        gastos: ['stoveType', 'iusi', 'dayIusi'],
        includesHideOptions: ['Áreas verdes', 'Gimnasio'],
        landM2Label: 'Tamaño en mts2',
        amenidadesFilter: [
          'balcn', 'aireacondicionado', 'calentadordeagua', 'cocinaconisla',
          'readelavandera', 'cerradurasinteligentes', 'acabadosdelujo',
          'sistemadesonidointegrado', 'businesscentercoworking', 'seguridad247cctv',
          'parqueodevisitas', 'plantaelctricadeemergencia', 'lobbyrecepcin',
          'readerecepcindedelivery', 'wifienreascomunes', 'elevadoresdealtavelocidad',
          'cargadoresparavehculoselctricos'
        ]
      };
    case 'Edificio':
      return {
        ubicacion: ['waterRelation', 'view'],
        dimensiones: ['landV2'],
        ambiente: ['serviceRoom', 'deck', 'study', 'familyroom'],
        gastos: ['stoveType', 'iusi', 'dayIusi'],
        includesHideOptions: ['Áreas verdes', 'Gimnasio'],
        amenidadesFilter: [
          'balcn', 'aireacondicionado', 'calentadordeagua', 'cocinaconisla',
          'readelavandera', 'cerradurasinteligentes', 'acabadosdelujo',
          'sistemadesonidointegrado', 'businesscentercoworking', 'seguridad247cctv',
          'parqueodevisitas', 'plantaelctricadeemergencia', 'lobbyrecepcin',
          'readerecepcindedelivery', 'wifienreascomunes', 'elevadoresdealtavelocidad',
          'cargadoresparavehculoselctricos'
        ]
      };
    case 'Finca':
    case 'Terreno':
      return {
        ubicacion: ['waterRelation', 'view'],
        dimensiones: ['constructionM2', 'storageM2'],
        estruturas: ['constructionYear', 'remodelYear', 'levels', 'ceilingHeight'],
        ambiente: true, // hide entire section
        gastos: ['stoveType'],
        amenidadesFilter: ['piscinaclimatizada', 'gimnasio',
          'salnsocial', 'businesscente/co-working', 'canchadepdel', 'canchadetenissquash', 'readefogatasfirepits',
          'salndejuegosbillarpingpong', 'juegosinfantilesplayground', 'barlounge', 'ludoteca',
          'parqueparamascotaspetpark', 'estacindelavadoparamascotaspetwash',
          'senderosparacaminar', 'readepiatas', 'seguridad247cctv', 'parqueodevisitas', 'lobbyorecepción', 'areaderecepciondedelivery',
          'plantaelctricadeemergencia', 'pozodeaguapropio', 'wifienreascomunes'
        ]
      };
    default:
      return {};
  }
}

function Add() {
  const navigate = useNavigate();
  
  // Estado para todas las secciones
  const [secciones, setSecciones] = useState(
    Object.keys(SECCIONES).reduce((acc, key) => {
      acc[key] = {
        completada: false,
        datos: Object.keys(SECCIONES[key].campos).reduce((campos, campoKey) => {
          if (campoKey === 'exchangeRate') {
            campos[campoKey] = '7.8'; 
          } else {
            campos[campoKey] = '';
          }
          return campos;
        }, {})
      };
      return acc;
    }, {})
  );

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [alert, setAlert] = useState({ show: false, variant: '', message: '' });

  // Agentes
  const currentUser = getCurrentUser();
  const isAgencia = currentUser?.roles?.includes('agencia');
  const isAdmin = currentUser?.roles?.includes('admin');
  const [agentesOptions, setAgentesOptions] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);

  useEffect(() => {
    if (!isAgencia) return;
    getAgentes().then(result => {
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        const completos = data.filter(a =>
          a.isEnabled !== false &&
          a.name && a.phone &&
          /* a.agentInfo?.proTitle && */
          a.agentInfo?.description &&
          a.agentInfo?.specialization &&
          a.agentInfo?.expe &&
          a.agentInfo?.address &&
          a.agentInfo?.languages?.length > 0
        );
        setAgentesOptions(completos.map(a => ({
          value: a._id,
          label: a.name || a.email,
          avatar: a.avatar ? API_URL + a.avatar.replace('/uploads', '') : null
        })));
      }
    });
  }, []);
  const [activeAccordion, setActiveAccordion] = useState("0");
  const [exchangeRate, setexchangeRate] = useState(false)
  const priceInputRefs = useRef({});

  const handleChange = (seccionId, campo, value) => {
    setSecciones(prev => {
      const newState = { ...prev };
      const newDatos = { ...newState[seccionId].datos, [campo]: value };

      // LÓGICA DE CÁLCULO BIDIRECCIONAL (Solo en la sección de datosPropiedad)
    if (seccionId === 'datosPropiedad') {
      const priceQ = parseFloat(campo === 'price' ? value : newDatos.price);
      const priceUSD = parseFloat(campo === 'priceUSD' ? value : newDatos.priceUSD);
      const priceM2 = parseFloat(campo === 'pricePerM2' ? value : newDatos.pricePerM2);
      const priceM2USD = parseFloat(campo === 'priceM2USD' ? value : newDatos.priceM2USD);
      const tasa = parseFloat(campo === 'exchangeRate' ? value : (newDatos.exchangeRate || 7.8));

      // Si cambias Precio Quetzales o la Tasa -> Calcula Dólares
      if ((campo === 'price' || campo === 'exchangeRate') && !isNaN(priceQ) && !isNaN(tasa) && tasa > 0) {
        newDatos.priceUSD = Math.round(priceQ / tasa);
      } 
      // Si cambias Precio Dólares -> Calcula Quetzales
      else if (campo === 'priceUSD' && !isNaN(priceUSD) && !isNaN(tasa) && tasa > 0) {
        newDatos.price = Math.round(priceUSD * tasa);
      }

      // Cálculo bidireccional para precio por M²
      if ((campo === 'pricePerM2' || campo === 'exchangeRate') && !isNaN(priceM2) && !isNaN(tasa) && tasa > 0) {
        newDatos.priceM2USD = Math.round(priceM2 / tasa);
      } 
      else if (campo === 'priceM2USD' && !isNaN(priceM2USD) && !isNaN(tasa) && tasa > 0) {
        newDatos.pricePerM2 = Math.round(priceM2USD * tasa);
      }

      // VALIDACIÓN DE RANGO DE TASA
      if (campo === 'exchangeRate') {
        const tasaNum = parseFloat(value);
        if (tasaNum > 0 && (tasaNum < 7.50 || tasaNum > 8.05)) {
          setexchangeRate(true);
          newDatos.tasaError = "La tasa parece fuera de rango (Normal: 7.50 - 8.05)";
        } else {
          setexchangeRate(false);
          newDatos.tasaError = null;
        }
      }

      // Actualizar los inputs del DOM directamente (sin perder foco)
      setTimeout(() => {
        if (priceInputRefs.current.price && campo !== 'price') {
          priceInputRefs.current.price.value = formatGTQ(newDatos.price);
        }
        if (priceInputRefs.current.priceUSD && campo !== 'priceUSD') {
          priceInputRefs.current.priceUSD.value = formatUSD(newDatos.priceUSD);
        }
        if (priceInputRefs.current.pricePerM2 && campo !== 'pricePerM2') {
          priceInputRefs.current.pricePerM2.value = formatGTQ(newDatos.pricePerM2);
        }
        if (priceInputRefs.current.priceM2USD && campo !== 'priceM2USD') {
          priceInputRefs.current.priceM2USD.value = formatUSD(newDatos.priceM2USD);
        }
      }, 0);
    }

    newState[seccionId] = {
      ...newState[seccionId],
      datos: newDatos
    };
      
      return newState;
    });
  };

  const validarSeccion = (seccionId) => {
    const seccion = SECCIONES[seccionId];
    const datos = secciones[seccionId].datos;

    // Obtener campos ocultos según el tipo de propiedad seleccionado
    const propertyType = secciones.datosPropiedad?.datos?.type;
    const hiddenFields = getHiddenFields(propertyType);
    const sectionHidden = hiddenFields[seccionId];

    // Si la sección entera está oculta para este tipo de propiedad, es válida automáticamente
    if (sectionHidden === true) return true;

    // Validación especial para multimedia
    if (seccionId === 'multimedia') {
      const multimediaData = datos.media || {};
      //console.log('📊 multimediaData en validación:', multimediaData);
      
      // USAR METADATOS DEL COMPONENTE
      if (multimediaData._metadata) {
        const { total, secundarias, principal } = multimediaData._metadata;
        
        //console.log('🎯 Usando metadatos:', { total, secundarias, principal });
        
        // Si no hay fotos, válido (opcional)
        if (total === 0) return true;
        
        // Debe haber imagen principal
        if (!principal) return false;
        
        // Si hay 1-2 secundarias, inválido
        if (secundarias > 0 && secundarias < 3) return false;
        
        return true;
      }
      
      // Fallback si no hay metadatos
      const fotos = multimediaData.photos || [];
      const principal = fotos.find(f => f.isMain);
      const secundarias = fotos.filter(f => !f.isMain && f.path);
      
      //console.log('🎯 Fallback:', { fotos: fotos.length, principal: !!principal, secundarias: secundarias.length });
      
      // Si no hay fotos, válido
      if (fotos.length === 0) return true;
      
      // Debe haber imagen principal
      if (!principal) return false;
      
      // Si hay 1-2 secundarias, inválido
      if (secundarias.length > 0 && secundarias.length < 3) return false;
      
      return true;
    }
    
    // Para otras secciones...
    if (!seccion.obligatoria && Object.values(datos).every(v => !v)) {
      return true;
    }

    // Validación especial para ubicacion: department, municipality, zone y coordinates son obligatorios
    if (seccionId === 'ubicacion') {
      if (!datos.department || !datos.municipality || !datos.zone || !datos.coordinates) {
        return false;
      }
      return true;
    }
    
    for (const [campoKey, campoConfig] of Object.entries(seccion.campos)) {
      // Saltar campos ocultos según el tipo de propiedad
      if (Array.isArray(sectionHidden) && sectionHidden.includes(campoKey)) continue;

      // Un campo es obligatorio si su label contiene '*' o si opcional es explícitamente false
      const esObligatorio = campoConfig.label?.includes('*') || campoConfig.opcional === false;
      if (esObligatorio) {
        const valor = datos[campoKey];
        // Permitir 0 como valor válido para campos numéricos
        if (valor === undefined || valor === null || valor === '') {
          return false;
        }
      }
    }

    // Caso especial: constructionM2 es obligatorio para Edificio
    if (seccionId === 'dimensiones' && propertyType === 'Edificio') {
      if (!datos.constructionM2) return false;
    }

    // Caso especial: constructionM2 es obligatorio para Bodega
    if (seccionId === 'dimensiones' && propertyType === 'Bodega') {
      if (!datos.constructionM2) return false;
    }

    return true;
  };

  const handleGuardarSeccion = (seccionId, index) => {
    if (!validarSeccion(seccionId)) {
      setAlert({
        show: true,
        variant: 'danger',
        message: `Completa los campos obligatorios de ${SECCIONES[seccionId].titulo}`
      });
      setTimeout(() => setAlert({ show: false, variant: '', message: '' }), 3000);
      return;
    }

    setSecciones(prev => ({
      ...prev,
      [seccionId]: {
        ...prev[seccionId],
        completada: true
      }
    }));

    setActiveAccordion(null);

    setAlert({
      show: true,
      variant: 'success',
      message: 'Sección guardada correctamente'
    });
    setTimeout(() => setAlert({ show: false, variant: '', message: '' }), 2000);
  };

  // Función para construir el objeto final (SIEMPRE JSON)
  const construirDataFinal = () => {

    const boolToSiNo = (val) => {
      if (val === true) return "Si";
      if (val === false) return "No";
      return "";
    };
      
    const currentUser = getCurrentUser();
    
    if (!currentUser || !currentUser._id) {
      throw new Error('No se pudo identificar el usuario');
    }

    const isAdminOrAgencia = Array.isArray(currentUser.roles)
      ? currentUser.roles.includes('admin') || currentUser.roles.includes('agencia')
      : currentUser.roles === 'admin' || currentUser.roles === 'agencia';

    const propiedadData = {
      userId: currentUser._id,
      agents: isAdminOrAgencia ? [] : [currentUser._id]
    };

    // ========== MARKET ==========
    if (secciones.datosPropiedad.completada) {
      propiedadData.market = {
        title: secciones.datosPropiedad.datos.title,
        price: parseFloat(secciones.datosPropiedad.datos.price),
        /* mode: secciones.datosPropiedad.datos.mode === 'Venta' ? 'sale' : secciones.datosPropiedad.datos.mode === 'Renta' ? 'rent' : 'consult', */
        mode: secciones.datosPropiedad.datos.mode,
        type: secciones.datosPropiedad.datos.type
      };
      
      propiedadData.market.description = secciones.datosPropiedad.datos.description
      if (secciones.datosPropiedad.datos.pricePerM2) {
        propiedadData.market.pricePerM2 = parseFloat(secciones.datosPropiedad.datos.pricePerM2);
      }
      if (secciones.datosPropiedad.datos.priceM2USD) {
        propiedadData.market.priceM2USD = parseFloat(secciones.datosPropiedad.datos.priceM2USD);
      }
      if (secciones.datosPropiedad.datos.exchangeRate) {
        propiedadData.market.exchangeRate = parseFloat(secciones.datosPropiedad.datos.exchangeRate);
      }
      if (secciones.datosPropiedad.datos.priceUSD) {
        propiedadData.market.priceUSD = parseFloat(secciones.datosPropiedad.datos.priceUSD);
      }
    }

    // ========== LOCATION ==========
    if (secciones.ubicacion.completada) {
      propiedadData.location = {};
      
      // Campos normales
      if (secciones.ubicacion.datos.gatedCommunity) 
        propiedadData.location.gatedCommunity = secciones.ubicacion.datos.gatedCommunity;
      
      if (secciones.ubicacion.datos.address) 
        propiedadData.location.address = secciones.ubicacion.datos.address;
      
      if (secciones.ubicacion.datos.floor) 
        propiedadData.location.floor = secciones.ubicacion.datos.floor;
      
      if (secciones.ubicacion.datos.waterRelation) 
        propiedadData.location.waterRelation = secciones.ubicacion.datos.waterRelation;
      
      // Selects de ubicación
      if (secciones.ubicacion.datos.department) 
        propiedadData.location.department = secciones.ubicacion.datos.department;
      
      if (secciones.ubicacion.datos.municipality) 
        propiedadData.location.municipality = secciones.ubicacion.datos.municipality;
      
      if (secciones.ubicacion.datos.zone) 
        propiedadData.location.zone = secciones.ubicacion.datos.zone;

      if (secciones.ubicacion.datos.view) 
        propiedadData.location.view = secciones.ubicacion.datos.view;

      if (secciones.ubicacion.datos.streettype) 
        propiedadData.location.streettype = secciones.ubicacion.datos.streettype;

      // Coordenadas
      if (secciones.ubicacion.datos.coordinates) {
        const partes = secciones.ubicacion.datos.coordinates.split(',').map(Number);
        if (partes.length === 2 && !isNaN(partes[0]) && !isNaN(partes[1])) {
          propiedadData.location.coordinates = {
            type: "Point",
            coordinates: [partes[0], partes[1]]
          };
        }
      }
    }

    // ========== DIMENSIONES ==========
    if (secciones.dimensiones.completada) {
      const dims = secciones.dimensiones.datos;
      if (dims.landM2 || dims.landV2 || dims.constructionM2 || dims.storageM2) {
        propiedadData.dimensions = {};
        if (dims.landM2) propiedadData.dimensions.landM2 = parseFloat(dims.landM2);
        if (dims.landV2) propiedadData.dimensions.landV2 = parseFloat(dims.landV2);
        if (dims.constructionM2) propiedadData.dimensions.constructionM2 = parseFloat(dims.constructionM2);
        if (dims.storageM2) propiedadData.dimensions.storageM2 = parseFloat(dims.storageM2);
      }
    }

    // ========== ESTRUCTURAS ==========
    if (secciones.estruturas.completada) {
      const est = secciones.estruturas.datos;
      if (est.constructionYear || est.remodelYear || est.levels || est.ceilingHeight || est.perimeterWall) {
        propiedadData.structure = {};
        if (est.constructionYear) propiedadData.structure.constructionYear = parseFloat(est.constructionYear);
        if (est.remodelYear) propiedadData.structure.remodelYear = parseFloat(est.remodelYear);
        if (est.levels) propiedadData.structure.levels = parseFloat(est.levels);
        if (est.ceilingHeight) propiedadData.structure.ceilingHeight = parseFloat(est.ceilingHeight);
        //if (est.perimeterWall) propiedadData.structure.perimeterWall = est.perimeterWall;
        if (est.perimeterWall) propiedadData.structure.perimeterWall = est.perimeterWall === 'Si'
      }
    }

    // ========== LAYOUT (AMBIENTE) ==========
    if (secciones.ambiente.completada) {
      const amb = secciones.ambiente.datos;
      if (amb.totalRooms !== '' || amb.bedrooms !== '' || amb.bathrooms !== '' || amb.halfBathrooms !== '' || 
          amb.serviceRoom || amb.deck || amb.parkingSpots !== '' || amb.furnished || amb.floors !== '') {
        propiedadData.layout = {};
        if (amb.totalRooms !== '' && amb.totalRooms !== undefined && amb.totalRooms !== null) propiedadData.layout.totalRooms = parseFloat(amb.totalRooms);
        if (amb.bedrooms !== '' && amb.bedrooms !== undefined && amb.bedrooms !== null) propiedadData.layout.bedrooms = parseFloat(amb.bedrooms);
        if (amb.bathrooms !== '' && amb.bathrooms !== undefined && amb.bathrooms !== null) propiedadData.layout.bathrooms = parseFloat(amb.bathrooms);
        if (amb.halfBathrooms !== '' && amb.halfBathrooms !== undefined && amb.halfBathrooms !== null) propiedadData.layout.halfBathrooms = parseFloat(amb.halfBathrooms);
        if (amb.serviceRoom) propiedadData.layout.serviceRoom = amb.serviceRoom;
        if (amb.deck) propiedadData.layout.deck = amb.deck === 'Si'
        if (amb.parkingSpots !== '' && amb.parkingSpots !== undefined && amb.parkingSpots !== null) propiedadData.layout.parkingSpots = parseFloat(amb.parkingSpots);
        if (amb.furnished) propiedadData.layout.furnished = amb.furnished === 'Si'
        if (amb.floors !== '' && amb.floors !== undefined && amb.floors !== null) propiedadData.layout.floors = parseFloat(amb.floors);
        if (amb.study) propiedadData.layout.study = amb.study === 'Si'
        if (amb.laundry) propiedadData.layout.laundry = amb.laundry;
        if (amb.familyroom) propiedadData.layout.familyroom = amb.familyroom;
      }
    }

    // ========== AMENIDADES ==========
    if (secciones.amenidades.completada && secciones.amenidades.datos.amenities) {
      const amenitiesFiltradas = {};
      Object.entries(secciones.amenidades.datos.amenities).forEach(([key, value]) => {
        if (value) amenitiesFiltradas[key] = value;
      });
      if (Object.keys(amenitiesFiltradas).length > 0) {
        propiedadData.amenities = amenitiesFiltradas;
      }
    }

    // ========== GASTOS FIJOS ==========
    if (secciones.gastos.completada) {
      const gast = secciones.gastos.datos;
      if (gast.stoveType || gast.waterService || gast.maintenanceCost || gast.includes || gast.iusi || gast.dayIusi) {
        propiedadData.expenses = {};
        if (gast.stoveType) propiedadData.expenses.stoveType = gast.stoveType;
        if (gast.waterService) propiedadData.expenses.waterService = gast.waterService;
        if (gast.maintenanceCost) propiedadData.expenses.maintenanceCost = parseFloat(gast.maintenanceCost);
        if (gast.includes) {
          // Si ya es un array por el multiselect, se guarda directamente
          propiedadData.expenses.includes = Array.isArray(gast.includes) ? gast.includes : [gast.includes];
        }
        if (gast.iusi) propiedadData.expenses.iusi = { typepay: gast.iusi, atday: gast.dayIusi === 'Si' }
      }
    }

    // ========== MULTIMEDIA ==========
    const multimediaData = secciones.multimedia?.datos?.media || {};
    
    if (multimediaData.photos && multimediaData.photos.length > 0) {
      // Filtrar solo las que tienen path (ya subidas)
      const photosWithPath = multimediaData.photos.filter(p => p && p.path);
      
      if (photosWithPath.length > 0) {
        propiedadData.media = {
          description: "Imagenes de la propiedad",
          photos: photosWithPath.map(p => ({
            path: p.path,
            isMain: p.isMain || false
          })),
          videos: multimediaData.videos || [],
          link360: multimediaData.link360 || ''
        };
      }
    }
    
    // Si no hay fotos pero hay link360, guardar igual el link360
    if (!propiedadData.media && multimediaData.link360) {
      propiedadData.media = {
        description: "Imagenes de la propiedad",
        photos: [],
        videos: [],
        link360: multimediaData.link360
      };
    }

    return propiedadData;
  };

  const handlePublicar = async () => {
    // Validar secciones obligatorias
    if (!secciones.datosPropiedad.completada || !secciones.ubicacion.completada) {
      setAlert({
        show: true,
        variant: 'danger',
        message: 'Debes completar y guardar las secciones "Datos de la propiedad" y "Ubicación" antes de publicar'
      });
      setTimeout(() => setAlert({ show: false, variant: '', message: '' }), 3000);
      return;
    }

    setLoading(true);

    try {
      const propiedadData = construirDataFinal();
      
      //console.log(propiedadData);
      //return false

      const result = await createPropiedad(propiedadData);

      if (result.success) {
        // Asignar agentes si hay seleccionados y el usuario es agencia
        // selectedAgents ya contiene solo agentes activos (filtrados en el useEffect de carga)
        if (isAgencia && selectedAgents.length > 0) {
          await assignAgents(result.data._id, selectedAgents.map(a => a.value));
        }

        setAlert({
          show: true,
          variant: 'success',
          message: isAdmin ? 'Propiedad publicada exitosamente' : 'Enviando a vista previa'
        });
        
        setTimeout(() => {
          navigate(`/cpanel/propiedades/view/${result.data._id}`);
        }, 2000);
      } else {
        throw new Error(result.error || 'Error al publicar la propiedad');
      }
    } catch (error) {
      setAlert({
        show: true,
        variant: 'danger',
        message: error.message
      });
      setTimeout(() => setAlert({ show: false, variant: '', message: '' }), 3000);
    }
    
    setLoading(false);
  };

  const formatGTQ = (val) => {
    const num = String(val).replace(/[^0-9]/g, '');
    if (!num) return '';
    return 'Q ' + num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatUSD = (val) => {
    const num = String(val).replace(/[^0-9]/g, '');
    if (!num) return '';
    return '$ ' + num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const renderCampo = (seccionId, campoKey, campoConfig, hiddenFields) => {
    const value = secciones[seccionId].datos[campoKey] || (campoKey === 'amenities' ? {} : '');
    
    if (campoConfig.type === 'hidden') return null;

    if (campoConfig.type === 'multiselect') {
      // For OFICINA, filter out hidden options from 'includes'
      const filteredOptions = (hiddenFields?.includesHideOptions && campoKey === 'includes')
        ? campoConfig.options.filter(opt => !hiddenFields.includesHideOptions.includes(opt))
        : campoConfig.options;

      // Transformamos las opciones simples ['A', 'B'] en [{label: 'A', value: 'A'}]
      const options = filteredOptions.map(opt => ({ label: opt, value: opt }));
      
      // Transformamos el valor actual (array de strings) al formato de react-select
      const currentValue = Array.isArray(value) 
        ? value.map(v => ({ label: v, value: v })) 
        : [];

      return (
        <Select
          isMulti
          name={campoKey}
          options={options}
          value={currentValue}
          placeholder="Selecciona una o varias..."
          className="basic-multi-select"
          classNamePrefix="select"
          // Al cambiar, guardamos solo el array de strings para tu JSON
          onChange={(selectedOptions) => {
            const values = selectedOptions ? selectedOptions.map(x => x.value) : [];
            handleChange(seccionId, campoKey, values);
          }}
          // Estilos para que combine con Bootstrap
          styles={{
            control: (base) => ({
              ...base,
              borderRadius: '2rem',
              padding: '2px 10px',
              borderColor: '#dee2e6'
            })
          }}
        />
      );
    }

    if (campoConfig.type === 'multimedia') {
      return (
        <SelectorMultimedia 
          value={value}
          onChange={(nuevoValor) => handleChange(seccionId, campoKey, nuevoValor)}
          onUploadStart={() => setUploadingImages(true)}
          onUploadEnd={() => setUploadingImages(false)}
        />
      );
    }

    if (campoConfig.type === 'amenities') {
      return (
        <SelectorAmenidades 
          value={value}
          onChange={(nuevoValor) => handleChange(seccionId, campoKey, nuevoValor)}
          filter={hiddenFields?.amenidadesFilter ?? null}
        />
      );
    }
    
    switch (campoConfig.type) {
      case 'textarea':
        return (
          <MyTextEditor
            value={value}
            onChange={(html) => handleChange(seccionId, campoKey, html)}
          />
        )
      case 'select':
        return (
          <Form.Select 
            value={value}
            onChange={(e) => handleChange(seccionId, campoKey, e.target.value)}
          >
            <option value="">Seleccione...</option>
            {campoConfig.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </Form.Select>
        );
      default:
        if (campoKey === 'price' || campoKey === 'priceUSD' || campoKey === 'pricePerM2' || campoKey === 'priceM2USD') {
          const isGTQ = campoKey === 'price' || campoKey === 'pricePerM2';
          return (
            <Form.Control
              type="text"
              defaultValue={isGTQ ? formatGTQ(value) : formatUSD(value)}
              onKeyUp={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                e.target.value = isGTQ ? formatGTQ(raw) : formatUSD(raw);
                handleChange(seccionId, campoKey, raw);
              }}
              placeholder={isGTQ ? 'Q 0' : '$ 0'}
              key={`${campoKey}-${secciones[seccionId].completada}`}
              ref={el => priceInputRefs.current[campoKey] = el}
            />
          );
        }
        if (campoKey === 'maintenanceCost') {
          return (
            <Form.Control
              type="text"
              defaultValue={value ? formatUSD(value) : ''}
              onKeyUp={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                e.target.value = formatUSD(raw);
                handleChange(seccionId, campoKey, raw);
              }}
              placeholder="$ 0"
              key={`${campoKey}-${secciones[seccionId].completada}`}
            />
          );
        }
        return (
          <Form.Control 
            type={campoConfig.type}
            value={value}
            onChange={(e) => handleChange(seccionId, campoKey, e.target.value)}
            placeholder={campoConfig.opcional ? 'Opcional' : ''}
            {...(campoConfig.type === 'number' && { min: 0 })}
            onWheel={(e) => campoConfig.type === 'number' && e.target.blur()}
          />
        );
    }
  };

  return (
    <Container>
      <div className='fs-1 d-flex justify-content-between align-items-center'>
        Nueva propiedad
        <Link to="/cpanel/propiedades" title='Atrás'><img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" srcSet="" /></Link>
      </div>
      <div className='d-flex flex-column gap-4 mt-5'>
        
        {alert.show && (
          <Alert variant={alert.variant} onClose={() => setAlert({...alert, show: false})} dismissible className='position-fixed bottom-0 end-0 m-3 shadow-sm' style={{ zIndex: '999' }}>
            <div className="d-flex align-items-center gap-2">
              <i className={`fa-solid ${alert.variant === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
              <span>{alert.message}</span>
            </div>

          </Alert>
        )}

        {Object.entries(SECCIONES).map(([seccionId, seccion], index) => {
          const propertyType = secciones.datosPropiedad?.datos?.type;
          const hiddenFields = getHiddenFields(propertyType);

          // Hide entire ambiente section for Terreno
          if (seccionId === 'ambiente' && hiddenFields.ambiente === true) return null;

          return (
          <Accordion 
            key={seccionId} 
            activeKey={activeAccordion === index.toString() ? index.toString() : null} 
            onSelect={(key) => setActiveAccordion(key)}
            className='rounded-4'
          >
            <Accordion.Item eventKey={index.toString()}>
              <Accordion.Header>
                <i className={`${seccion.icono} me-2`}></i>
                <span>{seccion.titulo} {(() => {
                  // Verificar si al menos un campo no oculto es obligatorio para este tipo
                  const sectionHidden = hiddenFields[seccionId];
                  if (sectionHidden === true) return '';
                  const tieneObligatorio = Object.entries(seccion.campos).some(([campoKey, campoConfig]) => {
                    if (Array.isArray(sectionHidden) && sectionHidden.includes(campoKey)) return false;
                    // Para Bodega y Edificio, ambiente no tiene campos obligatorios
                    if ((propertyType === 'Bodega' || propertyType === 'Edificio') && seccionId === 'ambiente') return false;
                    // Casos especiales por tipo de propiedad
                    if (seccionId === 'dimensiones') {
                      if (propertyType === 'Edificio' && campoKey === 'constructionM2') return true;
                      if (propertyType === 'Bodega' && campoKey === 'constructionM2') return true;
                    }
                    return campoConfig.label?.includes('*') || campoConfig.opcional === false;
                  });
                  return tieneObligatorio ? '*' : '';
                })()}</span>
                {secciones[seccionId].completada && (
                  <Badge bg="success" className="ms-2">✓ Completado</Badge>
                )}
              </Accordion.Header>
              <Accordion.Body className='mt-4' style={{ marginBottom: '2rem' }}>
                <Form>
                  <Row className='gx-5 gy-4'>
                    {seccionId === 'ubicacion' && (
                      <SelectoresUbicacion 
                        valores={{
                          department: secciones.ubicacion.datos.department || '',
                          municipality: secciones.ubicacion.datos.municipality || '',
                          zone: secciones.ubicacion.datos.zone || ''
                        }}
                        onChange={(nuevosValores) => {
                          Object.entries(nuevosValores).forEach(([campo, valor]) => {
                            handleChange(seccionId, campo, valor);
                          });
                        }}
                      />
                    )}
                    
                    {Object.entries(seccion.campos).map(([campoKey, campoConfig]) => {
                      if (campoConfig.type === 'hidden' || 
                          campoKey === 'department' || 
                          campoKey === 'municipality' || 
                          campoKey === 'zone') {
                        return null;
                      }

                      // Hide fields based on property type rules
                      const sectionHidden = hiddenFields[seccionId];
                      if (Array.isArray(sectionHidden) && sectionHidden.includes(campoKey)) {
                        return null;
                      }

                      // Mostrar "Piso o nivel" solo cuando el tipo de propiedad es Apartamento
                      if (campoKey === 'floor' && seccionId === 'ubicacion') {
                        const tipoPropiedad = secciones.datosPropiedad?.datos?.type;
                        if (tipoPropiedad !== 'Apartamento') return null;
                      }
                      
                      if (campoKey === 'coordinates' && seccionId === 'ubicacion') {
                        return (
                          <Col key={campoKey} md={6}>
                            <Form.Group>
                              <Form.Label>{campoConfig.label}</Form.Label>
                              <SelectorMapaDropdown 
                                value={secciones.ubicacion.datos.coordinates || ''}
                                onChange={(valor) => handleChange('ubicacion', 'coordinates', valor)}
                                //placeholder="Haz clic para seleccionar ubicación en el mapa"
                              />
                            </Form.Group>
                          </Col>
                        );
                      }

                      // Dynamic label overrides
                      let fieldLabel = campoConfig.label;
                      if (campoKey === 'bedrooms' && seccionId === 'ambiente' && (secciones.datosPropiedad?.datos?.type === 'Oficina' || secciones.datosPropiedad?.datos?.type === 'Local comercial')) {
                        fieldLabel = 'Espacios *';
                      }
                      if (campoKey === 'totalRooms' && seccionId === 'ambiente') {
                        const tipoPropiedad = secciones.datosPropiedad?.datos?.type;
                        if (tipoPropiedad === 'Apartamento' || tipoPropiedad === 'Edificio' || tipoPropiedad === 'Casa' || tipoPropiedad === 'Finca') {
                          fieldLabel = 'Total de habitaciones *';
                        }
                      }
                      if (campoKey === 'landM2' && hiddenFields.landM2Label) {
                        fieldLabel = hiddenFields.landM2Label;
                      }
                      if (campoKey === 'constructionM2' && seccionId === 'dimensiones' && propertyType === 'Edificio') {
                        fieldLabel = 'Área de construcción (m²) *';
                      }
                      if (campoKey === 'constructionM2' && seccionId === 'dimensiones' && propertyType === 'Bodega') {
                        fieldLabel = 'Área de construcción (m²) *';
                      }
                      // Para Bodega y Edificio, ambiente no tiene campos obligatorios
                      if ((propertyType === 'Bodega' || propertyType === 'Edificio') && seccionId === 'ambiente') {
                        fieldLabel = fieldLabel.replace(' *', '');
                      }
                      
                      // Para amenidades, multimedia y campos con col=12, mantener el ancho completo original
                      const isFullWidthSection = seccionId === 'amenidades' || seccionId === 'multimedia' || campoConfig.col === 12;
                      
                      return (
                        <Col key={campoKey} xl={campoConfig.col} lg={isFullWidthSection ? campoConfig.col : 6} md={isFullWidthSection ? campoConfig.col : 6}>
                          <Form.Group>
                            <Form.Label>{fieldLabel}</Form.Label>
                            {renderCampo(seccionId, campoKey, campoConfig, hiddenFields)}

                            {/* MOSTRAR ERROR DE TASA SI EXISTE */}
                            {campoKey === 'exchangeRate' && secciones.datosPropiedad.datos.tasaError && (
                              <Form.Text className="text-danger fw-bold" style={{ whiteSpace: 'nowrap' }}>
                                <i className="fa-solid fa-triangle-exclamation me-1"></i>
                                {secciones.datosPropiedad.datos.tasaError}
                              </Form.Text>
                            )}
                          </Form.Group>
                        </Col>
                      );
                    })}
                    
                    <Col xs={12} className='d-flex justify-content-end'>
                      {!secciones[seccionId].completada ? (
                        <Button 
                          className='bg-dark rounded-5 border-0 px-4'
                          onClick={() => handleGuardarSeccion(seccionId, index)}
                          disabled={!validarSeccion(seccionId)}
                        >
                          Guardar y continuar
                        </Button>
                      ) : (
                        <Badge bg="success" className="p-3 fs-6">
                          <i className="fa-solid fa-check-circle me-2"></i>
                          Sección completada
                        </Badge>
                      )}
                    </Col>
                  </Row>
                </Form>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
          );
        })}

        {isAgencia && agentesOptions.length > 0 && (
          <div className="mt-4 mb-4 p-4 border rounded-3">

            <div className="fs-5 fw-semibold mb-3">
              <i className="fa-solid fa-user-tie me-2"></i>Asignar agentes
            </div>
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
                  <span>{opt.label}</span>
                </div>
              )}
            />
          </div>
        )}

        <div className="d-flex justify-content-end align-items-center gap-3">
          <Button variant="dark" className='rounded-5 px-3 px-lg-5' onClick={() => navigate('/cpanel/propiedades')}>
            Cancelar
          </Button>
          <Button 
            className='rounded-5 px-3 px-lg-5'
            variant="dark" 
            disabled={!secciones.datosPropiedad.completada || !secciones.ubicacion.completada || loading || exchangeRate}
            onClick={handlePublicar}
          >
            {loading ? 'Subiendo...' : 'Subir'}
          </Button>
        </div>
      </div>
    </Container>
  );
}

export default Add;