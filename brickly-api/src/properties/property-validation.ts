// Reglas de validación para publicación de una propiedad.
// Réplica server-side de cpanel/services/validacionPropiedades.js
// con dos ajustes acordados:
//  - La ZONA NO bloquea la publicación (se rellena desde el contenido si aparece).
//  - El MUNICIPIO sí es obligatorio (a menos que el departamento sea "Ninguno").

export function getHiddenFields(type: string): Record<string, any> {
  switch (type) {
    case 'Finca':
    case 'Terreno':
      return {
        ubicacion: ['waterRelation', 'view'],
        dimensiones: ['constructionM2', 'storageM2'],
        estruturas: ['constructionYear', 'remodelYear', 'levels', 'ceilingHeight'],
        ambiente: true,
        gastos: ['stoveType'],
        amenidadesFilter: ['piscina', 'gimnasio',
          'salonsocial', 'businesscentercoworking', 'canchadepadel', 'canchadetenissquash', 'areadefogatasfirepits',
          'salondejuegosbillarpingpong', 'juegosinfantilesplayground', 'barlounge', 'ludoteca',
          'parqueparamascotaspetpark', 'estaciondelavadoparamascotaspetwash',
          'senderosparacaminar', 'areadepiatas', 'seguridad247cctv', 'parqueodevisitas', 'lobbyrecepcion', 'areaderecepciondedelivery',
          'plantaelectricadeemergencia', 'pozodeaguapropio', 'wifienareascomunes'
        ]
      };
    case 'Bodega':
      return {
        ubicacion: ['waterRelation', 'view'],
        ambiente: ['bedrooms', 'halfBathrooms', 'serviceRoom', 'deck', 'familyroom'],
        gastos: ['stoveType'],
        amenidadesFilter: [
          'balcon', 'aireacondicionado', 'calentadordeagua', 'cocinaconisla',
          'cerradurasinteligentes', 'businesscentercoworking', 'rooftopterraza',
          'seguridad247cctv', 'parqueodevisitas', 'plantaelectricadeemergencia',
          'lobbyrecepcion', 'areaderecepciondedelivery', 'wifienareascomunes',
          'elevadoresdealtavelocidad', 'cargadoresparavehiculoselectricos'
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
          'balcon', 'aireacondicionado', 'calentadordeagua', 'cocinaconisla',
          'areadelavanderia', 'cerradurasinteligentes', 'acabadosdelujo',
          'sistemadesonidointegrado', 'businesscentercoworking', 'seguridad247cctv',
          'parqueodevisitas', 'plantaelectricadeemergencia', 'lobbyrecepcion',
          'areaderecepciondedelivery', 'wifienareascomunes', 'elevadoresdealtavelocidad',
          'cargadoresparavehiculoselectricos'
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
          'balcon', 'aireacondicionado', 'calentadordeagua', 'cocinaconisla',
          'areadelavanderia', 'cerradurasinteligentes', 'acabadosdelujo',
          'sistemadesonidointegrado', 'businesscentercoworking', 'seguridad247cctv',
          'parqueodevisitas', 'plantaelectricadeemergencia', 'lobbyrecepcion',
          'areaderecepciondedelivery', 'wifienareascomunes', 'elevadoresdealtavelocidad',
          'cargadoresparavehiculoselectricos'
        ]
      };
    default:
      return {};
  }
}

interface Requerido {
  label: string;
  seccion: string;
}

const hasValue = (value: any): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (typeof value === 'number' && (isNaN(value) || value < 0)) return false;
  return true;
};

const esDepartamentoNinguno = (dept: any): boolean => {
  const d = String(dept || '').trim().toLowerCase();
  return d === '' || d === 'ninguno' || d === 'none';
};

/**
 * Devuelve lista de motivos (strings) por los que una propiedad NO está lista
 * para publicarse. Vacío = está lista.
 */
export function validatePublicFields(data: any): string[] {
  if (!data || !data.market) return ['General - No hay datos de la propiedad'];

  const reasons: string[] = [];
  const type = data.market.type;

  // 1. Datos de la propiedad
  const market = data.market || {};
  const datos: { key: string; label: string }[] = [
    { key: 'title', label: 'Nombre de la propiedad' },
    { key: 'type', label: 'Tipo de propiedad' },
    { key: 'mode', label: 'Modalidad' },
    { key: 'price', label: 'Precio total en quetzales' },
    { key: 'exchangeRate', label: 'Tasa dólar' },
    { key: 'priceUSD', label: 'Precio total en dólar' },
    { key: 'description', label: 'Descripción de la propiedad' }
  ];
  for (const d of datos) {
    if (!hasValue(market[d.key])) {
      reasons.push(`Datos de la propiedad - ${d.label}`);
    }
  }

  // 2. Ubicación (zona NO bloquea; municipio no exigido si departamento es "Ninguno")
  const hidden = getHiddenFields(type) || {};
  const location = data.location || {};
  const isFieldHidden = (seccion: string, campo: string): boolean => {
    const s = hidden[seccion];
    if (s === true) return true;
    if (Array.isArray(s) && s.includes(campo)) return true;
    return false;
  };

  if (!isFieldHidden('ubicacion', 'department') && !hasValue(location.department)) {
    reasons.push('Ubicación y entorno - Departamento');
  }
  if (
    !isFieldHidden('ubicacion', 'municipality') &&
    !esDepartamentoNinguno(location.department) &&
    !hasValue(location.municipality)
  ) {
    reasons.push('Ubicación y entorno - Municipio');
  }
  if (!isFieldHidden('ubicacion', 'coordinates')) {
    const coords = location.coordinates?.coordinates;
    const okCoords =
      coords && coords.length === 2 && coords[0] && coords[1];
    if (!okCoords) reasons.push('Ubicación y entorno - Coordenadas GPS');
  }

  // 3. Dimensiones: constructionM2 obligatorio para Edificio y Bodega
  const dimensions = data.dimensions || {};
  if (type === 'Edificio' || type === 'Bodega') {
    if (!hasValue(dimensions.constructionM2)) {
      reasons.push('Dimensiones y áreas - Área de construcción (m²)');
    }
  }

  // 4. Ambiente (obligatorio salvo sección oculta/Bodega/Edificio)
  if (hidden.ambiente !== true && type !== 'Bodega' && type !== 'Edificio') {
    const layout = data.layout || {};
    const ambientes: { key: string; label: string }[] = [
      { key: 'totalRooms', label: 'Total de Ambientes' },
      { key: 'bedrooms', label: type === 'Oficina' || type === 'Local comercial' ? 'Espacios' : 'Dormitorios' },
      { key: 'bathrooms', label: 'Baños completos' }
    ];
    for (const a of ambientes) {
      if (isFieldHidden('ambiente', a.key)) continue;
      if (!hasValue(layout[a.key])) {
        reasons.push(`Distribución de ambientes - ${a.label}`);
      }
    }
  }

  // 5. Multimedia - al menos 3 fotos (1 principal + 2 secundarias)
  const media = data.media || {};
  const photos = media.photos || [];
  if (photos.length === 0) {
    reasons.push('Multimedia - Fotos de la propiedad');
  } else {
    const hasMain = photos.some((p: any) => p && p.isMain);
    const secondaryCount = photos.filter((p: any) => p && !p.isMain && p.path).length;
    if (!hasMain) reasons.push('Multimedia - Imagen principal');
    else if (secondaryCount < 2)
      reasons.push(`Multimedia - Se requieren al menos 2 fotos secundarias (tienes ${secondaryCount})`);
  }

  return reasons;
}