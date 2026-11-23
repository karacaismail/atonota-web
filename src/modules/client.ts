import type { ApiClient } from '../api';
import type { ModuleClient } from './runtime';

/** Arka uçtaki kayıt türleri (model geçidi). */
const AI_DOCTYPES = {
  api: 'PLT AI API',
  account: 'PLT AI Account',
  provider: 'PLT AI Provider',
} as const;
/** Okunan alanlar. Parola alanı (`api_key`) bu listede hiç yoktur. */
const AI_FIELDS = {
  api: ['name', 'api_name', 'account', 'connection_status', 'connection_checked_at'],
  account: ['name', 'account_name', 'provider'],
  provider: ['name', 'provider_name', 'catalog_provider'],
};
/** Liste ucunun en büyük sayfası. Daha çok bağlantı MVP kapsamında beklenmez. */
const AI_LIST_LIMIT = 100;

/** The shared client owns transport, CSRF, authentication, validation and error translation. */
export function createModuleClient(api: ApiClient): ModuleClient {
  return {
    getProfile: async (options) => {
      const { user, truncated } = await api.getBootstrap(options);
      return { name: user.name, fullName: user.full_name, roles: user.roles, truncated };
    },
    listLeaveApplications: (query, options) =>
      api.listLeaveApplications(
        {
          fields: [
            'name',
            'employee_name',
            'leave_type',
            'from_date',
            'to_date',
            'status',
            'docstatus',
            'modified',
            'total_leave_days',
          ],
          start: query.limit_start,
          pageLength: query.limit_page_length,
          orderBy: query.order_by,
        },
        options,
      ),
    getLeaveApplication: (name, options) => api.getLeaveApplication(name, options),
    approveLeaveApplication: (body, options) => api.approveLeave(body.name, body.version, options),
    cancelLeaveApplication: (body, options) => api.cancelLeave(body.name, body.version, options),
    explainPermission: (query, options) => api.explainPermission(query, options),
    listProposals: (query, options) => api.listProposals(query, options),
    getProposal: (id, options) => api.getProposal(id, options),
    approveProposal: (id, digest, options) => api.approveProposal(id, digest, options),
    rejectProposal: (id, options) => api.rejectProposal(id, options),
    listProviderCatalog: (options) => api.listProviderCatalog(options),
    listAiConnections: async (options) => {
      const read = (kind: keyof typeof AI_DOCTYPES, orderBy: string) =>
        api
          .listDocuments(
            AI_DOCTYPES[kind],
            { fields: AI_FIELDS[kind], orderBy, limit: AI_LIST_LIMIT },
            options,
          )
          .then((page) => page.data);
      const [apis, accounts, providers] = await Promise.all([
        read('api', 'modified desc'),
        read('account', 'name asc'),
        read('provider', 'name asc'),
      ]);
      return { apis, accounts, providers };
    },
    saveProviderConnection: (input, options) => api.saveProviderConnection(input, options),
    checkProviderConnection: (name, options) => api.checkProviderConnection(name, options),
  };
}
