// ── Amenidades del edificio ─────────────────────────────────────
// edificio: true  → aplica SOLO al edificio (se marca con * en la UI)
// edificio: false → es amenidad de los apartamentos
export const AMENIDADES_ALL = [
    { key: 'balcon',             nombre: 'Balcón',                                 edificio: false },
    { key: 'aire',               nombre: 'Aire acondicionado',                     edificio: false },
    { key: 'airbnb',             nombre: 'AIRBNB friendly',                        edificio: false },
    { key: 'calentador',         nombre: 'Calentador de agua',                     edificio: false },
    { key: 'cocinaIsla',         nombre: 'Cocina con isla',                        edificio: false },
    { key: 'despensa',           nombre: 'Despensa (Pantry)',                      edificio: false },
    { key: 'lavanderia',         nombre: 'Área de lavandería',                     edificio: false },
    { key: 'cuartoServicio',     nombre: 'Cuarto de servicio',                     edificio: false },
    { key: 'ventanales',         nombre: 'Ventanales de piso a techo',             edificio: false },
    { key: 'cerraduras',         nombre: 'Cerraduras inteligentes',                edificio: false },
    { key: 'sueloRadiante',      nombre: 'Suelo radiante',                         edificio: false },
    { key: 'bodegaPrivada',      nombre: 'Bodega privada',                         edificio: false },
    { key: 'acabadosLujo',       nombre: 'Acabados de lujo',                       edificio: true },
    { key: 'sonido',             nombre: 'Sistema de sonido integrado',            edificio: false },
    { key: 'ductoBasura',        nombre: 'Ducto de basura',                        edificio: false },
    { key: 'piscina',            nombre: 'Piscina',                                edificio: true },
    { key: 'jacuzzi',            nombre: 'Jacuzzi / Spa',                          edificio: true },
    { key: 'gimnasio',           nombre: 'Gimnasio',                               edificio: true },
    { key: 'businessCenter',     nombre: 'Business Center / Co-working',           edificio: true },
    { key: 'rooftop',            nombre: 'Roof top / Terraza',                     edificio: true },
    { key: 'padel',              nombre: 'Cancha de pádel',                        edificio: true },
    { key: 'tenis',              nombre: 'Cancha de tenis / Squash',               edificio: true },
    { key: 'fogatas',            nombre: 'Área de fogatas (Fire pits)',            edificio: true },
    { key: 'salonJuegos',        nombre: 'Salón de juegos (Billar/Ping pong)',     edificio: true },
    { key: 'bar',                nombre: 'Bar / Lounge',                           edificio: true },
    { key: 'juegosInfantiles',   nombre: 'Juegos infantiles (Playground)',         edificio: true },
    { key: 'petPark',            nombre: 'Parque para mascotas (Pet park)',        edificio: true },
    { key: 'petWash',            nombre: 'Estación de lavado para mascotas (Pet wash)', edificio: true },
    { key: 'senderos',           nombre: 'Senderos para caminar',                  edificio: true },
    { key: 'pinatas',            nombre: 'Área de piñatas',                        edificio: false },
    { key: 'parqueoVisitas',     nombre: 'Parqueo de visitas',                     edificio: true },
    { key: 'planta',             nombre: 'Planta eléctrica de emergencia',         edificio: true },
    { key: 'pozo',               nombre: 'Pozo de agua propio',                    edificio: true },
    { key: 'lobby',              nombre: 'Lobby / Recepción',                      edificio: false },
    { key: 'delivery',           nombre: 'Área de recepción de delivery',          edificio: false },
    { key: 'wifi',               nombre: 'Wi-Fi en áreas comunes',                 edificio: false },
    { key: 'elevadores',         nombre: 'Elevadores de alta velocidad',           edificio: false },
    { key: 'cargadores',         nombre: 'Cargadores para vehículos eléctricos',   edificio: false },
    { key: 'paneles',            nombre: 'Paneles solares',                        edificio: false },
    { key: 'herramientas',       nombre: 'Cuarto de herramientas',                 edificio: false },
    { key: 'helipuerto',         nombre: 'Helipuerto',                             edificio: false },
    { key: 'muelle',             nombre: 'Frente al muelle',                       edificio: false },
];

const slugifyAmenidad = (name) =>
    name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

// Mapa: key guardada en BD (slug del nombre) → { key, nombre, edificio }
const AMENIDADES_MAP = AMENIDADES_ALL.reduce((acc, a) => {
    acc[slugifyAmenidad(a.nombre)] = a;
    return acc;
}, {});

/**
 * Convierte las claves de amenidades guardadas en BD (generadas por el
 * SelectorAmenidades del cpanel como slug del nombre) en la lista de
 * amenidades con nombre legible y el flag "edificio".
 */
export const enriquecerAmenidades = (keys = []) =>
    keys
        .filter(Boolean)
        .map((key) => {
            const match = AMENIDADES_MAP[key];
            return match
                ? { key, nombre: match.nombre, edificio: match.edificio }
                : { key, nombre: key, edificio: false };
        });
