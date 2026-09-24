/**
 * Renombra carpetas de fotos que inician con guion "-" (ej: -1ujD1l4Dj) a una
 * version segura ("x1ujD1l4Dj") y sincroniza folderId + rutas en MongoDB.
 *
 * Por que: los directorios que inician con "-" se interpretan como opciones de
 * shell en cp/rsync/scp/tar, asi que al restaurar backups no se copian.
 *
 * Uso:
 *   node scripts/fix-dash-folders.js                 # dry-run (solo imprime)
 *   node scripts/fix-dash-folders.js --apply         # aplica cambios
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
const APPLY = process.argv.includes('--apply');

const sanitize = (name) => name.replace(/^-+/, (m) => 'x'.repeat(m.length));

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function photosBase(userId, folder) {
  return `properties/photos/${userId}/${folder}`;
}

function folderExists(userId, folder) {
  const p = path.join(UPLOADS_ROOT, 'properties', 'photos', String(userId), folder);
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

function listAllFolders() {
  // [{userId, folder}]
  const out = [];
  const root = path.join(UPLOADS_ROOT, 'properties', 'photos');
  if (!fs.existsSync(root)) return out;
  for (const userId of fs.readdirSync(root)) {
    const userDir = path.join(root, userId);
    if (!fs.statSync(userDir).isDirectory()) continue;
    for (const folder of fs.readdirSync(userDir)) {
      const full = path.join(userDir, folder);
      if (!fs.statSync(full).isDirectory()) continue;
      out.push({ userId, folder, full });
    }
  }
  return out;
}

async function main() {
  console.log(`[config] mongo=${MONGO_URL} db=${DB_NAME}`);
  console.log(`[config] uploads=${UPLOADS_ROOT}`);
  console.log(`[config] modo=${APPLY ? 'APPLY' : 'DRY-RUN (sin cambios, usa --apply)'}`);

  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db(DB_NAME);
  const props = db.collection('properties');

  // Recolectar renombres a partir de: 1) folderId en BD con guion, 2) carpetas en disco con guion
  // key: `${userId}` -> Map(oldFolder -> newFolder)
  const renames = new Map(); // userId -> Map(old -> new)

  const addRename = (userId, oldFolder) => {
    const u = String(userId);
    if (!oldFolder || !oldFolder.startsWith('-')) return;
    if (!renames.has(u)) renames.set(u, new Map());
    const m = renames.get(u);
    if (!m.has(oldFolder)) m.set(oldFolder, sanitize(oldFolder));
  };

  // 1) folderId en BD
  const withDashId = await props
    .find({ folderId: { $regex: /^-/ } })
    .project({ folderId: 1, userId: 1 })
    .toArray();
  for (const p of withDashId) addRename(p.userId, p.folderId);

  // 2) carpetas en disco
  for (const d of listAllFolders()) {
    addRename(d.userId, d.folder);
  }

  if (renames.size === 0) {
    console.log('[done] no hay carpetas con guion que renombrar');
    await client.close();
    return;
  }

  let totalRenameDisk = 0;
  let totalUpdateDocs = 0;

  for (const [userId, m] of renames) {
    for (let [oldFolder, newFolder] of m) {
      // evita colision de nombre en disco
      if (folderExists(userId, newFolder) && newFolder !== oldFolder) {
        let i = 2;
        while (folderExists(userId, `${newFolder}${i}`)) i++;
        newFolder = `${newFolder}${i}`;
      }

      const oldBase = photosBase(userId, oldFolder);
      const newBase = photosBase(userId, newFolder);

      console.log(`\n[rename] user=${userId}: ${oldFolder} -> ${newFolder}`);

      // renombra carpeta en disco
      if (APPLY && folderExists(userId, oldFolder)) {
        const oldPath = path.join(UPLOADS_ROOT, 'properties', 'photos', userId, oldFolder);
        const newPath = path.join(UPLOADS_ROOT, 'properties', 'photos', userId, newFolder);
        try {
          fs.renameSync(oldPath, newPath);
          totalRenameDisk++;
          console.log('  - disco: renombrada');
        } catch (e) {
          console.log('  - disco: ERROR', e.message);
        }
      } else if (folderExists(userId, oldFolder)) {
        console.log('  - disco: renombraria (dry-run)');
      } else {
        console.log('  - disco: no existe (solo BD)');
      }

      // actualiza folderId en BD (solo el doc cuyo folderId coincide)
      const re = new RegExp(`^${escapeRegExp(oldBase)}`);
      const reAny = new RegExp(`^${escapeRegExp(oldBase)}/`);

      const affected = await props
        .find({
          $or: [
            { folderId: oldFolder },
            { 'media.photos.path': { $regex: reAny } },
            { 'media.photos.thumbnail': { $regex: reAny } },
            { 'media.videos.path': { $regex: reAny } },
            { 'media.tour360.path': { $regex: reAny } },
          ],
        })
        .project({ folderId: 1, media: 1, userId: 1 })
        .toArray();

      for (const doc of affected) {
        const upd = { $set: {} };
        if (doc.folderId === oldFolder) upd.$set.folderId = newFolder;

        const fixField = (v) => {
          if (typeof v !== 'string') return v;
          if (v.startsWith(oldBase + '/')) return newBase + v.slice(oldBase.length);
          if (v === oldBase) return newBase;
          return v;
        };

        let changed = !!upd.$set.folderId;
        let mediaChanged = false;
        if (doc.media) {
          const media = { ...(doc.media || {}) };
          for (const arrKey of ['photos', 'videos', 'tour360']) {
            if (Array.isArray(media[arrKey])) {
              media[arrKey] = media[arrKey].map((item) => {
                const ni = { ...item };
                for (const k of ['path', 'thumbnail']) {
                  if (typeof ni[k] === 'string' && ni[k].includes(oldBase)) {
                    ni[k] = fixField(ni[k]);
                    mediaChanged = true;
                  }
                }
                return ni;
              });
            }
          }
          if (mediaChanged) {
            upd.$set.media = media;
            changed = true;
          }
        }

        if (changed) {
          if (APPLY) {
            await props.updateOne({ _id: doc._id }, upd);
            totalUpdateDocs++;
            console.log(`  - bd: doc ${doc._id} actualizado${upd.$set.folderId ? ' (folderId)' : ' (rutas)'}`);
          } else {
            console.log(`  - bd: actualizaria doc ${doc._id}`);
          }
        }
      }
    }
  }

  console.log(`\n[done] carpetas renombradas=${APPLY ? totalRenameDisk : 'dry-run'}, docs actualizados=${APPLY ? totalUpdateDocs : 'dry-run'}`);
  await client.close();
}

main().catch((e) => {
  console.error('ERROR', e);
  process.exit(1);
});
