/** English source and Turkish copy for the workspace identity and task groups. */
export const workspaceMessages = {
  en: {
    identity: 'Workspace identity',
    tenant: 'Tenant',
    environment: 'Environment',
    mode: 'Mode',
    example: 'Test',
    live: 'Live',
    pending: 'Checking',
    unknownTenant: 'Not available',
    review: 'Review and approve',
    people: 'Human resources',
    management: 'Administration',
  },
  tr: {
    identity: 'Kimlik şeridi',
    tenant: 'Kiracı',
    environment: 'Ortam',
    mode: 'Kip',
    example: 'Deneme',
    live: 'Canlı',
    pending: 'Doğrulanıyor',
    unknownTenant: 'Bilgi yok',
    review: 'Bakmak ve onaylamak',
    people: 'İnsan kaynakları',
    management: 'Yönetim',
  },
} as const;

export const workspaceText = workspaceMessages.tr;
