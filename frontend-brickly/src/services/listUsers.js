import { API_URL, getToken } from '../services/authService';
import { fetchAllPages } from '../utils/fetchAll';

export const getUsers = async (params = {}) => {
    try {
        const token = getToken();
        // Construir query string con los parámetros
        const queryParams = Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
        const queryString = queryParams ? `?${queryParams}` : '';
        const url = `${API_URL}/users/list-user${queryString}`;
        const data = await fetchAllPages(url, 100, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return { success: true, data };

    } catch (error) {
        console.error('❌ [getUsers] Error:', error.message);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Obtiene UNA página de usuarios desde /users/list-user.
 * Se usa en tablas server-side para evitar descargar todos los usuarios.
 */
export const getUsersPaginados = async (params = {}) => {
    try {
        const token = getToken();
        const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && value !== '') acc[key] = value;
            return acc;
        }, {});
        const queryString = new URLSearchParams(cleanParams).toString();
        const response = await fetch(`${API_URL}/users/list-user${queryString ? `?${queryString}` : ''}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status} al cargar usuarios`);

        const result = await response.json();
        const data = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];

        return {
            success: true,
            data: {
                data,
                total: result?.total ?? data.length,
                page: result?.page ?? Number(cleanParams.page || 1),
                limit: result?.limit ?? Number(cleanParams.limit || data.length || 10),
                totalPages: result?.totalPages ?? 1,
            }
        };
    } catch (error) {
        console.error('❌ [getUsersPaginados] Error:', error.message);
        return {
            success: false,
            error: error.message,
            data: { data: [], total: 0, page: 1, limit: Number(params.limit || 10), totalPages: 1 }
        };
    }
};


/**
 * Obtiene todas las agencias que tienen al menos 1 propiedad publicada.
 * La API ya filtra por hasProperty=published y roles=agencia.
 */
export const getAgenciesWithProperties = async () => {
    try {
        const agencies = await fetchAllPages(`${API_URL}/users/list-user?hasProperty=published&roles=agencia`);

        const agenciesCounts = await Promise.all(
            agencies.map(async (agency) => {
                try {
                    const response = await fetch(`${API_URL}/properties/count/total/${agency._id}`);
                    if (!response.ok) throw new Error(`Error ${response.status}`);
                    const countData = await response.json();
                    return {
                        agencyId: agency._id,
                        totalProperties: Number(countData?.total || 0),
                        totalPublished: Number(countData?.totalPublished || 0)
                    };
                } catch (error) {
                    console.error(`Error al obtener conteo de propiedades para agencia ${agency._id}:`, error.message);
                    return {
                        agencyId: agency._id,
                        totalProperties: Number(agency.totalProperties || agency.propCount || 0),
                        totalPublished: Number(agency.totalPublished || agency.propCount || 0)
                    };
                }
            })
        );

        const countsMap = agenciesCounts.reduce((acc, item) => {
            acc[item.agencyId] = item;
            return acc;
        }, {});

        // Solo formatear URLs de avatar y datos de visualización
        const result = agencies.map(agency => {
            const agencyCount = countsMap[agency._id] || {};
            const clicks = parseInt(agency.clickCounter) || 0;
            const formattedClicks = clicks >= 1000000
                ? (clicks / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
                : clicks >= 1000
                    ? (clicks / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
                    : String(clicks);

            return {
                ...agency,
                totalProperties: agencyCount.totalProperties ?? agency.totalProperties,
                totalPublished: agencyCount.totalPublished ?? agency.totalPublished,
                avatarUrl: agency.avatar
                    ? API_URL + agency.avatar.replace('/uploads', '')
                    : null,
                clickCounter: formattedClicks
            };
        });

        return result;
    } catch (error) {
        console.error('Error al obtener agencias:', error);
        return [];
    }
};

/**
 * Obtiene arquitectos con perfil completo, al menos 1 proyecto publicado
 * y un proyecto favorito seleccionado.
 */
export const getArchitectsWithProjects = async () => {
    try {
        const [users, allProjects] = await Promise.all([
            fetchAllPages(`${API_URL}/users/list-user`),
            fetchAllPages(`${API_URL}/projects`)
        ]);

        const publishedProjects = allProjects.filter(p => p.status === 'published');

        // Filtrar arquitectos con perfil completo
        const architects = users.filter(u =>
            u.isEnabled &&
            Array.isArray(u.roles) && u.roles.includes('arquitecto') &&
            !!u.agentInfo?.favoriteProject
        );

        // Solo los que tengan al menos 1 proyecto publicado
        return architects.filter(arch => {
            const userProjects = publishedProjects.filter(p => p.userId === arch._id);
            return userProjects.length > 0;
        });
    } catch (error) {
        console.error('Error al obtener arquitectos:', error);
        return [];
    }
};