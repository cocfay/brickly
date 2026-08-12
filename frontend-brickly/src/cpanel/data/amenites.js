// Amenidades exclusivas de PROYECTOS (edificio)
export const AMENIDADES_PROYECTO = [
  "Acabados de lujo",
  "Piscina",
  "Jacuzzi / Spa",
  "Gimnasio",
  "Business Center / Co-working",
  "Roof top / Terraza",
  "Cancha de pádel",
  "Cancha de tenis / Squash",
  "Área de fogatas (Fire pits)",
  "Salón de juegos (Billar/Ping pong)",
  "Bar / Lounge",
  "Juegos infantiles (Playground)",
  "Parque para mascotas (Pet park)",
  "Estación de lavado para mascotas (Pet wash)",
  "Senderos para caminar",
  "Parqueo de visitas",
  "Planta eléctrica de emergencia",
  "Pozo de agua propio"
];

// Amenidades de MODELOS (apartamento)
export const AMENIDADES_MODELO = [
  "Balcón",
  "Aire acondicionado",
  "AIRBNB friendly",
  "Calentador de agua",
  "Cocina con isla",
  "Despensa (Pantry)",
  "Área de lavandería",
  "Cuarto de servicio",
  "Ventanales de piso a techo",
  "Cerraduras inteligentes",
  "Suelo radiante",
  "Bodega privada",
  "Sistema de sonido integrado",
  "Ducto de basura",
  "Área de piñatas",
  "Lobby / Recepción",
  "Área de recepción de delivery",
  "Wi-Fi en áreas comunes",
  "Elevadores de alta velocidad",
  "Cargadores para vehículos eléctricos",
  "Paneles solares",
  "Cuarto de herramientas",
  "Helipuerto",
  "Frente al muelle"
];

export const amenitiesList = [...AMENIDADES_PROYECTO, ...AMENIDADES_MODELO];

// Amenidades de MODELOS tipo CASA (condominio)
export const AMENIDADES_CASA = [
  "Acabados de lujo",
  "Piscina",
  "Jacuzzi / Spa",
  "Gimnasio",
  "Business Center / Co-working",
  "Roof top / Terraza",
  "Cancha de pádel",
  "Cancha de tenis / Squash",
  "Área de fogatas (Fire pits)",
  "Salón de juegos (Billar/Ping pong)",
  "Bar / Lounge",
  "Juegos infantiles (Playground)",
  "Parque para mascotas (Pet park)",
  "Estación de lavado para mascotas (Pet wash)",
  "Senderos para caminar",
  "Parqueo de visitas",
  "Planta eléctrica de emergencia",
  "Pozo de agua propio",
  "Balcón",
  "Aire acondicionado",
  "AIRBNB friendly",
  "Calentador de agua",
  "Cocina con isla",
  "Despensa (Pantry)",
  "Área de lavandería",
  "Cuarto de servicio",
  "Ventanales de piso a techo",
  "Cerraduras inteligentes",
  "Suelo radiante",
  "Bodega privada",
  "Sistema de sonido integrado",
  "Ducto de basura",
  "Área de piñatas",
  "Lobby / Recepción",
  "Área de recepción de delivery",
  "Wi-Fi en áreas comunes",
  "Elevadores de alta velocidad",
  "Cargadores para vehículos eléctricos",
  "Paneles solares",
  "Cuarto de herramientas",
  "Helipuerto",
  "Frente al muelle"
];

// Amenidades de MODELOS tipo OFICINA (edificio de oficinas)
export const AMENIDADES_OFICINA = [
  "Acabados de lujo",
  "Business Center / Co-working",
  "Parqueo de visitas",
  "Planta eléctrica de emergencia",
  "Balcón",
  "Aire acondicionado",
  "Calentador de agua",
  "Cocina con isla",
  "Área de lavandería",
  "Cerraduras inteligentes",
  "Sistema de sonido integrado",
  "Lobby / Recepción",
  "Área de recepción de delivery",
  "Wi-Fi en áreas comunes",
  "Elevadores de alta velocidad",
  "Cargadores para vehículos eléctricos"
];

// Amenidades de MODELOS tipo BODEGA (proyectos de bodegas)
export const AMENIDADES_BODEGA = [
  "Business Center / Co-working",
  "Roof top / Terraza",
  "Parqueo de visitas",
  "Planta eléctrica de emergencia",
  "Balcón",
  "Aire acondicionado",
  "Calentador de agua",
  "Cocina con isla",
  "Cerraduras inteligentes",
  "Lobby / Recepción",
  "Área de recepción de delivery",
  "Wi-Fi en áreas comunes",
  "Elevadores de alta velocidad",
  "Cargadores para vehículos eléctricos"
];

// Generar el objeto asociativo
export const amenitiesMap = amenitiesList.reduce((acc, amenity) => {
  // 1. Quitamos espacios y pasamos a minúsculas
  // También quitamos caracteres especiales si quieres que la llave sea más limpia
  const key = amenity
    .normalize("NFD")               // Separa los acentos de las letras
    .replace(/[\u0300-\u036f]/g, "") // ELIMINA LOS ACENTOS (solo para la llave)
    .toLowerCase()
    .replace(/\s+/g, '')            // Quita espacios
    .replace(/[^a-z0-9]/g, '');

  acc[key] = amenity;
  return acc;
}, {});