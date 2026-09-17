export const SEO_TYPES = {
  'casas': 'Casa',
  'apartamentos': 'Apartamento',
  'terrenos': 'Terreno',
  'oficinas': 'Oficina',
  'locales-comerciales': 'Local comercial',
  'bodegas': 'Bodega',
};

export const SEO_MODES = {
  'venta': 'Venta',
  'alquiler': 'Alquiler',
};

export const TYPE_TO_SLUG = Object.fromEntries(
  Object.entries(SEO_TYPES).map(([slug, type]) => [type, slug])
);

export const MODE_TO_SLUG = Object.fromEntries(
  Object.entries(SEO_MODES).map(([slug, mode]) => [mode, slug])
);

export const TYPE_PLURAL = {
  'Casa': 'Casas',
  'Apartamento': 'Apartamentos',
  'Terreno': 'Terrenos',
  'Oficina': 'Oficinas',
  'Local comercial': 'Locales Comerciales',
  'Bodega': 'Bodegas',
};

export const MODE_LABEL = {
  'Venta': 'Venta',
  'Alquiler': 'Alquiler',
};

function slugifyLocation(locationType, location) {
  const raw = String(location ?? '').trim();
  if (locationType === 'zone') {
    const num = raw.replace(/^zona\s*/i, '').trim();
    return `zona-${num.toLowerCase()}`;
  }
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseLocationSlug(slug) {
  const zoneMatch = /^zona-(\d+)$/i.exec(slug || '');
  if (zoneMatch) {
    return { locationType: 'zone', location: `Zona ${zoneMatch[1]}` };
  }
  const location = String(slug || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { locationType: 'department', location };
}

export function parseSeoSlugs(tipoOp, ubicacion) {
  if (!tipoOp || !ubicacion) return null;

  const suffixes = [
    ['-en-venta', 'venta'],
    ['-venta', 'venta'],
    ['-en-alquiler', 'alquiler'],
    ['-alquiler', 'alquiler'],
  ];

  let typeSlug = null;
  let modeSlug = null;
  for (const [suffix, mode] of suffixes) {
    if (tipoOp.endsWith(suffix)) {
      modeSlug = mode;
      typeSlug = tipoOp.slice(0, -suffix.length);
      break;
    }
  }
  if (!typeSlug || !modeSlug) return null;

  const type = SEO_TYPES[typeSlug];
  const mode = SEO_MODES[modeSlug];
  if (!type || !mode) return null;

  const loc = parseLocationSlug(ubicacion);
  return { type, mode, ...loc };
}

export function buildTipoOpSlug(type, mode) {
  return `${TYPE_TO_SLUG[type] || type}-en-${MODE_TO_SLUG[mode] || mode}`;
}

export function buildSeoPath(type, mode, locationType, location) {
  return `/propiedades/${buildTipoOpSlug(type, mode)}/${slugifyLocation(locationType, location)}/`;
}

export function seoLabel(type, mode) {
  return `${TYPE_PLURAL[type] || type} en ${MODE_LABEL[mode] || mode}`;
}

export function seoTitle(type, mode, location) {
  return `${seoLabel(type, mode)} ${location}`;
}

export function seoDescription(type, mode, location) {
  const label = seoLabel(type, mode);
  return `Encuentra ${label.toLowerCase()} en ${location}. Explora propiedades disponibles, precios, características y proyectos inmobiliarios en Brickly.`;
}