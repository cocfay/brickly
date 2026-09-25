/**
 * Cruza los paths de media (photos/videos/tour360) en MongoDB contra
 * los archivos reales en disco y reporta los que faltan (404 en la web).
 *
 * Uso:
 *   node scripts/check-missing-photos.js              # resumen agrupado
 *   node scripts/check-missing-photos.js --list       # imprime archivo por archivo
 *
 * Env opcional:
 *   MONGO_URL=mongodb://127.0.0.1:27017/brickly
 *   DB_NAME=brickly
 *   UPLOADS_ROOT=/ruta/al/uploads
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'brickly';
const UPLOADS_ROOT = process.env.UPLOADS_ROOT || path.join(process.cwd(), 'uploads');
const LIST = process.argv.includes('--list');

const PREFIX = 'properties/photos/';
// solo fotos/videos/tour360 que viven bajo properties/photos/
const MEDIA_KEYS = ['photos', 'videos', 'tour360'];
const FIELD_KEYS = ['path', 'thumbnail'];

function collectPaths(media) {
  const out = [];
  if (!media) return out;
  for (const key of MEDIA_KEYS) {
    const arr = media[key];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      for (const f of FIELD_KEYS) {
        const v = item?.[f];
        if (typeof v === 'string' && v.startsWith(PREFIX)) out.push(v);
      }
    }
  }
  return out;
}

async function main() {
  console.log(`[config] mongo=${MONGO_URL} db=${DB_NAME}`);
  console.log(`[config] uploads=${UPLOADS_ROOT}`);
  console.log(`[config] listado completo=${LIST ? 'SI' : 'no (solo resumen)'}`);

  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db(DB_NAME);
  const props = db.collection('properties');

  const cursor = props.find(
    { 'media.photos': { $exists: true, $ne: [] } },
    { projection: { _id: 1, folderId: 1, 'media.photos': 1, 'media.videos': 1, 'media.tour360': 1 } },
  );

  const missingCount = new Map(); // key: `user/folder` -> {missing, total, users}
  const missingFiles = new Map(); // key: relative path -> true  (set)
  const relToUsers = new Map(); // relPath -> Set(userId)
  let totalChecked = 0;
  let totalMissing = 0;
  let docsWithMissing = 0;
  let propsChecked = 0;

  for await (const doc of cursor) {
    propsChecked++;
    const relPaths = collectPaths(doc.media);
    let docMissing = 0;
    for (const rel of relPaths) {
      totalChecked++;
      const abs = path.join(UPLOADS_ROOT, ...rel.split('/'));
      const exists = fs.existsSync(abs) && fs.statSync(abs).isFile();
      if (!exists) {
        totalMissing++;
        docMissing++;
        missingFiles.set(rel, true);
        if (!relToUsers.has(rel)) relToUsers.set(rel, new Set());
        relToUsers.get(rel).add(String(doc._id));
        const seg = rel.split('/');
        const key = `${seg[2]}/${seg[3]}`; // userId/folderId
        const cur = missingCount.get(key) || { missing: 0, total: 0, users: 0 };
        cur.missing++;
        missingCount.set(key, cur);
      }
    }
    // total appears o no: contar tamano real del segmento folder en disco
    if (docMissing > 0) docsWithMissing++;
  }

  console.log(`\n[resumen] props revisadas=${propsChecked} elementos referenciados=${totalChecked}`);
  console.log(`[resumen] archivos FALTANTES=${totalMissing} en ${docsWithMissing} propiedades`);
  console.log(`[resumen] carpetas user/folder afectadas=${missingCount.size}`);

  if (missingCount.size) {
    console.log('\nTop carpetas con archivos faltantes (user/folder -> faltantes/total):');
    const sorted = [...missingCount.entries()].sort((a, b) => b[1].missing - a[1].missing);
    for (const [key, v] of sorted.slice(0, 40)) {
      console.log(`  ${key}: ${v.missing}`);
    }
  }

  if (LIST && missingFiles.size) {
    console.log('\nArchivos faltantes:');
    const rels = [...missingFiles.keys()];
    for (const rel of rels) {
      console.log(`  ${rel}`);
    }
    console.log(`\n(total ${rels.length} archivos unicos faltantes, excluyendo duplicados entre propiedades)`);
  }

  await client.close();
}

main().catch((e) => {
  console.error('ERROR', e);
  process.exit(1);
});