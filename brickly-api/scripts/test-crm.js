const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://127.0.0.1:27017/brickly';
const USER_ID = '6a0e40d259f9d7ee06b1b1a4';
const TARGET_TITLE = 'SIENA DE SAN ISIDRO | Casa en Renta , Zona 16';

async function main() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('Conectado a MongoDB');

  const user = await mongoose.connection.db
    .collection('users')
    .findOne({ _id: new mongoose.Types.ObjectId(USER_ID) });

  if (!user) {
    console.log('Usuario no encontrado');
    process.exit(1);
  }

  const apiKey = user.easyBrokerApiKey;
  console.log('easyBrokerApiKey:', apiKey ? 'PRESENTE' : 'VACIO');
  console.log('easyBrokerEnabled:', user.easyBrokerEnabled);
  console.log('easyBrokerLastSync:', user.easyBrokerLastSync);

  if (!apiKey) {
    console.log('No hay API key, no se puede probar');
    process.exit(1);
  }

  let page = 1;
  let hasMore = true;
  let total = 0;
  let found = null;

  while (hasMore) {
    const url = `https://api.easybroker.com/v1/properties?page=${page}&search[statuses][]=published`;
    const res = await fetch(url, {
      headers: {
        'X-Authorization': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.log('Error API EasyBroker:', res.status, await res.text());
      process.exit(1);
    }

    const data = await res.json();
    const items = data.content || [];
    total += items.length;

    const match = items.find((it) => it.title === TARGET_TITLE);
    if (match) {
      found = match;
      break;
    }

    hasMore = data.pagination?.next_page != null;
    page++;
  }

  console.log('Total propiedades publicadas revisadas:', total);
  console.log('Busqueda exacta:', JSON.stringify(TARGET_TITLE));

  if (!found) {
    console.log('NO se encontro la propiedad con ese titulo exacto.');
  } else {
    console.log('ENCONTRADA. public_id:', found.public_id);
    console.log('title:', found.title);
    console.log('images count (listado):', found.images ? found.images.length : 0);

    const detailRes = await fetch(
      `https://api.easybroker.com/v1/properties/${found.public_id}`,
      { headers: { 'X-Authorization': apiKey } }
    );
    const detail = await detailRes.json();
    console.log('images count (detalle):', detail.images ? detail.images.length : 0);
    if (detail.images?.length) {
      console.log('primera imagen url:', detail.images[0].url);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});