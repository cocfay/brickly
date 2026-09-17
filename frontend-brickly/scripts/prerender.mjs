/**
 * Prerender de las landings SEO de propiedades.
 *
 * Flujo:
 *  1. Consume {API}/properties/seo-combos para conocer el inventario real
 *     por combinación (tipo + operación + ubicación).
 *  2. Genera la matriz completa de 276 combos (6 tipos x 2 ops x 23 ubicaciones).
 *  3. Con Puppeteer visita cada landing con inventario (count > 0), captura el
 *     HTML renderizado (title, meta, H1, breadcrumb, listado) y lo guarda en
 *     dist/propiedades/<tipoOp>/<ubicacion>/index.html.
 *  4. Inyecta esas URLs en dist/sitemap.xml (solo combos con inventario).
 *
 * Uso: node scripts/prerender.mjs  (después de `vite build` y `inline-critical`)
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const API = process.env.PRERENDER_API_URL || 'https://ws-identity.bricklyhomes.com';
const SITE = process.env.PRERENDER_SITE_URL || 'https://www.bricklyhomes.com';
const PORT = Number(process.env.PRERENDER_PORT || 4174);

// ---- Mapa canónico de slugs (debe coincidir con src/utils/seoLanding.js) ----
const SEO_TYPES = {
  'casas': 'Casa',
  'apartamentos': 'Apartamento',
  'terrenos': 'Terreno',
  'oficinas': 'Oficina',
  'locales-comerciales': 'Local comercial',
  'bodegas': 'Bodega',
};
const TYPE_TO_SLUG = Object.fromEntries(Object.entries(SEO_TYPES).map(([s, t]) => [t, s]));
const SEO_MODES = { 'venta': 'Venta', 'alquiler': 'Alquiler' };
const MODE_TO_SLUG = Object.fromEntries(Object.entries(SEO_MODES).map(([s, m]) => [m, s]));

function slugifyLocation(locationType, location) {
  const raw = String(location ?? '').trim();
  if (locationType === 'zone') return `zona-${raw.replace(/^zona\s*/i, '').toLowerCase()}`;
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildPath(type, mode, locationType, location) {
  return `/propiedades/${TYPE_TO_SLUG[type]}-en-${MODE_TO_SLUG[mode]}/${slugifyLocation(locationType, location)}/`;
}

// ---- Matriz de 276 combos del documento ----
function buildFullMatrix() {
  const locations = [];
  for (let i = 1; i <= 22; i++) locations.push({ location: `Zona ${i}`, locationType: 'zone' });
  locations.push({ location: 'Escuintla', locationType: 'department' });

  const combos = [];
  for (const type of Object.values(SEO_TYPES)) {
    for (const mode of Object.values(SEO_MODES)) {
      for (const loc of locations) {
        combos.push({ type, mode, locationType: loc.locationType, location: loc.location, count: 0 });
      }
    }
  }
  return combos;
}

// ---- Servidor estático de dist ----
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  if (urlPath === '/') urlPath = '/index.html';
  let filePath = path.join(distDir, urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  res.end(fs.readFileSync(filePath));
});

async function startServer() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Sirviendo ${distDir} en http://localhost:${PORT}`);
}

async function stopServer() {
  await new Promise((resolve) => server.close(resolve));
}

async function fetchCombos() {
  const res = await fetch(`${API}/properties/seo-combos`);
  if (!res.ok) throw new Error(`GET seo-combos falló (${res.status})`);
  const list = await res.json();
  return Array.isArray(list) ? list : [];
}

function buildCountMap(apiCombos) {
  const map = new Map();
  for (const c of apiCombos) {
    if (!TYPE_TO_SLUG[c.type] || !MODE_TO_SLUG[c.mode]) continue;
    map.set(`${c.type}|${c.mode}|${c.locationType}|${c.location}`, c.count || 0);
  }
  return map;
}

function readSitemap() {
  const file = path.join(distDir, 'sitemap.xml');
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

function writeSitemap(combos) {
  const existing = readSitemap();
  const base = existing || '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>';
  if (!/<urlset[\s\S]*<\/urlset>/.test(base)) {
    console.warn('sitemap.xml no válido, se omite la generación.');
    return;
  }
  const urls = combos
    .filter((c) => c.count > 0)
    .map((c) => `  <url>\n    <loc>${SITE}${buildPath(c.type, c.mode, c.locationType, c.location)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`)
    .join('\n');
  const updated = base.replace(/<\/urlset>/, `${urls}\n</urlset>`);
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), updated, 'utf8');
  console.log(`sitemap.xml actualizado con ${combos.filter((c) => c.count > 0).length} landings.`);
}

async function prerender(combos, browser) {
  const targets = combos.filter((c) => c.count > 0);
  console.log(`Prerenderizando ${targets.length} landings con inventario...`);

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.setDefaultTimeout(45000);

  let ok = 0;
  let fail = 0;
  for (const combo of targets) {
    const p = buildPath(combo.type, combo.mode, combo.locationType, combo.location);
    const url = `http://localhost:${PORT}${p}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      // Esperar a que el listado renderice (tarjetas) o aparezca el estado vacío
      await page
        .waitForFunction(
          () =>
            document.querySelector('[id^="prop-"]') !== null ||
            document.body.innerText.includes('No coinciden propiedades') ||
            document.body.innerText.includes('No properties match')
        )
        .catch(() => {});

      const html = await page.content();
      const filePath = path.join(distDir, p, 'index.html');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, html, 'utf8');
      ok++;
    } catch (e) {
      fail++;
      console.error(`  FAIL ${p}: ${e.message}`);
    }
  }
  await page.close();
  console.log(`Prerender completado: ${ok} OK, ${fail} fallos.`);
}

async function main() {
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    console.error('No se encontró dist/index.html. Ejecuta `vite build` y `inline-critical.mjs` antes.');
    process.exit(1);
  }

  let puppeteer;
  try {
    puppeteer = (await import('puppeteer')).default;
  } catch (e) {
    console.error('Puppeteer no está instalado. Ejecuta: npm i -D puppeteer');
    process.exit(1);
  }

  const apiCombos = await fetchCombos();
  const countMap = buildCountMap(apiCombos);
  const matrix = buildFullMatrix();
  for (const c of matrix) {
    c.count = countMap.get(`${c.type}|${c.mode}|${c.locationType}|${c.location}`) || 0;
  }

  await startServer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-web-security'],
  });

  try {
    await prerender(matrix, browser);
    writeSitemap(matrix);
  } finally {
    await browser.close();
    await stopServer();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});