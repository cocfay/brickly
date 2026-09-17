const mongoose = require('mongoose');

const USER_ID = '6a0e40d259f9d7ee06b1b1a4';

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/brickly', {
    serverSelectionTimeoutMS: 5000,
  });

  const admin = mongoose.connection.db.admin();
  const dbs = await admin.listDatabases();
  console.log('Bases de datos:', dbs.databases.map((d) => d.name).join(', '));

  for (const db of dbs.databases) {
    if (['admin', 'local', 'config'].includes(db.name)) continue;
    const col = mongoose.connection.useDb(db.name).collection('users');
    try {
      const count = await col.countDocuments({});
      console.log(`[${db.name}] users count: ${count}`);
      let u = null;
      try {
        u = await col.findOne({ _id: new mongoose.Types.ObjectId(USER_ID) });
      } catch (e) {
        u = await col.findOne({ _id: USER_ID });
      }
      if (u) {
        console.log('  -> USUARIO ENCONTRADO en', db.name);
        console.log('  email:', u.email);
        console.log('  easyBrokerApiKey:', u.easyBrokerApiKey ? 'PRESENTE' : 'VACIO');
        console.log('  easyBrokerEnabled:', u.easyBrokerEnabled);
        console.log('  easyBrokerLastSync:', u.easyBrokerLastSync);
      } else {
        const sample = await col.findOne({ easyBrokerApiKey: { $exists: true, $ne: null } });
        if (sample) {
          console.log('  Usuario con easyBrokerApiKey en esta db:', sample._id.toString(), sample.email);
        }
      }
    } catch (e) {
      console.log(`[${db.name}] error:`, e.message);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});