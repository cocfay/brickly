/**
 * Verifica si el perfil de un usuario está completo según su rol.
 *
 * Agente / Arquitecto requieren: name, phone, avatar, description,
 *   specialization, expe, address, languages
 *
 * Agencia requiere: name, phone, avatar, description, expe, address
 *
 * @param {object} user - objeto de usuario (de getCurrentUser o API)
 * @returns {boolean}
 */
export const isProfileComplete = (user) => {
    if (!user) return false;

    const roles = Array.isArray(user.roles) ? user.roles : [user.roles];

    const isAgencia        = roles.includes('agencia');
    const isAgente         = roles.includes('agente');
    const isArquitecto     = roles.includes('arquitecto');
    const isDesarrolladora = roles.includes('desarrolladora');

    if (!isAgencia && !isAgente && !isArquitecto && !isDesarrolladora) return true; // otros roles no requieren validación

    // Campos comunes a todos los roles con perfil extendido
    const baseOk =
        !!user.name &&
        !!user.phone &&
        !!user.avatar &&
        !!user.agentInfo?.description &&
        !!user.agentInfo?.address;



    if (!baseOk) return false;

    // Campos exclusivos de agente
    if (isAgente) {
        return (
            !!user.agentInfo?.specialization &&
            user.agentInfo?.expe !== '' && user.agentInfo?.expe !== undefined && user.agentInfo?.expe !== null &&
            Array.isArray(user.agentInfo?.languages) &&
            user.agentInfo.languages.length > 0
        );
    }

    // Campos exclusivos de arquitecto
    if (isArquitecto) {
        return (
            !!user.agentInfo?.shortDescription &&
            user.agentInfo?.premios !== '' &&
            user.agentInfo?.premios !== undefined &&
            user.agentInfo?.premios !== null &&
            user.agentInfo?.expe !== '' && user.agentInfo?.expe !== undefined && user.agentInfo?.expe !== null &&
            Array.isArray(user.agentInfo?.categoria) &&
            user.agentInfo.categoria.length > 0
        );
    }



    // Agencia: requiere también años de experiencia y logo
    if (isAgencia) {
        return (
            user.agentInfo?.expe !== '' && user.agentInfo?.expe !== undefined && user.agentInfo?.expe !== null &&
            !!user.agentInfo?.logo
        );
    }

    // Desarrolladora: requiere años de experiencia, proyectos desarrollados, unidades vendidas y logo
    if (isDesarrolladora) {
        return (
            user.agentInfo?.expe !== '' && user.agentInfo?.expe !== undefined && user.agentInfo?.expe !== null &&
            !!user.agentInfo?.proyectosDesarrollados &&
            !!user.agentInfo?.unidadesVendidas &&
            !!user.agentInfo?.logo
        );
    }

    return true;
};

/**
 * Devuelve true si el usuario tiene un rol que requiere perfil extendido.
 */
export const requiresExtendedProfile = (user) => {
    if (!user) return false;
    const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
    return roles.includes('agente') || roles.includes('arquitecto') || roles.includes('agencia') || roles.includes('desarrolladora');
};
