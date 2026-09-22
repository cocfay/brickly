const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Types } = mongoose;

const FILE = path.join(__dirname, 'projects.json');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/brickly';

function convert(value, key) {
  if (Array.isArray(value)) return value.map((v) => convert(v, key));

  if (value && typeof value === 'object') {
    if (typeof value.$oid === 'string') return new Types.ObjectId(value.$oid);
    if (value.$date && value.$date.$numberLong) return new Date(Number(value.$date.$numberLong));
    if (value.$date) return new Date(value.$date);
    if (value.$numberLong) return Number(value.$numberLong);
    if (value.$numberInt) return Number(value.$numberInt);
    if (value.$numberDouble) return Number(value.$numberDouble);

    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = convert(v, k);
    }
    return out;
  }

  // userId del export viene como string hex; lo convertimos a ObjectId (ref User)
  if ((key === 'userId' || key === '_id') && typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
    return new Types.ObjectId(value);
  }

  return value;
}

(async () => {
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const docs = raw.map((d) => convert(d));

  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.db.collection('projects');

  const existing = await col.countDocuments();
  console.log('Antes:', existing, 'documentos');

  if (docs.length === 0) {
    console.log('No hay documentos que importar');
    await mongoose.disconnect();
    return;
  }

  // Upsert por _id: seguro de repetir
  const ops = docs.map((d) => ({
    replaceOne: {
      filter: { _id: d._id },
      replacement: d,
      upsert: true,
    },
  }));

  const res = await col.bulkWrite(ops, { ordered: false });
  console.log(
    `Resultado: inserted=${res.upsertedCount} matched=${res.matchedCount} modified=${res.modifiedCount}`
  );

  const after = await col.countDocuments();
  console.log('Después:', after, 'documentos');
  await mongoose.disconnect();
})().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});