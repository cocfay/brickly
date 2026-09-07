import { getLogoUrl } from '../services/logoService';
import { getProjectSlug } from './projectRoutes';
import { enriquecerAmenidades } from './amenidades';

import edificioImg from '../assets/images/proyecto/edificio.png';
import modeloImg from '../assets/images/proyecto/Modelo1.png';
import developerLogo from '../assets/images/proyecto/logo.png';

export const PROYECTO_FALLBACK_IMG = edificioImg;
export const MODELO_FALLBACK_IMG = modeloImg;
export const DEVELOPER_FALLBACK_IMG = developerLogo;

/**
 * Resuelve la URL de una imagen guardada en BD.
 * - URLs absolutas (http/https) se usan tal cual.
 * - Rutas relativas (uploads/...) pasan por getLogoUrl (host del frontend).
 * - Si no hay imagen, devuelve el fallback.
 */
export const resolverImagen = (path, fallback = null) => {
  if (!path) return fallback;
  if (typeof path === 'string' && /^https?:\/\//i.test(path)) return path;
  const url = getLogoUrl(path);
  return url || fallback;
};

export const formatUSD = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return '';
  return '$' + num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export const formatGTQ = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return '';
  return 'Q ' + num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

/**
 * Devuelve el precio a mostrar según la moneda seleccionada por el usuario,
 * con fallback a la otra moneda si el valor no existe.
 * @param {number} usdNum - Precio numérico en USD (0 si no existe)
 * @param {number} qNum - Precio numérico en Quetzales (0 si no existe)
 * @param {string} currencyMode - "USD" | "GTQ"
 * @returns {string} precio formateado o "Precio a consultar"
 */
export const formatProjectPrice = (usdNum, qNum, currencyMode) => {
  const usd = parseFloat(usdNum);
  const q = parseFloat(qNum);
  const gtqActive = currencyMode === 'GTQ';
  if (gtqActive) {
    if (!isNaN(q) && q > 0) return formatGTQ(q);
    if (!isNaN(usd) && usd > 0) return formatUSD(usd);
  } else {
    if (!isNaN(usd) && usd > 0) return formatUSD(usd);
    if (!isNaN(q) && q > 0) return formatGTQ(q);
  }
  return 'Precio a consultar';
};

export const construirUbicacion = (loc = {}) => {
  const esValido = (val) =>
    val && String(val).trim() && !['ninguno', 'nunguno', 'none'].includes(String(val).toLowerCase().trim());
  const dept = esValido(loc.department) ? loc.department : (esValido(loc.departamento) ? loc.departamento : '');
  const muni = esValido(loc.municipality) ? loc.municipality : (esValido(loc.municipio) ? loc.municipio : '');
  const zonaRaw = esValido(loc.zone) ? loc.zone : (esValido(loc.zona) ? loc.zona : '');
  const zona = zonaRaw
    ? (String(zonaRaw).toLowerCase().startsWith('zona') ? zonaRaw : `Zona ${zonaRaw}`)
    : '';
  return [dept, muni, zona].filter(Boolean).join(', ');
};

/**
 * Enriquece un modelo guardado en BD a la forma de visualización
 * (precios formateados, camas/baños derivados de la distribución, imagen).
 */
export const enriquecerModelo = (m) => {
  if (!m) return null;
  const distrib = m.distribucion || {};
  const areas = m.areas || {};
  const camas = parseInt(distrib.dormitorios) || 0;
  const banos = parseInt(distrib.banosCompletos) || 0;
  const parqueoRaw = distrib.parqueo;
  const parqueo = parseInt(parqueoRaw) || 0;
  const areaStr = areas.areaConstruccionM2
    ? `${areas.areaConstruccionM2} m²`
    : '';
  const precioUSD = parseFloat(m.precioDesdeUSD);
  const precioQ = parseFloat(m.precioDesdeQ);
  const tasa = parseFloat(m.tasa);

  const fotos = (m.fotos || [])
    .map((f) => (typeof f === 'string' ? f : f?.path || f?.url || ''))
    .filter(Boolean);

  return {
    ...m,
    nombre: m.nombre || '',
    tipo: m.tipo || 'Apartamento',
    precioDesdeQ: formatGTQ(precioQ),
    precioDesdeUSD: formatUSD(precioUSD),
    precioDesdeQNum: precioQ,
    precioDesdeUSDNum: precioUSD,
    tasaUSD: !isNaN(tasa) ? `$${tasa}` : '',
    area: areaStr,
    camas,
    banos,
    parqueo,
    img: resolverImagen(fotos[0], MODELO_FALLBACK_IMG),
    fotosUrls: fotos.map((f) => resolverImagen(f)),
    descripcion: m.descripcion || '',
    tour360: m.tour360 || '',
    areas: {
      areaConstruccionM2: areas.areaConstruccionM2 || '',
      espacioAlmacenamiento: areas.espacioAlmacenamiento || '',
      totalAmbientes: areas.totalAmbientes || '',
    },
    estructura: { alturaCielo: m.estructura?.alturaCielo || '' },
    gastosFijos: {
      tipoEstufa: m.gastosFijos?.tipoEstufa || '',
      servicioAgua: m.gastosFijos?.servicioAgua || '',
      mantenimientoUSD: m.gastosFijos?.mantenimientoUSD
        ? formatUSD(m.gastosFijos.mantenimientoUSD)
        : '',
      mantenimientoQ: m.gastosFijos?.mantenimientoQ
        ? formatGTQ(m.gastosFijos.mantenimientoQ)
        : '',
      iusi: m.gastosFijos?.iusi || '',
    },
    incluye: { includes: Array.isArray(m.incluye?.includes) ? m.incluye.includes : [] },
  };
};

/**
 * Convierte un proyecto de BD a la tarjeta del listado público.
 */
export const mapProyectoToCard = (p) => {
  const modelos = (p.models || []).map(enriquecerModelo);
  const primerModelo = modelos[0] || {};
  const preciosUSD = modelos
    .map((m) => m.precioDesdeUSDNum)
    .filter((n) => !isNaN(n));
  const precioUSD = preciosUSD.length
    ? Math.min(...preciosUSD)
    : parseFloat(p.priceFromUSD);
  const preciosQ = modelos
    .map((m) => m.precioDesdeQNum)
    .filter((n) => !isNaN(n));
  const precioQ = preciosQ.length
    ? Math.min(...preciosQ)
    : parseFloat(p.priceFromQ);
  const loc = p.location || {};
  const dept = loc.department || loc.departamento || '';
  const muni = loc.municipality || loc.municipio || '';
  const zona = loc.zone || loc.zona || '';
  const areaM2 =
    primerModelo.areas?.areaConstruccionM2 ||
    p.areas?.construccionM2 ||
    '';

  return {
    id: getProjectSlug(p),
    slug: getProjectSlug(p),
    idRaw: p?._id || '',
    titulo: p.title || '',
    ubicacion: construirUbicacion(loc),
    tipo: p.type || primerModelo.tipo || 'Proyecto',
    precio: precioUSD ? formatUSD(precioUSD) : 'Precio a consultar',
    priceNum: precioUSD,
    priceQNum: precioQ,
    modo: p.mode || 'Venta',
    camas: primerModelo.camas || 0,
    banos: primerModelo.banos || 0,
    parqueo: primerModelo.parqueo || 0,
    area: areaM2 ? `${areaM2} m²` : '',
    areaNum: parseFloat(areaM2) || 0,
    totalAmbientes: primerModelo.areas?.totalAmbientes || '',
    visitas: p.visits || p.visitas || 0,
    createdAt: p.createdAt ? new Date(p.createdAt).getTime() : 0,
    featured: { isActive: false },
    exclusive: false,
    img: resolverImagen(p.mainImage, PROYECTO_FALLBACK_IMG),
    department: dept || null,
    municipality: muni || null,
    zone: zona || null,
    modelos,
  };
};

/**
 * Convierte un proyecto de BD a la vista de detalle (apartament.jsx).
 * `otros` es la lista pública de proyectos para la sección "Otras propiedades".
 */
export const enriquecerProyecto = (p, { otros = [] } = {}) => {
  const modelos = (p.models || []).map(enriquecerModelo);
  const primerModelo = modelos[0] || {};
  const loc = p.location || {};
  const areas = p.areas || {};
  const est = p.estructura || {};

  const mainImage = resolverImagen(p.mainImage, PROYECTO_FALLBACK_IMG);
  const rutaLimpia = (u = '') => (typeof u === 'string' ? u.split('?')[0].replace(/\/+$/, '') : '');
  const mainImageLimpia = rutaLimpia(p.mainImage);
  const imagenes = (p.images || [])
    .map((img) => resolverImagen(img))
    .filter(Boolean)
    .filter((_, i) => rutaLimpia((p.images || [])[i]) !== mainImageLimpia);
  const imagenesGaleria = imagenes.length
    ? [mainImage, ...imagenes]
    : [mainImage];

  const preciosUSD = modelos
    .map((m) => m.precioDesdeUSDNum)
    .filter((n) => !isNaN(n));
  const preciosQ = modelos
    .map((m) => m.precioDesdeQNum)
    .filter((n) => !isNaN(n));
  const precioUSD = preciosUSD.length
    ? Math.min(...preciosUSD)
    : parseFloat(p.priceFromUSD);
  const precioQ = preciosQ.length
    ? Math.min(...preciosQ)
    : parseFloat(p.priceFromQ);
  const tasa = parseFloat(p.rate) || parseFloat(primerModelo.tasa) || 7.5;

  return {
    id: getProjectSlug(p),
    slug: getProjectSlug(p),
    idRaw: p?._id || '',
    titulo: p.title || '',
    ubicacion: construirUbicacion(loc),
    tipo: p.type || primerModelo.tipo || 'Proyecto',
    precioDesdeUSD: !isNaN(precioUSD) ? formatUSD(precioUSD) : '—',
    precioDesdeQ: !isNaN(precioQ) ? formatGTQ(precioQ) : '—',
    precioDesdeUSDNum: !isNaN(precioUSD) ? precioUSD : 0,
    precioDesdeQNum: !isNaN(precioQ) ? precioQ : 0,
    tasaUSD: `$${tasa}`,
    modo: p.mode || 'Venta',
    situacional: p.situacional || '',
    fechaEntrega: p.fechaEntrega || '',
    unidades: p.unidades || null,
    camas: primerModelo.camas || 0,
    banos: primerModelo.banos || 0,
    parqueo: primerModelo.parqueo || 0,
    area: primerModelo.area || '',
    totalAmbientes: primerModelo.areas?.totalAmbientes || '',
    descripcion: p.description || '',
    tour360: p.tour360 || '',
    desarrolladora: {
      nombre: p.desarrolladora?.nombre || '',
      telefono: p.desarrolladora?.telefono || '',
      logo: p.desarrolladora?.logo
        ? resolverImagen(p.desarrolladora.logo, DEVELOPER_FALLBACK_IMG)
        : DEVELOPER_FALLBACK_IMG,
    },
    mainImage,
    imagenPrincipal: mainImage,
    imagenesThumbs: imagenes.slice(0, 2),
    imagenesGaleria,
    location: {
      departamento: loc.department || loc.departamento || '',
      municipio: loc.municipality || loc.municipio || '',
      zona: loc.zone || loc.zona || '',
      condominio: loc.gatedCommunity || '',
      direccionExacta: loc.address || '',
      gps: Array.isArray(loc.coordinates?.coordinates)
        ? loc.coordinates.coordinates.join(', ')
        : loc.coordinates?.gps || '',
      relacionAgua: loc.waterRelation || '',
      vista: loc.view || '',
      tipoCalle: loc.streettype || '',
    },
    areas: {
      terrenoM2: areas.terrenoM2 || '',
      terrenoV2: areas.terrenoV2 || '',
      construccionM2: areas.construccionM2 || '',
      numeroPisos: areas.numeroPisos || '',
    },
    estructura: {
      anioConstruccion: est.anioConstruccion || '',
      niveles: est.niveles || '',
      muroPerimetral: est.muroPerimetral
        ? String(est.muroPerimetral).toLowerCase().startsWith('s')
          ? 'Sí'
          : 'No'
        : '',
    },
    amenidadKeys: Object.entries(p.amenities || {})
      .filter(([, v]) => v)
      .map(([key]) => key),
    amenidades: enriquecerAmenidades(
      Object.entries(p.amenities || {})
        .filter(([, v]) => v)
        .map(([key]) => key)
    ),
    modelos,
    otrosPropiedades: (otros || [])
      .filter((o) => getProjectSlug(o) !== getProjectSlug(p))
      .map(mapProyectoToCard),
  };
};
