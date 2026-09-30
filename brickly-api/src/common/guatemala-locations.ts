export interface MunicipioEntry {
  aliases: string[];
  department: string;
  municipality: string;
}

export const MUNICIPIOS: MunicipioEntry[] = [
  // --- Guatemala ---
  { aliases: ["ciudad de guatemala", "guatemala city", "cd. de guatemala"], department: "Guatemala", municipality: "Ciudad de Guatemala" },
  { aliases: ["mixco"], department: "Guatemala", municipality: "Mixco" },
  { aliases: ["villa nueva"], department: "Guatemala", municipality: "Villa Nueva" },
  { aliases: ["san miguel petapa", "petapa"], department: "Guatemala", municipality: "San Miguel Petapa" },
  { aliases: ["villa canales"], department: "Guatemala", municipality: "Villa Canales" },
  { aliases: ["amatitlan", "amatitlán"], department: "Guatemala", municipality: "Amatitlán" },
  { aliases: ["santa catarina pinula", "santa catarina"], department: "Guatemala", municipality: "Santa Catarina Pinula" },
  { aliases: ["san jose pinula", "san josé pinula"], department: "Guatemala", municipality: "San José Pinula" },
  { aliases: ["san juan sacatepequez", "san juan sacatepéquez"], department: "Guatemala", municipality: "San Juan Sacatepéquez" },
  { aliases: ["san pedro sacatepequez", "san pedro sacatepéquez"], department: "Guatemala", municipality: "San Pedro Sacatepéquez" },
  { aliases: ["chinautla"], department: "Guatemala", municipality: "Chinautla" },
  { aliases: ["palencia"], department: "Guatemala", municipality: "Palencia" },
  { aliases: ["fraijanes"], department: "Guatemala", municipality: "Fraijanes" },
  // --- Sacatepéquez ---
  { aliases: ["antigua guatemala", "la antigua", "antigua"], department: "Sacatepéquez", municipality: "Antigua Guatemala" },
  { aliases: ["ciudad vieja"], department: "Sacatepéquez", municipality: "Ciudad Vieja" },
  { aliases: ["jocotenango"], department: "Sacatepéquez", municipality: "Jocotenango" },
  { aliases: ["pastores"], department: "Sacatepéquez", municipality: "Pastores" },
  { aliases: ["san antonio aguas calientes", "san antonio"], department: "Sacatepéquez", municipality: "San Antonio Aguas Calientes" },
  { aliases: ["santo domingo xenacoj", "xenacoj"], department: "Sacatepéquez", municipality: "Santo Domingo Xenacoj" },
  { aliases: ["sumpango"], department: "Sacatepéquez", municipality: "Sumpango" },
  { aliases: ["santiago sacatepequez", "santiago sacatepéquez"], department: "Sacatepéquez", municipality: "Santiago Sacatepéquez" },
  { aliases: ["san lucas sacatepequez", "san lucas sacatepéquez"], department: "Sacatepéquez", municipality: "San Lucas Sacatepéquez" },
  // --- Escuintla ---
  { aliases: ["escuintla"], department: "Escuintla", municipality: "Escuintla" },
  { aliases: ["puerto san jose", "puerto san josé", "san jose escuintla"], department: "Escuintla", municipality: "Puerto San José" },
  { aliases: ["santa lucia cotzumalguapa", "cotzumalguapa", "santa lucía cotzumalguapa"], department: "Escuintla", municipality: "Santa Lucía Cotzumalguapa" },
  { aliases: ["la democracia"], department: "Escuintla", municipality: "La Democracia" },
  { aliases: ["siquinala", "siquinalá"], department: "Escuintla", municipality: "Siquinalá" },
  { aliases: ["tiquisate"], department: "Escuintla", municipality: "Tiquisate" },
  { aliases: ["palin", "palín"], department: "Escuintla", municipality: "Palín" },
  // --- Quetzaltenango ---
  { aliases: ["quetzaltenango", "xela"], department: "Quetzaltenango", municipality: "Quetzaltenango" },
  { aliases: ["coatepeque"], department: "Quetzaltenango", municipality: "Coatepeque" },
  { aliases: ["colomba"], department: "Quetzaltenango", municipality: "Colomba" },
  { aliases: ["salcaja", "salcajá"], department: "Quetzaltenango", municipality: "Salcajá" },
  { aliases: ["ostuncalco"], department: "Quetzaltenango", municipality: "Ostuncalco" },
  { aliases: ["canton la floresta", "la floresta"], department: "Quetzaltenango", municipality: "Zona 3 Quetzaltenango" },
  // --- Chimaltenango ---
  { aliases: ["chimaltenango"], department: "Chimaltenango", municipality: "Chimaltenango" },
  { aliases: ["tepan", "tepán"], department: "Chimaltenango", municipality: "Tepán" },
  { aliases: ["patzun", "patzún"], department: "Chimaltenango", municipality: "Patzún" },
  { aliases: ["patzicia", "patzicía"], department: "Chimaltenango", municipality: "Patzicía" },
  { aliases: ["san andres itzapa", "san andrés itzapa", "itzapa"], department: "Chimaltenango", municipality: "San Andrés Itzapa" },
  { aliases: ["san juan comalapa", "comalapa"], department: "Chimaltenango", municipality: "San Juan Comalapa" },
  // --- Alta Verapaz ---
  { aliases: ["coban", "cobán"], department: "Alta Verapaz", municipality: "Cobán" },
  { aliases: ["san pedro carcha", "carcha", "carchá"], department: "Alta Verapaz", municipality: "San Pedro Carchá" },
  { aliases: ["chisec"], department: "Alta Verapaz", municipality: "Chisec" },
  { aliases: ["tactic"], department: "Alta Verapaz", municipality: "Tactic" },
  { aliases: ["panzos", "panzós"], department: "Alta Verapaz", municipality: "Panzós" },
  // --- Baja Verapaz ---
  { aliases: ["salamá"], department: "Baja Verapaz", municipality: "Salamá" },
  { aliases: ["rabinal"], department: "Baja Verapaz", municipality: "Rabinal" },
  { aliases: ["san miguel chicaj", "chicaj"], department: "Baja Verapaz", municipality: "San Miguel Chicaj" },
  // --- Huehuetenango ---
  { aliases: ["huehuetenango", "huehue"], department: "Huehuetenango", municipality: "Huehuetenango" },
  { aliases: ["chiantla"], department: "Huehuetenango", municipality: "Chiantla" },
  { aliases: ["jacaltenango"], department: "Huehuetenango", municipality: "Jacaltenango" },
  { aliases: ["barillas"], department: "Huehuetenango", municipality: "Barillas" },
  // --- San Marcos ---
  { aliases: ["san marcos", "san marcos guatemala"], department: "San Marcos", municipality: "San Marcos" },
  { aliases: ["malacatan", "malacatán"], department: "San Marcos", municipality: "Malacatán" },
  { aliases: ["san pedro", "san pedro san marcos"], department: "San Marcos", municipality: "San Pedro Sacatepéquez" },
  // --- Petén ---
  { aliases: ["flores", "flores peten", "flores petén"], department: "Petén", municipality: "Flores" },
  { aliases: ["santa elena"], department: "Petén", municipality: "Santa Elena" },
  { aliases: ["san benito"], department: "Petén", municipality: "San Benito" },
  { aliases: ["sayaxche", "sayaxché"], department: "Petén", municipality: "Sayaxché" },
  // --- Izabal ---
  { aliases: ["puerto barrios"], department: "Izabal", municipality: "Puerto Barrios" },
  { aliases: ["livingston"], department: "Izabal", municipality: "Livingston" },
  { aliases: ["los amates"], department: "Izabal", municipality: "Los Amates" },
  { aliases: ["el estor"], department: "Izabal", municipality: "El Estor" },
  // --- Suchitepéquez ---
  { aliases: ["mazatenango"], department: "Suchitepéquez", municipality: "Mazatenango" },
  { aliases: ["santo tomas la union", "santo tomás la unión"], department: "Suchitepéquez", municipality: "Santo Tomás La Unión" },
  // --- Retalhuleu ---
  { aliases: ["retalhuleu", "reu"], department: "Retalhuleu", municipality: "Retalhuleu" },
  { aliases: ["champerico"], department: "Retalhuleu", municipality: "Champerico" },
  // --- Sololá ---
  { aliases: ["solola", "sololá"], department: "Sololá", municipality: "Sololá" },
  { aliases: ["panajachel"], department: "Sololá", municipality: "Panajachel" },
  { aliases: ["san pedro la laguna", "san pedro"], department: "Sololá", municipality: "San Pedro La Laguna" },
  // --- Totonicapán ---
  { aliases: ["totonicapan", "totonicapán"], department: "Totonicapán", municipality: "Totonicapán" },
  // --- Quiché ---
  { aliases: ["santa cruz del quiche", "santa cruz", "santa cruz del quiche", "quiche", "quiché"], department: "Quiché", municipality: "Santa Cruz del Quiché" },
  { aliases: ["chichicastenango", "chichi"], department: "Quiché", municipality: "Chichicastenango" },
  { aliases: ["joyabaj"], department: "Quiché", municipality: "Joyabaj" },
  // --- Jalapa ---
  { aliases: ["jalapa"], department: "Jalapa", municipality: "Jalapa" },
  // --- Jutiapa ---
  { aliases: ["jutiapa"], department: "Jutiapa", municipality: "Jutiapa" },
  { aliases: ["asuncion mita", "asunción mita", "mita"], department: "Jutiapa", municipality: "Asunción Mita" },
  // --- Santa Rosa ---
  { aliases: ["cuilapa"], department: "Santa Rosa", municipality: "Cuilapa" },
  { aliases: ["barberena"], department: "Santa Rosa", municipality: "Barberena" },
  // --- Chiquimula ---
  { aliases: ["chiquimula"], department: "Chiquimula", municipality: "Chiquimula" },
  { aliases: ["esquipulas"], department: "Chiquimula", municipality: "Esquipulas" },
  // --- El Progreso ---
  { aliases: ["el progreso", "guastatoya"], department: "El Progreso", municipality: "Guastatoya" },
  // --- Zacapa ---
  { aliases: ["zacapa"], department: "Zacapa", municipality: "Zacapa" },
];

const normalize = (text: string): string =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function detectarMunicipio(direccion: string): {
  department: string | null;
  municipality: string | null;
} {
  const texto = normalize(direccion);

  // Sort by longest alias first to avoid false positives (e.g. "san jose pinula" before "san jose")
  const sorted = [...MUNICIPIOS].sort((a, b) => {
    const aMax = Math.max(...a.aliases.map((x) => x.length));
    const bMax = Math.max(...b.aliases.map((x) => x.length));
    return bMax - aMax;
  });

  for (const entry of sorted) {
    for (const alias of entry.aliases) {
      if (texto.includes(normalize(alias))) {
        return {
          department: entry.department,
          municipality: entry.municipality,
        };
      }
    }
  }

  return { department: null, municipality: null };
}

export function detectarZona(direccion: string): string {
  const texto = normalize(direccion);

  const match = texto.match(/\b(?:zona|zone|z\.?)\s*#?\s*(\d{1,2})\b/);
  if (!match) return 'ninguno';

  const zoneNumber = Number(match[1]);
  if (!Number.isInteger(zoneNumber) || zoneNumber < 1 || zoneNumber > 25) {
    return 'ninguno';
  }

  return `Zona ${zoneNumber}`;
}