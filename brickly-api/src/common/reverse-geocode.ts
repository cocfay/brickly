import { detectarMunicipio, detectarZona } from './guatemala-locations';

/**
 * Geocodificación inversa (coordenadas → departamento/municipio/zona) usando
 * Nominatim (OpenStreetMap). Se usa como respaldo cuando el departamento,
 * municipio o zona no se pudieron detectar en el texto de la propiedad.
 *
 * Política de uso de Nominatim: máx. 1 req/seg y User-Agent identificable.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT =
  'BricklyHomes/1.0 (https://www.bricklyhomes.com; contacto@bricklyhomes.com)';
const MIN_INTERVAL_MS = 1100;
const TIMEOUT_MS = 8000;

export type ReverseGeocodeResult = {
  department?: string;
  municipality?: string;
  zone?: string;
  raw?: string;
};

let lastCallAt = 0;
const cache = new Map<string, ReverseGeocodeResult | null>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function throttle() {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastCallAt);
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

/**
 * Devuelve departamento/municipio/zona aproximados para las coordenadas dadas
 * (lat, lng). Si no se puede geocodificar, devuelve null.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  await throttle();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url =
      `${NOMINATIM_URL}?format=jsonv2&lat=${encodeURIComponent(lat)}` +
      `&lon=${encodeURIComponent(lng)}&addressdetails=1&accept-language=es`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }

    const data: any = await res.json();
    const address = data?.address || {};

    // Texto con todos los componentes para reutilizar los detectores locales.
    const text = [
      address.state,
      address.region,
      address.province,
      address.county,
      address.city,
      address.municipality,
      address.town,
      address.village,
      address.city_district,
      address.suburb,
      address.neighbourhood,
      address.quarter,
      data?.display_name,
    ]
      .filter((v) => typeof v === 'string' && v.trim())
      .join(', ');

    const detected = detectarMunicipio(text);
    const zone = detectarZona(text);

    const result: ReverseGeocodeResult = {
      department: detected.department || address.state || undefined,
      municipality:
        detected.municipality ||
        address.county ||
        address.city ||
        address.municipality ||
        address.town ||
        address.village ||
        undefined,
      zone: zone && zone !== 'ninguno' ? zone : undefined,
      raw: data?.display_name,
    };

    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
