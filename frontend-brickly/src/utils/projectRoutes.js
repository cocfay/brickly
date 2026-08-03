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

export const getProjectPath = (projectOrId) =>
  `/proyectos/apartamento/${getProjectSlug(projectOrId)}`;

export const getModelPath = (projectOrId, modelOrSlug) =>
  `/proyectos/apartamento/${getProjectSlug(projectOrId)}/modelo/${getModelSlug(modelOrSlug)}`;

export const getModelSlug = (modelOrSlug) => {
  if (!modelOrSlug) return '';
  if (typeof modelOrSlug === 'string') return modelOrSlug;
  return modelOrSlug.modelSlug || modelOrSlug.nombre || '';
};
