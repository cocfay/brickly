export const getPropertySlug = (propertyOrId) => {
  if (!propertyOrId) return '';
  if (typeof propertyOrId === 'string') return propertyOrId;
  return propertyOrId.propertySlug || propertyOrId.slug || propertyOrId._id || propertyOrId.id || '';
};

export const getPropertyPath = (propertyOrId) => `/propiedades/${getPropertySlug(propertyOrId)}`;
