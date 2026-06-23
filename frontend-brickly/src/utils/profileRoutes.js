export const getProfileSlug = (userOrId) => {
  if (!userOrId) return '';
  if (typeof userOrId === 'string') return userOrId;
  return userOrId.profileSlug || userOrId.slug || userOrId._id || userOrId.id || '';
};

const normalizePathSlug = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-{2,}/g, '-');

export const getAgentProfilePath = (userOrId) => {
  const agentSlug = getProfileSlug(userOrId);
  const agency = userOrId?.agencia || userOrId?.agency;
  const agencySlug = typeof agency === 'string'
    ? normalizePathSlug(agency)
    : getProfileSlug(agency) || normalizePathSlug(agency?.name);

  return agencySlug ? `/agentes/${agencySlug}/${agentSlug}` : `/agentes/${agentSlug}`;
};

export const getAgencyProfilePath = (userOrId) => `/agencias/${getProfileSlug(userOrId)}`;

export const getArchitectProfilePath = (userOrId) => `/arquitectos/${getProfileSlug(userOrId)}`;

export const getUserProfilePath = (userOrId) => {
  const roles = Array.isArray(userOrId?.roles) ? userOrId.roles : [userOrId?.roles].filter(Boolean);

  if (userOrId?._isAgency || roles.includes('agencia')) return getAgencyProfilePath(userOrId);
  if (roles.includes('arquitecto')) return getArchitectProfilePath(userOrId);

  return getAgentProfilePath(userOrId);
};
