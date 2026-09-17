const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/brickly', {
    serverSelectionTimeoutMS: 5000,
  });
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({}).project({ email: 1, name: 1, roles: 1, easyBrokerApiKey: 1, easyBrokerEnabled: 1 }).toArray();
  console.log('=== USUARIOS ===');
  users.forEach((u) => {
    console.log(u._id.toString(), '|', u.email, '|', (u.roles || []).join(','), '| easyBroker:', u.easyBrokerApiKey ? 'SIPRESENTE' : 'no');
  });

  const props = await db.collection('properties').countDocuments({});
  console.log('=== propiedades totales:', props);

  const eb = await db.collection('properties').findOne({ easyBrokerId: { $exists: true, $ne: null } });
  console.log('propiedad con easyBrokerId:', eb ? eb.easyBrokerId + ' / user ' + eb.userId : 'ninguna');

  const siena = await db.collection('properties').findOne({ title: /SIENA/i });
  console.log('propiedad SIENA en DB:', siena ? siena._id.toString() : 'ninguna');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});