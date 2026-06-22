// ─── Visibility rules by property type (misma lógica que en add.jsx/edit.jsx) ───
function getHiddenFields(type) {
  switch (type) {
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
    default:
      return {};
  }
}

// ─── Definición de campos obligatorios por sección ───
const SECCIONES = {
  datosPropiedad: {
    titulo: 'Datos de la propiedad',
    campos: {
      title: { label: 'Nombre de la propiedad' },
      type: { label: 'Tipo de propiedad' },
      mode: { label: 'Modalidad' },
      price: { label: 'Precio total en quetzales' },
      exchangeRate: { label: 'Tasa dólar' },
      priceUSD: { label: 'Precio total en dólar' },
      description: { label: 'Descripción de la propiedad' }
    }
  },
  ubicacion: {
    titulo: 'Ubicación y entorno',
    campos: {
      department: { label: 'Departamento' },
      municipality: { label: 'Municipio' },
      zone: { label: 'Zona' },
      coordinates: { label: 'Coordenadas GPS' }
    }
  },
  dimensiones: {
    titulo: 'Dimensiones y áreas',
    campos: {
    }
  },
  ambiente: {
    titulo: 'Distribución de ambientes',
    campos: {
      totalRooms: { label: 'Total de Ambientes' },
      bedrooms: { label: 'Dormitorios' },
      bathrooms: { label: 'Baños completos' }
    }
  }
};

/**
 * Valida que una propiedad cumpla con todos los campos obligatorios
 * según su tipo de propiedad.
 * 
 * @param {Object} data - Objeto completo de la propiedad
 * @returns {Array<{seccion: string, campo: string}>} - Array de campos faltantes
 */
export function validateRequiredFields(data) {
  if (!data || !data.market) return [{ seccion: 'General', campo: 'No hay datos de la propiedad' }];

  const propertyType = data.market.type;
  const hiddenFields = getHiddenFields(propertyType);
  const missing = [];

  // Helper para verificar si un campo está oculto para esta sección
  const isFieldHidden = (seccionId, campoKey) => {
    const sectionHidden = hiddenFields[seccionId];
    if (sectionHidden === true) return true; // sección entera oculta
    if (Array.isArray(sectionHidden) && sectionHidden.includes(campoKey)) return true;
    return false;
  };

  // Helper para verificar si un valor está presente
  const hasValue = (value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'number' && value < 0) return false;
    return true;
  };

  // 1. Datos de la propiedad
  const market = data.market || {};
  const datosCampos = SECCIONES.datosPropiedad.campos;
  for (const [campoKey, config] of Object.entries(datosCampos)) {
    if (!hasValue(market[campoKey])) {
      missing.push({ seccion: SECCIONES.datosPropiedad.titulo, campo: config.label });
    }
  }

  // 2. Ubicación
  const location = data.location || {};
  const ubicCampos = SECCIONES.ubicacion.campos;
  for (const [campoKey, config] of Object.entries(ubicCampos)) {
    if (isFieldHidden('ubicacion', campoKey)) continue;
    
    let value = location[campoKey];
    // Para coordinates, verificar el objeto anidado
    if (campoKey === 'coordinates') {
      const coords = location.coordinates?.coordinates;
      value = (coords && coords.length === 2 && coords[0] && coords[1]) ? coords : null;
    }
    // Para department, municipality, zone: si department es "Ninguno", no exigir municipality ni zone
    if (campoKey === 'municipality' || campoKey === 'zone') {
      if (location.department === 'Ninguno') continue;
    }
    
    if (!hasValue(value)) {
      missing.push({ seccion: SECCIONES.ubicacion.titulo, campo: config.label });
    }
  }

  // 3. Dimensiones
  const dimensions = data.dimensions || {};
  const dimCampos = SECCIONES.dimensiones.campos;
  for (const [campoKey, config] of Object.entries(dimCampos)) {
    if (isFieldHidden('dimensiones', campoKey)) continue;
    if (!hasValue(dimensions[campoKey])) {
      missing.push({ seccion: SECCIONES.dimensiones.titulo, campo: config.label });
    }
  }

  // Caso especial: constructionM2 obligatorio para Edificio
  if (propertyType === 'Edificio') {
    if (!hasValue(dimensions.constructionM2)) {
      missing.push({ seccion: SECCIONES.dimensiones.titulo, campo: 'Área de construcción (m²)' });
    }
  }

  // Caso especial: constructionM2 obligatorio para Bodega
  if (propertyType === 'Bodega') {
    if (!hasValue(dimensions.constructionM2)) {
      missing.push({ seccion: SECCIONES.dimensiones.titulo, campo: 'Área de construcción (m²)' });
    }
  }

  // 4. Ambiente (solo si no está oculta toda la sección)
  if (hiddenFields.ambiente !== true) {
    // Para Bodega y Edificio, ambiente no tiene campos obligatorios
    if (propertyType !== 'Bodega' && propertyType !== 'Edificio') {
      const layout = data.layout || {};
      const ambCampos = SECCIONES.ambiente.campos;
      for (const [campoKey, config] of Object.entries(ambCampos)) {
        if (isFieldHidden('ambiente', campoKey)) continue;
        
        // Para Oficina y Local comercial, el label de bedrooms cambia a "Espacios"
        let label = config.label;
        if (campoKey === 'bedrooms' && (propertyType === 'Oficina' || propertyType === 'Local comercial')) {
          label = 'Espacios';
        }
        
        if (!hasValue(layout[campoKey])) {
          missing.push({ seccion: SECCIONES.ambiente.titulo, campo: label });
        }
      }
    }
  }

  // 5. Multimedia - al menos 3 fotos (1 principal + 2 secundarias)
  const media = data.media || {};
  const photos = media.photos || [];
  const hasMain = photos.some(p => p.isMain);
  const secondaryCount = photos.filter(p => !p.isMain && p.path).length;
  
  if (photos.length === 0) {
    missing.push({ seccion: 'Multimedia', campo: 'Fotos de la propiedad' });
  } else if (!hasMain) {
    missing.push({ seccion: 'Multimedia', campo: 'Imagen principal' });
  } else if (secondaryCount < 2) {
    missing.push({ seccion: 'Multimedia', campo: `Se requieren al menos 2 fotos secundarias (tienes ${secondaryCount})` });
  }

  return missing;
}
