import { API_URL, getToken, handleAuthError } from './../../services/authService';
import { fetchAllPages } from '../../utils/fetchAll';
import { updatePropiedad } from './propiedades';

// Headers de autenticación
const getAuthHeaders = () => {
  const token = getToken();
  if (!token) {
    handleAuthError();
    throw new Error('No hay sesión activa');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Comprueba propiedades publicadas NO exclusivas con precio >= $1,000,000 USD
 * y las marca como exclusivas (exclusive: true).
 * 
 * Usa el filtro: ?status=published&exclusive=false
 */
export const checkAndMarkExclusive = async () => {
  try {
    const url = `${API_URL}/properties?status=published&exclusive=false`;
    const properties = await fetchAllPages(url, 500, { headers: getAuthHeaders() });

    const toMark = properties.filter(p => {
      const priceUSD = p.market?.priceUSD || 0;
      return priceUSD >= 1000000;
    });

    //console.log(`🔍 Propiedades publicadas no exclusivas: ${properties.length}`);
    //console.log(`💰 Propiedades con precio >= $1,000,000 USD: ${toMark.length}`);

    let updated = 0;
    let errors = 0;

    for (const prop of toMark) {
      try {
        const result = await updatePropiedad(prop._id, { exclusive: true });
        if (result.success) {
          updated++;
          //console.log(`✅ Marcada como exclusiva: ${prop._id} - $${prop.market?.priceUSD}`);
        } else {
          errors++;
          //console.error(`❌ Error actualizando ${prop._id}:`, result.error);
        }
      } catch (err) {
        errors++;
        //console.error(`❌ Error en ${prop._id}:`, err.message);
      }
    }

    return {
      success: true,
      message: `Proceso completado: ${updated} propiedad(es) marcada(s) como exclusiva(s), ${errors} error(es)`,
      data: { updated, errors, total: toMark.length }
    };
  } catch (error) {
    console.error('Error en checkAndMarkExclusive:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Comprueba propiedades publicadas EXCLUSIVAS cuyo precio bajó de $1,000,000 USD
 * y las desmarca como exclusivas (exclusive: false).
 * 
 * Usa el filtro: ?status=published&exclusive=true
 */
export const checkAndUnmarkExclusive = async () => {
  try {
    const url = `${API_URL}/properties?status=published&exclusive=true`;
    const properties = await fetchAllPages(url, 500, { headers: getAuthHeaders() });

    const toUnmark = properties.filter(p => {
      const priceUSD = p.market?.priceUSD || 0;
      return priceUSD < 1000000;
    });

    //console.log(`🔍 Propiedades publicadas exclusivas: ${properties.length}`);
    //console.log(`💰 Propiedades con precio < $1,000,000 USD: ${toUnmark.length}`);

    let updated = 0;
    let errors = 0;

    for (const prop of toUnmark) {
      try {
        const result = await updatePropiedad(prop._id, { exclusive: false });
        if (result.success) {
          updated++;
          //console.log(`✅ Desmarcada como exclusiva: ${prop._id} - $${prop.market?.priceUSD}`);
        } else {
          errors++;
          //console.error(`❌ Error actualizando ${prop._id}:`, result.error);
        }
      } catch (err) {
        errors++;
        //console.error(`❌ Error en ${prop._id}:`, err.message);
      }
    }

    return {
      success: true,
      message: `Proceso completado: ${updated} propiedad(es) desmarcada(s) como exclusiva(s), ${errors} error(es)`,
      data: { updated, errors, total: toUnmark.length }
    };
  } catch (error) {
    console.error('Error en checkAndUnmarkExclusive:', error);
    return { success: false, error: error.message };
  }
};
