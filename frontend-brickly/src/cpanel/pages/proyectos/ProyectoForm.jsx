import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Accordion, Row, Col, Form, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import SelectoresUbicacion from '../../components/SelectoresUbicacion';
import SelectorMapaDropdown from '../../components/SelectorMapaDropdown';
import SelectorAmenidades from '../../components/SelectorAmenidades';
import MyTextEditor from '../../components/ckeditor';
import SelectorGaleriaProyectos from '../../components/SelectorGaleriaProyectos';
import ModelosProyecto, { modelosValidos } from './ModelosProyecto';
import {
  createProyecto,
  updateProyecto,
  uploadProyectosDirect,
  uploadModeloFotos,
  getProyectoById,
} from '../../services/proyectos';
import { getCurrentUser } from '../../../services/authService';
import { getLogoUrl } from '../../../services/logoService';

// Definición de secciones con sus campos
const SECCIONES = {
  datosProyecto: {
    id: 'datosProyecto',
    titulo: 'Datos del proyecto',
    icono: 'fa-solid fa-building',
    obligatoria: true,
    campos: {
      title: { type: 'text', label: 'Nombre del proyecto *', col: 6 },
      type: {
        type: 'select',
        label: 'Tipo de proyecto *',
        col: 2,
        options: ['Casa', 'Apartamento', 'Condominio', 'Edificio', 'Residencial', 'Comercial']
      },
      mode: {
        type: 'select',
        label: 'Modalidad *',
        col: 2,
        options: ['Venta', 'Alquiler']
      },
      priceFromQ: { type: 'priceQ', label: 'Precio desde (Q) *', col: 3 },
      rate: { type: 'number', label: 'Tasa dólar *', col: 2 },
      priceFromUSD: { type: 'priceUSD', label: 'Precio desde ($) *', col: 3 },
      description: { type: 'textarea', label: 'Descripción del proyecto *', col: 12, opcional: false }
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
      streettype: { type: 'select', label: 'Tipo de calle', col: 3, options: ['Asfaltada', 'Adoquinada', 'De tierra', 'Calle privada (Condominio)'], opcional: true }
    }
  },
  areas: {
    id: 'areas',
    titulo: 'Áreas y dimensiones',
    icono: 'fa-solid fa-chart-area',
    obligatoria: false,
    campos: {
      terrenoM2: { type: 'number', label: 'Área de terreno (m²)', col: 4, opcional: true },
      terrenoV2: { type: 'number', label: 'Área de terreno (v²)', col: 4, opcional: true },
      construccionM2: { type: 'number', label: 'Área de construcción (m²)', col: 4, opcional: true },
      numeroPisos: { type: 'number', label: 'Número de pisos', col: 4, opcional: true }
    }
  },
  estructura: {
    id: 'estructura',
    titulo: 'Estructura',
    icono: 'fa-solid fa-trowel-bricks',
    obligatoria: false,
    campos: {
      anioConstruccion: { type: 'number', label: 'Año de construcción', col: 4, opcional: true },
      niveles: { type: 'number', label: 'Niveles del edificio', col: 4, opcional: true },
      muroPerimetral: {
        type: 'select',
        label: 'Muro perimetral',
        col: 4,
        options: ['Si', 'No'],
        opcional: true
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
  modelos: {
    id: 'modelos',
    titulo: 'Modelos',
    icono: 'fa-solid fa-cubes',
    obligatoria: false,
    campos: {}
  },
  multimedia: {
    id: 'multimedia',
    titulo: 'Imágenes y tour 360',
    icono: 'fa-solid fa-images',
    obligatoria: false,
    campos: {}
  }
};

function ProyectoForm({ projectId }) {
  const navigate = useNavigate();
  const isEdit = !!projectId;
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.roles?.includes('admin');
  const currentYear = new Date().getFullYear();

  // Estado para todas las secciones
  const [secciones, setSecciones] = useState(
    Object.keys(SECCIONES).reduce((acc, key) => {
      acc[key] = {
        completada: false,
        datos: Object.keys(SECCIONES[key].campos).reduce((campos, campoKey) => {
          campos[campoKey] = campoKey === 'rate' ? '7.8' : '';
          return campos;
        }, {})
      };
      return acc;
    }, {})
  );

  const [activeAccordion, setActiveAccordion] = useState("0");
  const [loading, setLoading] = useState(false);
  const [loadingShow, setLoadingShow] = useState(isEdit);
  const [alert, setAlert] = useState({ show: false, variant: '', message: '' });
  const [originalStatus, setOriginalStatus] = useState(null);

  // Estados de imágenes principales
  const [desktopImage, setDesktopImage] = useState(null);
  const [mobileImage, setMobileImage] = useState(null);
  const desktopInputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const [desktopDragOver, setDesktopDragOver] = useState(false);
  const [mobileDragOver, setMobileDragOver] = useState(false);

  // tour 360
  const [tour360, setTour360] = useState('');

  // refs para precios formateados
  const priceInputRefs = useRef({});

  const [galeria, setGaleria] = useState([]);
  const [modelos, setModelos] = useState([]);

  // Cargar datos existentes en modo edición
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      const result = await getProyectoById(projectId);
      if (result.success) {
        const data = result.data;
        setOriginalStatus(data.status);

        setTour360(data.tour360 || '');

        const formattedImages = (data.images || []).map(img => {
          const path = typeof img === 'string' ? img : (img?.path || img?.url || img?.src || '');
          return {
            id: `gal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            _localId: true,
            path: path,
            preview: path ? getLogoUrl(path) : null,
            file: null,
            uploading: false
          };
        });
        setGaleria(formattedImages);

        const modelosCargados = (data.models || []).map((m, idx) => ({
          uid: `model-loaded-${idx}`,
          tipo: m.tipo || 'Apartamento',
          nombre: m.nombre || '',
          precioDesdeQ: m.precioDesdeQ ?? '',
          tasa: m.tasa ?? '',
          precioDesdeUSD: m.precioDesdeUSD ?? '',
          descripcion: m.descripcion || '',
          areas: {
            areaConstruccionM2: m.areas?.areaConstruccionM2 ?? '',
            espacioAlmacenamiento: m.areas?.espacioAlmacenamiento ?? ''
          },
          estructura: { alturaCielo: m.estructura?.alturaCielo ?? '' },
          distribucion: {
            totalAmbientes: m.distribucion?.totalAmbientes ?? '',
            dormitorios: m.distribucion?.dormitorios ?? '',
            banosCompletos: m.distribucion?.banosCompletos ?? '',
            mediosBanos: m.distribucion?.mediosBanos ?? '',
            habitacionServicio: m.distribucion?.habitacionServicio ?? '',
            pergolaDeck: m.distribucion?.pergolaDeck ?? '',
            parqueo: m.distribucion?.parqueo ?? '',
            amueblado: m.distribucion?.amueblado ?? '',
            areaLavanderia: m.distribucion?.areaLavanderia ?? '',
            estudioOficina: m.distribucion?.estudioOficina ?? '',
            salaFamiliar: m.distribucion?.salaFamiliar ?? '',
            oficina: m.distribucion?.oficina ?? '',
            areaDescarga: m.distribucion?.areaDescarga ?? '',
            helipuerto: m.distribucion?.helipuerto ?? '',
            mezzanine: m.distribucion?.mezzanine ?? '',
          },
          gastosFijos: {
            tipoEstufa: m.gastosFijos?.tipoEstufa ?? '',
            servicioAgua: m.gastosFijos?.servicioAgua ?? '',
            mantenimientoUSD: m.gastosFijos?.mantenimientoUSD ?? '',
            mantenimientoQ: m.gastosFijos?.mantenimientoQ ?? '',
          },
          incluye: { iusi: m.incluye?.iusi ?? '' },
          fotos: (m.fotos || []).map(p => {
            const path = typeof p === 'string' ? p : (p?.path || '');
            return {
              file: null,
              path,
              preview: path ? getLogoUrl(path) : null,
              uploading: false
            };
          }),
          tour360: m.tour360 || ''
        }));
        setModelos(modelosCargados);

        if (data.mainImage) {
          setDesktopImage({ preview: getLogoUrl(data.mainImage), path: data.mainImage, uploading: false });
        }
        if (data.mainImageAlter) {
          setMobileImage({ preview: getLogoUrl(data.mainImageAlter), path: data.mainImageAlter, uploading: false });
        }

        setSecciones(prev => {
          const next = { ...prev };

          const llenarSeccion = (seccionId, origen) => {
            if (!origen) return;
            next[seccionId] = {
              completada: true,
              datos: Object.keys(SECCIONES[seccionId].campos).reduce((campos, campoKey) => {
                if (origen[campoKey] !== undefined && origen[campoKey] !== null) {
                  campos[campoKey] = String(origen[campoKey]);
                } else {
                  campos[campoKey] = '';
                }
                return campos;
              }, {})
            };
          };

          if (data.type || data.mode || data.priceFromQ || data.priceFromUSD || data.rate || data.title || data.description) {
            next.datosProyecto = {
              completada: true,
              datos: {
                title: data.title || '',
                type: data.type || '',
                mode: data.mode || '',
                priceFromQ: data.priceFromQ ?? '',
                rate: data.rate ?? '7.8',
                priceFromUSD: data.priceFromUSD ?? '',
                description: data.description || ''
              }
            };
          }

          const loc = data.location || {};
          next.ubicacion = {
            completada: true,
            datos: {
              gatedCommunity: loc.gatedCommunity || '',
              address: loc.address || '',
              coordinates: loc.coordinates
                ? (Array.isArray(loc.coordinates.coordinates)
                    ? loc.coordinates.coordinates.join(',')
                    : (loc.coordinates.gps || ''))
                : (loc.gps || ''),
              waterRelation: loc.waterRelation || '',
              department: loc.department || '',
              municipality: loc.municipality || '',
              zone: loc.zone || '',
              view: loc.view || '',
              streettype: loc.streettype || ''
            }
          };

          llenarSeccion('areas', data.areas);
          llenarSeccion('estructura', data.estructura);

          next.amenidades = {
            completada: true,
            datos: {
              amenities: data.amenities || {}
            }
          };

          return next;
        });
      } else {
        setAlert({ show: true, variant: 'danger', message: result.error || 'Error al cargar proyecto.' });
      }
      setLoadingShow(false);
    };
    load();
  }, [isEdit, projectId]);

  const handleChange = (seccionId, campo, value) => {
    setSecciones(prev => {
      const newState = { ...prev };
      const newDatos = { ...newState[seccionId].datos, [campo]: value };

      // Cálculo bidireccional de precios en la sección de datos
      if (seccionId === 'datosProyecto') {
        const priceQ = parseFloat(campo === 'priceFromQ' ? value : newDatos.priceFromQ);
        const priceUSD = parseFloat(campo === 'priceFromUSD' ? value : newDatos.priceFromUSD);
        const tasa = parseFloat(campo === 'rate' ? value : (newDatos.rate || 7.8));

        if ((campo === 'priceFromQ' || campo === 'rate') && !isNaN(priceQ) && !isNaN(tasa) && tasa > 0) {
          newDatos.priceFromUSD = Math.round(priceQ / tasa);
        } else if (campo === 'priceFromUSD' && !isNaN(priceUSD) && !isNaN(tasa) && tasa > 0) {
          newDatos.priceFromQ = Math.round(priceUSD * tasa);
        }

        setTimeout(() => {
          if (priceInputRefs.current.priceFromQ && campo !== 'priceFromQ') {
            priceInputRefs.current.priceFromQ.value = formatGTQ(newDatos.priceFromQ);
          }
          if (priceInputRefs.current.priceFromUSD && campo !== 'priceFromUSD') {
            priceInputRefs.current.priceFromUSD.value = formatUSD(newDatos.priceFromUSD);
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

    if (seccionId === 'multimedia') {
      return true;
    }

    if (seccionId === 'modelos') {
      return modelosValidos(modelos);
    }

    if (!seccion.obligatoria && Object.values(datos).every(v => !v)) {
      return true;
    }

    if (seccionId === 'ubicacion') {
      return !!(datos.department && datos.municipality && datos.zone && datos.coordinates);
    }

    for (const [campoKey, campoConfig] of Object.entries(seccion.campos)) {
      if (campoConfig.type === 'hidden') continue;
      const esObligatorio = campoConfig.label?.includes('*') || campoConfig.opcional === false;
      if (esObligatorio) {
        const valor = datos[campoKey];
        if (valor === undefined || valor === null || valor === '') {
          return false;
        }
      }
    }

    return true;
  };

  const handleGuardarSeccion = (seccionId) => {
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

  const renderCampo = (seccionId, campoKey, campoConfig) => {
    const value = secciones[seccionId].datos[campoKey] || (campoKey === 'amenities' ? {} : '');

    if (campoConfig.type === 'hidden') return null;

    if (campoConfig.type === 'multimedia') return null;

    if (campoConfig.type === 'amenities') {
      return (
        <SelectorAmenidades
          value={value}
          onChange={(nuevoValor) => handleChange(seccionId, campoKey, nuevoValor)}
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
        );
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
      case 'priceQ':
      case 'priceUSD':
        {
          const isGTQ = campoKey === 'priceFromQ';
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
      default:
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

  const processFile = useCallback((file, type) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    const imageData = { file, preview, path: null, uploading: true };

    if (type === 'desktop') setDesktopImage(imageData);
    else setMobileImage(imageData);
  }, []);

  const handleImageSelect = (e, type) => {
    const file = e.target.files?.[0];
    processFile(file, type);
    e.target.value = '';
  };

  const handleImageDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'desktop') setDesktopDragOver(false);
    else setMobileDragOver(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file, type);
  };

  const handleDragOver = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'desktop') setDesktopDragOver(true);
    else setMobileDragOver(true);
  };

  const handleDragLeave = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'desktop') setDesktopDragOver(false);
    else setMobileDragOver(false);
  };

  const handleRemoveImage = (type) => {
    if (type === 'desktop') {
      if (desktopImage?.preview?.startsWith('blob:')) URL.revokeObjectURL(desktopImage.preview);
      setDesktopImage(null);
    } else {
      if (mobileImage?.preview?.startsWith('blob:')) URL.revokeObjectURL(mobileImage.preview);
      setMobileImage(null);
    }
  };

  const construirDataFinal = () => {
    const datos = secciones.datosProyecto.datos;
    const loc = secciones.ubicacion.datos;
    const areas = secciones.areas.datos;
    const est = secciones.estructura.datos;

    const data = {
      title: datos.title,
      type: datos.type,
      mode: datos.mode,
      priceFromQ: datos.priceFromQ ? parseFloat(datos.priceFromQ) : undefined,
      rate: datos.rate ? parseFloat(datos.rate) : undefined,
      priceFromUSD: datos.priceFromUSD ? parseFloat(datos.priceFromUSD) : undefined,
      description: datos.description,
      tour360: tour360 || ''
    };

    if (secciones.ubicacion.completada) {
      data.location = {};
      if (loc.gatedCommunity) data.location.gatedCommunity = loc.gatedCommunity;
      if (loc.address) data.location.address = loc.address;
      if (loc.department) data.location.department = loc.department;
      if (loc.municipality) data.location.municipality = loc.municipality;
      if (loc.zone) data.location.zone = loc.zone;
      if (loc.waterRelation) data.location.waterRelation = loc.waterRelation;
      if (loc.view) data.location.view = loc.view;
      if (loc.streettype) data.location.streettype = loc.streettype;
      if (loc.coordinates) {
        const partes = loc.coordinates.split(',').map(Number);
        if (partes.length === 2 && !isNaN(partes[0]) && !isNaN(partes[1])) {
          data.location.coordinates = {
            type: 'Point',
            coordinates: [partes[0], partes[1]]
          };
        }
      }
    }

    if (secciones.areas.completada && (areas.terrenoM2 || areas.terrenoV2 || areas.construccionM2 || areas.numeroPisos)) {
      data.areas = {};
      if (areas.terrenoM2) data.areas.terrenoM2 = parseFloat(areas.terrenoM2);
      if (areas.terrenoV2) data.areas.terrenoV2 = parseFloat(areas.terrenoV2);
      if (areas.construccionM2) data.areas.construccionM2 = parseFloat(areas.construccionM2);
      if (areas.numeroPisos) data.areas.numeroPisos = parseFloat(areas.numeroPisos);
    }

    if (secciones.estructura.completada && (est.anioConstruccion || est.niveles || est.muroPerimetral)) {
      data.estructura = {};
      if (est.anioConstruccion) data.estructura.anioConstruccion = parseFloat(est.anioConstruccion);
      if (est.niveles) data.estructura.niveles = parseFloat(est.niveles);
      if (est.muroPerimetral) data.estructura.muroPerimetral = est.muroPerimetral === 'Si';
    }

    if (secciones.amenidades.completada && secciones.amenidades.datos.amenities) {
      const amenitiesFiltradas = {};
      Object.entries(secciones.amenidades.datos.amenities).forEach(([key, value]) => {
        if (value) amenitiesFiltradas[key] = value;
      });
      if (Object.keys(amenitiesFiltradas).length > 0) {
        data.amenities = amenitiesFiltradas;
      }
    }

    return data;
  };

  const extraerImagenes = () => {
    const galleryFiles = (galeria || [])
      .map(img => img.file)
      .filter(Boolean);

    const pathsViejos = (galeria || [])
      .filter(img => !img?.file && img?.path)
      .map(img => img.path);

    return { galleryFiles, pathsViejos };
  };

  const subirFotosModelos = async (userId, projectId) => {
    const modelosPayload = [];

    for (const m of modelos) {
      const pathsExistentes = (m.fotos || [])
        .filter(f => !f.file && f.path)
        .map(f => f.path);
      const filesNuevas = (m.fotos || [])
        .filter(f => f.file)
        .map(f => f.file);

      let fotosFinales = pathsExistentes;
      if (filesNuevas.length > 0) {
        const up = await uploadModeloFotos({ userId, projectId, modelId: m.uid, files: filesNuevas });
        if (!up.success) {
          throw new Error(up.error || 'Error al subir fotos de un modelo');
        }
        fotosFinales = [...pathsExistentes, ...up.paths];
      }

      modelosPayload.push({
        tipo: m.tipo,
        nombre: m.nombre,
        precioDesdeQ: m.precioDesdeQ ? parseFloat(m.precioDesdeQ) : undefined,
        tasa: m.tasa ? parseFloat(m.tasa) : undefined,
        precioDesdeUSD: m.precioDesdeUSD ? parseFloat(m.precioDesdeUSD) : undefined,
        descripcion: m.descripcion,
        areas: {
          areaConstruccionM2: m.areas?.areaConstruccionM2 ?? undefined,
          espacioAlmacenamiento: m.areas?.espacioAlmacenamiento ?? undefined
        },
        estructura: {
          alturaCielo: m.estructura?.alturaCielo ?? undefined
        },
        distribucion: m.distribucion || {},
        gastosFijos: m.gastosFijos || {},
        incluye: m.incluye || {},
        fotos: fotosFinales,
        tour360: m.tour360 || ''
      });
    }

    return modelosPayload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert({ show: false, variant: '', message: '' });

    try {
      const userId = currentUser?._id || currentUser?.id || currentUser?.sub || 'unknown';
      const data = construirDataFinal();
      const { galleryFiles, pathsViejos } = extraerImagenes();

      if (!isEdit) {
        // PASO 1: Crear el proyecto primero (sin imágenes) para obtener el ID
        const tempProjectData = {
          ...data,
          date_project: new Date(`${currentYear}-00-00`),
          status: isAdmin ? 'published' : 'draft',
          mainImage: '',
          mainImageAlter: '',
          images: []
        };

        const createResult = await createProyecto(tempProjectData);
        if (!createResult.success) {
          throw new Error(createResult.error || 'Error al crear el proyecto');
        }

        const newId = createResult.data?._id || createResult.data?.id;

        // PASO 2: Subir imágenes con el projectId
        const hasNewDesktop = desktopImage?.file != null;
        const hasNewMobile = mobileImage?.file != null;

        let finalMainImage = '';
        let finalMobileImage = '';
        let finalImages = [];

        if (hasNewDesktop || hasNewMobile || galleryFiles.length > 0) {
          const uploadResult = await uploadProyectosDirect({
            userId,
            projectId: newId,
            desktopFile: hasNewDesktop ? desktopImage.file : null,
            mobileFile: hasNewMobile ? mobileImage.file : null,
            galleryFiles
          });

          if (!uploadResult.success) {
            try {
              const { deleteProyecto } = await import('../../services/proyectos');
              await deleteProyecto(newId);
            } catch (cleanupErr) {
              console.warn('No se pudo limpiar el proyecto tras error de imágenes:', cleanupErr);
            }
            throw new Error(uploadResult.error || 'Error al subir imágenes');
          }

          const movedFiles = uploadResult.data.files;
          finalMainImage = movedFiles.mainImage || '';
          finalMobileImage = movedFiles.mobileImage || '';
          finalImages = movedFiles.images || [];
        }

        // PASO 3: Fotos de modelos y payload final
        const modelosPayload = await subirFotosModelos(userId, newId);

        await updateProyecto(newId, {
          mainImage: finalMainImage,
          mainImageAlter: finalMobileImage,
          images: finalImages,
          models: modelosPayload
        });

        setAlert({ show: true, variant: 'success', message: isAdmin ? 'Proyecto publicado exitosamente' : 'Proyecto creado exitosamente' });
        setTimeout(() => navigate(`/cpanel/proyectos/view/${newId}`), 1500);
      } else {
        // MODO EDICIÓN
        const hasNewDesktop = desktopImage?.file != null;
        const hasNewMobile = mobileImage?.file != null;

        let finalMainImage = desktopImage?.path || '';
        let finalMobileImage = mobileImage?.path || '';
        let finalImages = pathsViejos;

        if (hasNewDesktop || hasNewMobile || galleryFiles.length > 0) {
          const uploadResult = await uploadProyectosDirect({
            userId,
            projectId,
            desktopFile: hasNewDesktop ? desktopImage.file : null,
            mobileFile: hasNewMobile ? mobileImage.file : null,
            galleryFiles
          });

          if (!uploadResult.success) {
            throw new Error(uploadResult.error || 'Error al subir imágenes');
          }

          const movedFiles = uploadResult.data.files;
          if (hasNewDesktop && movedFiles.mainImage) finalMainImage = movedFiles.mainImage;
          if (hasNewMobile && movedFiles.mobileImage) finalMobileImage = movedFiles.mobileImage;
          if (galleryFiles.length > 0 && movedFiles.images) {
            finalImages = [...pathsViejos, ...movedFiles.images];
          }
        }

        // Fotos de modelos
        const modelosPayload = await subirFotosModelos(userId, projectId);

        const projectData = {
          ...data,
          mainImage: finalMainImage,
          mainImageAlter: finalMobileImage,
          images: finalImages,
          models: modelosPayload
        };

        // Si estaba publicado y no es admin, requerir aprobación nuevamente
        if (originalStatus === 'published' && !isAdmin) {
          projectData.status = 'pre-published';
        }

        const updateResult = await updateProyecto(projectId, projectData);
        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Error al actualizar el proyecto');
        }

        setAlert({ show: true, variant: 'success', message: 'Proyecto actualizado exitosamente' });
        setTimeout(() => navigate(`/cpanel/proyectos/view/${projectId}`), 1500);
      }
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      setAlert({ show: true, variant: 'danger', message: `Error: ${error.message}` });
      setTimeout(() => setAlert({ show: false, variant: '', message: '' }), 5000);
    } finally {
      setLoading(false);
    }
  };

  const renderImagenPrincipal = (type) => {
    const isDesktop = type === 'desktop';
    const img = isDesktop ? desktopImage : mobileImage;
    const dragOver = isDesktop ? desktopDragOver : mobileDragOver;
    const inputRef = isDesktop ? desktopInputRef : mobileInputRef;

    return (
      <div
        className={`border-2 rounded-4 d-flex flex-column align-items-center justify-content-center position-relative overflow-hidden ${img ? 'p-0' : 'p-5'}`}
        style={{
          minHeight: '220px',
          maxWidth: isDesktop ? '100%' : '400px',
          cursor: img?.uploading ? 'wait' : (!img ? 'pointer' : 'default'),
          borderStyle: 'dashed',
          borderColor: dragOver ? '#0d6efd' : '#adb5bd',
          backgroundColor: dragOver ? 'rgba(13, 110, 253, 0.05)' : (img ? '#000' : '#f8f9fa'),
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onClick={() => !img?.uploading && !img && inputRef.current?.click()}
        onDragOver={(e) => !img?.uploading && !img && handleDragOver(e, type)}
        onDragLeave={(e) => !img?.uploading && !img && handleDragLeave(e, type)}
        onDrop={(e) => !img?.uploading && !img && handleImageDrop(e, type)}
      >
        {img ? (
          <>
            <img
              src={img.preview}
              alt={`Vista previa ${isDesktop ? 'escritorio' : 'móvil'}`}
              style={{ width: '100%', height: '260px', objectFit: 'cover' }}
            />
            {img.uploading && (
              <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white bg-opacity-75">
                <Spinner animation="border" variant="primary" className="mb-2" />
                <span className="text-primary fw-bold">Subiendo...</span>
              </div>
            )}
            {!img.uploading && (
              <button
                type="button"
                className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '32px', height: '32px', zIndex: 10 }}
                onClick={(e) => { e.stopPropagation(); handleRemoveImage(type); }}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            )}
          </>
        ) : (
          <>
            <i className={`${isDesktop ? 'fa-solid fa-desktop' : 'fa-solid fa-mobile-screen-button'} fs-1 mb-3 ${dragOver ? 'text-primary' : 'text-secondary'}`}></i>
            <h6 className="text-dark text-center mb-1">{isDesktop ? 'Haz clic o arrastra una imagen panorámica' : 'Haz clic o arrastra una imagen cuadrada'}</h6>
            <p className="text-muted text-center small mb-0">{isDesktop ? 'Recomendado: 1200x600px o similar' : 'Recomendado: 600x600px o similar'}</p>
          </>
        )}
        <input
          type="file"
          ref={inputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleImageSelect(e, type)}
          disabled={img?.uploading}
        />
      </div>
    );
  };

  if (loadingShow) return (
    <Container className="text-center py-5">
      <div className="spinner-border text-primary" />
    </Container>
  );

  return (
    <Container>
      <div className='fs-1 d-flex justify-content-between align-items-center'>
        {isEdit ? 'Editar proyecto' : 'Nuevo proyecto'}
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/cpanel/proyectos'); }} title='Atrás'>
          <i className="fa-solid fa-arrow-left" style={{ fontSize: 'clamp(24px, 4vw, 34px)' }}></i>
        </a>
      </div>
      <div className='d-flex flex-column gap-4 mt-5'>

        {alert.show && (
          <Alert variant={alert.variant} onClose={() => setAlert({ ...alert, show: false })} dismissible className='position-fixed bottom-0 end-0 m-3 shadow-sm' style={{ zIndex: '999' }}>
            <div className="d-flex align-items-center gap-2">
              <i className={`fa-solid ${alert.variant === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
              <span>{alert.message}</span>
            </div>
          </Alert>
        )}

        {Object.entries(SECCIONES).map(([seccionId, seccion], index) => (
          <Accordion
            key={seccionId}
            activeKey={activeAccordion === index.toString() ? index.toString() : null}
            onSelect={(key) => setActiveAccordion(key)}
            className='rounded-4'
          >
            <Accordion.Item eventKey={index.toString()}>
              <Accordion.Header>
                <i className={`${seccion.icono} me-2`}></i>
                <span>
                  {seccion.titulo}
                  {(() => {
                    const tieneObligatorio = Object.entries(seccion.campos).some(([campoKey, campoConfig]) => {
                      return campoConfig.label?.includes('*') || campoConfig.opcional === false;
                    });
                    return tieneObligatorio ? ' *' : '';
                  })()}
                </span>
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

                      if (campoKey === 'coordinates' && seccionId === 'ubicacion') {
                        return (
                          <Col key={campoKey} md={6}>
                            <Form.Group>
                              <Form.Label>{campoConfig.label}</Form.Label>
                              <SelectorMapaDropdown
                                value={secciones.ubicacion.datos.coordinates || ''}
                                onChange={(valor) => handleChange('ubicacion', 'coordinates', valor)}
                              />
                            </Form.Group>
                          </Col>
                        );
                      }

                      return (
                        <Col key={campoKey} xl={campoConfig.col} lg={campoConfig.col === 12 ? 12 : 6} md={campoConfig.col === 12 ? 12 : 6}>
                          <Form.Group>
                            <Form.Label>{campoConfig.label}</Form.Label>
                            {renderCampo(seccionId, campoKey, campoConfig)}
                          </Form.Group>
                        </Col>
                      );
                    })}

                    {seccionId === 'modelos' && (
                      <Col xs={12}>
                        <ModelosProyecto value={modelos} onChange={setModelos} />
                      </Col>
                    )}

                    {seccionId === 'multimedia' && (
                      <>
                        <Col xs={12}>
                          <Form.Group>
                            <Form.Label className="fw-bold fs-5 mb-3">Imagen principal - Escritorio (panorámica)</Form.Label>
                            {renderImagenPrincipal('desktop')}
                          </Form.Group>
                        </Col>
                        <Col xs={12}>
                          <Form.Group>
                            <Form.Label className="fw-bold fs-5 mb-3">Imagen principal - Móvil (cuadrada)</Form.Label>
                            {renderImagenPrincipal('mobile')}
                          </Form.Group>
                        </Col>
                        <Col xs={12}>
                          <SelectorGaleriaProyectos
                            value={galeria}
                            onChange={setGaleria}
                          />
                        </Col>
                        <Col xs={12} md={6}>
                          <Form.Group>
                            <Form.Label className="fw-bold">Link Tour 360 (Opcional)</Form.Label>
                            <Form.Control
                              type="url"
                              value={tour360}
                              onChange={(e) => setTour360(e.target.value)}
                              placeholder="https://..."
                            />
                          </Form.Group>
                        </Col>
                      </>
                    )}

                    <Col xs={12} className='d-flex justify-content-end'>
                      {!secciones[seccionId].completada ? (
                        <Button
                          className='bg-dark rounded-5 border-0 px-4'
                          onClick={() => handleGuardarSeccion(seccionId)}
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
        ))}

        <div className="d-flex justify-content-end align-items-center gap-3">
          <Button variant="dark" className='rounded-5 px-3 px-lg-5' onClick={() => navigate('/cpanel/proyectos')}>
            Cancelar
          </Button>
          <Button
            className='rounded-5 px-3 px-lg-5'
            variant="dark"
            disabled={!secciones.datosProyecto.completada || !secciones.ubicacion.completada || loading}
            onClick={handleSubmit}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Subiendo...
              </>
            ) : (
              isEdit ? 'Guardar cambios' : (isAdmin ? 'Publicar' : 'Crear proyecto')
            )}
          </Button>
        </div>
      </div>
    </Container>
  );
}

export default ProyectoForm;
