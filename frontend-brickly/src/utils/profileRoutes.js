export const getProfileSlug = (userOrId) => {
  if (!userOrId) return '';
  if (typeof userOrId === 'string') return userOrId;
  return userOrId.profileSlug || userOrId.slug || userOrId._id || userOrId.id || '';
};

export const getAgentProfilePath = (userOrId) => `/agentes/${getProfileSlug(userOrId)}`;

export const getAgencyProfilePath = (userOrId) => `/agencias/${getProfileSlug(userOrId)}`;

export const getArchitectProfilePath = (userOrId) => `/arquitectos/${getProfileSlug(userOrId)}`;

export const getUserProfilePath = (userOrId) => {
  const roles = Array.isArray(userOrId?.roles) ? userOrId.roles : [userOrId?.roles].filter(Boolean);

  if (userOrId?._isAgency || roles.includes('agencia')) return getAgencyProfilePath(userOrId);
  if (roles.includes('arquitecto')) return getArchitectProfilePath(userOrId);

  return getAgentProfilePath(userOrId);
};
