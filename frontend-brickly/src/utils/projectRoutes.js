export const getProjectSlug = (projectOrId) => {
  if (!projectOrId) return '';
  if (typeof projectOrId === 'string') return projectOrId;
  return (
    projectOrId.projectSlug ||
    projectOrId.slug ||
    projectOrId._id ||
    projectOrId.id ||
    ''
  );
};

export const getTipoSlug = (tipo) => {
  const map = {
    Edificio: 'edificio',
    Bodegas: 'bodega',
    Bodega: 'bodega',
    Condominio: 'condominio',
    'Edificio de oficinas': 'edificio-de-oficinas',
    Apartamento: 'apartamento',
  };
  return map[tipo] || 'apartamento';
};

export const getProjectPath = (projectOrId, tipo) =>
  `/proyectos/${getTipoSlug(tipo || (typeof projectOrId === 'object' && projectOrId ? projectOrId.tipo : ''))}/${getProjectSlug(projectOrId)}`;

export const getModelPath = (projectOrId, modelOrSlug, tipo) =>
  `/proyectos/${getTipoSlug(tipo || (typeof projectOrId === 'object' && projectOrId ? projectOrId.tipo : ''))}/${getProjectSlug(projectOrId)}/modelo/${getModelSlug(modelOrSlug)}`;

export const getModelSlug = (modelOrSlug) => {
  if (!modelOrSlug) return '';
  if (typeof modelOrSlug === 'string') return modelOrSlug;
  return modelOrSlug.modelSlug || modelOrSlug.nombre || '';
};
