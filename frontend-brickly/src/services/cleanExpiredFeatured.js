import { API_URL, getToken } from './authService';
import { fetchAllPages } from '../utils/fetchAll';

/**
 * Limpia los destacados expirados:
 * - Propiedades: featured.isActive = true pero expiresAt ya pasó → se desactiva
 * - Usuarios (agentes/agencias): featured_user > 0 pero featured_expire ya pasó → se resetea a 0
 * - Asociados (partners): expire_date ya pasó → se eliminan
 * 
 * Se ejecuta una sola vez al cargar el home del portal.
 */
export const cleanExpiredFeatured = async () => {
  try {
    const now = new Date();

    // Cargar propiedades y usuarios en paralelo
    const [propsRes, usersArr] = await Promise.all([
      fetch(`${API_URL}/properties`).then(r => r.json()).catch(() => ({})),
      fetchAllPages(`${API_URL}/users/list-user`).catch(() => [])
    ]);

    const propiedades = Array.isArray(propsRes?.data) ? propsRes.data : Array.isArray(propsRes) ? propsRes : [];

    // === 1. Propiedades expiradas ===
    const expiredProps = propiedades.filter(p =>
      p.featured?.isActive === true &&
      p.featured?.expiresAt &&
      new Date(p.featured.expiresAt) < now
    );

    if (expiredProps.length > 0) {
      //console.log(`🧹 Limpiando ${expiredProps.length} propiedades destacadas expiradas...`);
      await Promise.allSettled(
        expiredProps.map(p =>
          fetch(`${API_URL}/properties/${p._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
              featured: { isActive: false, expiresAt: null }
            })
          }).catch(err => console.error(`Error limpiando propiedad ${p._id}:`, err))
        )
      );
    }

    // === 2. Usuarios (agentes/agencias) expirados ===
    const expiredUsers = usersArr.filter(u =>
      u.featured_user > 0 &&
      u.featured_expire &&
      new Date(u.featured_expire) < now
    );

    if (expiredUsers.length > 0) {
      //console.log(`🧹 Limpiando ${expiredUsers.length} usuarios destacados expirados...`);
      await Promise.allSettled(
        expiredUsers.map(u =>
          fetch(`${API_URL}/users/${u._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
              featured_user: 0,
              featured_expire: null
            })
          }).catch(err => console.error(`Error limpiando usuario ${u._id}:`, err))
        )
      );
    }

    // === 3. Asociados (partners) expirados ===
    const partnersRes = await fetch(`${API_URL}/partners`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    }).then(r => r.json()).catch(() => []);

    const partners = Array.isArray(partnersRes) ? partnersRes : Array.isArray(partnersRes?.data) ? partnersRes.data : [];

    const expiredPartners = partners.filter(p =>
      p.expire_date &&
      new Date(p.expire_date) < now
    );

    if (expiredPartners.length > 0) {
      //console.log(`🧹 Limpiando ${expiredPartners.length} asociados expirados...`);
      await Promise.allSettled(
        expiredPartners.map(p =>
          fetch(`${API_URL}/partners/${p._id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${getToken()}`
            }
          }).catch(err => console.error(`Error eliminando asociado ${p._id}:`, err))
        )
      );
    }

    /* if (expiredProps.length > 0 || expiredUsers.length > 0 || expiredPartners.length > 0) {
      //console.log(`✅ Limpieza completada: ${expiredProps.length} propiedades, ${expiredUsers.length} usuarios, ${expiredPartners.length} asociados`);
    } */
  } catch (error) {
    console.error('Error en cleanExpiredFeatured:', error);
  }
};
