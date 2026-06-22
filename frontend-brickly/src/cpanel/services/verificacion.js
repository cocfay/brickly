import { API_URL, getToken, clearSession } from '../../services/authService';
import { isProfileComplete } from '../../utils/profileUtils';
import { fetchAllPages } from '../../utils/fetchAll';

/**
 * Obtiene todas las agencias que cumplen con:
 * - Habilitadas (isEnabled)
 * - Rol "agencia"
 * - Perfil completo (isProfileComplete)
 * - Al menos 1 propiedad publicada (propia o de agentes hijos)
 * 
 * Ordenadas primero las ya verificadas (agentInfo.verified === true)
 */
export const getAgenciesForVerification = async () => {
    try {
        const token = getToken();
        const headers = { 'Authorization': `Bearer ${token}` };

        const [users, publishedProps] = await Promise.all([
            fetchAllPages(`${API_URL}/users/list-user`, 100, { headers }),
            fetchAllPages(`${API_URL}/properties?status=published`, 100, { headers })
        ]);

        // Filtrar solo agencias habilitadas con perfil completo
        const agencies = users.filter(u =>
            u.isEnabled &&
            Array.isArray(u.roles) && u.roles.includes('agencia') &&
            isProfileComplete(u)
        );

        // Para cada agencia, calcular agentes hijos que cumplen condiciones
        const result = agencies.map(agency => {
            // IDs de agentes hijos habilitados con perfil completo
            const hijos = users.filter(u =>
                u.parentId === agency._id &&
                u.isEnabled &&
                Array.isArray(u.roles) && u.roles.includes('agente') &&
                isProfileComplete(u)
            );

            // De esos, cuáles tienen al menos 1 propiedad publicada
            const hijosConProps = hijos.filter(hijo =>
                publishedProps.some(p =>
                    p.userId === hijo._id ||
                    (Array.isArray(p.agents) && p.agents.includes(hijo._id))
                )
            );

            return {
                ...agency,
                avatarUrl: agency.avatar
                    ? API_URL + agency.avatar.replace('/uploads', '')
                    : null,
                agentCount: hijosConProps.length,
                // Guardamos los IDs de los agentes hijos verificables para usarlos al verificar
                _verifiableChildIds: hijosConProps.map(h => h._id)
            };
        });

        // Solo las que tienen al menos 1 propiedad (la agencia o sus agentes)
        const withProps = result.filter(a => {
            const hijosIds = users
                .filter(u => u.parentId === a._id && u.isEnabled)
                .map(u => u._id);
            const agencyPropIds = [a._id, ...hijosIds];
            return publishedProps.some(p =>
                agencyPropIds.includes(p.userId) ||
                (Array.isArray(p.agents) && p.agents.some(ag => agencyPropIds.includes(ag)))
            );
        });

        // Ordenar: primero las verificadas, luego el resto
        withProps.sort((a, b) => {
            const aVerified = a.agentInfo?.verified === true ? 1 : 0;
            const bVerified = b.agentInfo?.verified === true ? 1 : 0;
            return bVerified - aVerified;
        });

        return { success: true, data: withProps };
    } catch (error) {
        console.error('Error al obtener agencias para verificación:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Actualiza el estado de verificación de una agencia y sus agentes hijos.
 * 
 * Al verificar (verified=true): verifica la agencia + agentes hijos que cumplan condiciones.
 * Al remover (verified=false): remueve verificación de la agencia + TODOS los agentes hijos.
 * 
 * @param {string} id - ID de la agencia
 * @param {boolean} verified - true para verificar, false para remover
 */
export const updateAgencyVerification = async (id, verified) => {
    try {
        const token = getToken();
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // Obtener todos los usuarios para encontrar agentes hijos
        const users = await fetchAllPages(`${API_URL}/users/list-user`, 100, { headers: { 'Authorization': `Bearer ${token}` } });

        // Encontrar la agencia
        const agency = users.find(u => u._id === id);
        if (!agency) throw new Error('Agencia no encontrada');

        // IDs a actualizar: siempre la agencia
        const idsToUpdate = [id];

        if (verified) {
            // Al verificar: solo agentes hijos que cumplan condiciones
            const publishedProps = await fetchAllPages(`${API_URL}/properties?status=published`, 100, { headers: { 'Authorization': `Bearer ${token}` } });

            const hijosVerificables = users.filter(u =>
                u.parentId === id &&
                u.isEnabled &&
                Array.isArray(u.roles) && u.roles.includes('agente') &&
                isProfileComplete(u) &&
                publishedProps.some(p =>
                    p.userId === u._id ||
                    (Array.isArray(p.agents) && p.agents.includes(u._id))
                )
            );

            hijosVerificables.forEach(h => idsToUpdate.push(h._id));
        } else {
            // Al remover: TODOS los agentes hijos (sin filtrar)
            const hijos = users.filter(u => u.parentId === id);
            hijos.forEach(h => idsToUpdate.push(h._id));
        }

        // Obtener datos actuales de cada usuario para preservar agentInfo
        const usersToUpdate = idsToUpdate.map(id => users.find(u => u._id === id)).filter(Boolean);

        // Actualizar todos en paralelo
        const results = await Promise.allSettled(
            usersToUpdate.map(user =>
                fetch(`${API_URL}/users/${user._id}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({
                        agentInfo: { ...(user.agentInfo || {}), verified }
                    })
                }).then(async res => {
                    if (!res.ok) {
                        if (res.status === 401) { clearSession(); throw new Error('Sesión expirada'); }
                        const text = await res.text();
                        let msg = `Error ${res.status}`;
                        try { msg = JSON.parse(text)?.message || msg; } catch { msg = text || msg; }
                        throw new Error(msg);
                    }
                    return res.json();
                })
            )
        );

        // Verificar si hubo errores
        const errors = results
            .filter(r => r.status === 'rejected')
            .map(r => r.reason?.message || 'Error desconocido');

        if (errors.length > 0) {
            // Si algunos fallaron pero otros no, reportamos el error
            throw new Error(`Se actualizaron ${results.length - errors.length} de ${results.length} usuarios. Errores: ${errors.join(', ')}`);
        }

        return { success: true, data: results.filter(r => r.status === 'fulfilled').map(r => r.value) };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
