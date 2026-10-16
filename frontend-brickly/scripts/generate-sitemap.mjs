/**
 * Genera únicamente el sitemap.xml (sin prerender) a partir de:
 *  - la base estática en public/sitemap.xml
 *  - {API}/properties/seo-combos (landings SEO con inventario)
 *  - {API}/projects?status=published (proyectos)
 *
 * Uso: node scripts/generate-sitemap.mjs [ruta-salida]
 * Por defecto escribe en dist/sitemap.xml
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const publicSitemap = path.join(projectRoot, 'public', 'sitemap.xml');
const outFile = process.argv[2] || path.join(distDir, 'sitemap.xml');

const API = process.env.PRERENDER_API_URL || 'https://ws-identity.bricklyhomes.com';
const SITE = process.env.PRERENDER_SITE_URL || 'https://www.bricklyhomes.com';

const SEO_TYPES = {
  'casas': 'Casa',
  'apartamentos': 'Apartamento',
  'terrenos': 'Terreno',
  'oficinas': 'Oficina',
  'locales-comerciales': 'Local comercial',
  'bodegas': 'Bodega',
  'casas-en-condominio': 'Casa en Condominio',
  'edificios': 'Edificio',
  'fincas': 'Finca',
  'locales': 'Local',
  'otros': 'Otro',
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

const PROJECT_TIPO_SLUG = {
  'Edificio': 'edificio',
  'Bodegas': 'bodega',
  'Bodega': 'bodega',
  'Condominio': 'condominio',
  'Edificio de oficinas': 'edificio-de-oficinas',
  'Apartamento': 'apartamento',
};
const getTipoSlug = (tipo) => PROJECT_TIPO_SLUG[tipo] || 'apartamento';
const getProjectSlug = (p) => (p ? p.projectSlug || p.slug || p._id || p.id || '' : '');
function buildProjectPath(p) {
  const slug = getProjectSlug(p);
  if (!slug) return '';
  return `/proyectos/${getTipoSlug(p.type || p.tipo)}/${slug}`;
}

async function fetchCombos() {
  const res = await fetch(`${API}/properties/seo-combos`);
  if (!res.ok) throw new Error(`GET seo-combos falló (${res.status})`);
  const list = await res.json();
  return Array.isArray(list) ? list : [];
}

async function fetchProjects() {
  const res = await fetch(`${API}/projects?status=published`);
  if (!res.ok) throw new Error(`GET projects falló (${res.status})`);
  const list = await res.json();
  return Array.isArray(list) ? list : [];
}

async function main() {
  const base = fs.readFileSync(publicSitemap, 'utf8');
  if (!/<urlset[\s\S]*<\/urlset>/.test(base)) {
    throw new Error('public/sitemap.xml no es un urlset válido');
  }

  const [apiCombos, projects] = await Promise.all([fetchCombos(), fetchProjects()]);

  const countMap = new Map();
  for (const c of apiCombos) {
    if (!TYPE_TO_SLUG[c.type] || !MODE_TO_SLUG[c.mode]) continue;
    countMap.set(`${c.type}|${c.mode}|${c.locationType}|${c.location}`, c.count || 0);
  }

  const landingUrls = buildFullMatrix()
    .map((c) => ({ ...c, count: countMap.get(`${c.type}|${c.mode}|${c.locationType}|${c.location}`) || 0 }))
    .filter((c) => c.count > 0)
    .map((c) => `  <url>\n    <loc>${SITE}${buildPath(c.type, c.mode, c.locationType, c.location)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);

  const projectUrls = projects
    .map((p) => buildProjectPath(p))
    .filter(Boolean)
    .map((p) => `  <url>\n    <loc>${SITE}${p}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);

  const updated = base.replace(/<\/urlset>/, `${[...landingUrls, ...projectUrls].join('\n')}\n</urlset>`);

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, updated, 'utf8');
  console.log(`sitemap.xml generado en ${outFile}`);
  console.log(`  - landings: ${landingUrls.length}`);
  console.log(`  - proyectos: ${projectUrls.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
