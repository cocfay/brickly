export const amenitiesList = [
  "Walk-in closet",
  "Balcón",
  "Aire acondicionado",
  "Calentador de agua",
  "Cocina con isla",
  "Despensa (Pantry)",
  "Área de lavandería",
  "Cuarto de servicio",
  "Ventanales de piso a techo",
  "Cerraduras inteligentes",
  "Suelo radiante",
  "Bodega privada",
  "Acabados de lujo",
  "Sistema de sonido integrado",
  "Ducto de basura",
  "Piscina",
  "Jacuzzi / Spa",
  "Gimnasio",
  "Salón social",
  "Business Center / Co-working",
  "Roof top / Terraza",
  "Cancha de pádel",
  "Cancha de tenis / Squash",
  "Área de fogatas (Fire pits)",
  "Cine privado",
  "Salón de juegos (Billar/Ping pong)",
  "Bar / Lounge",
  "Juegos infantiles (Playground)",
  "Ludoteca",
  "Parque para mascotas (Pet park)",
  "Estación de lavado para mascotas (Pet wash)",
  "Senderos para caminar",
  "Área de piñatas",
  "Seguridad 24/7 (CCTV)",
  "Parqueo de visitas",
  "Planta eléctrica de emergencia",
  "Pozo de agua propio",
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