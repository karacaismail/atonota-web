import type { ApiClient } from '../api';
import type { ModuleClient } from './runtime';

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
    // Bağlı hesap istemcisi ayrı parçadadır. Yalnız hesap sayfası açılınca yüklenir.
    linkedAccounts: () => import('../api/login-client').then((m) => m.createLoginClient(api)),
    // Sağlayıcı istemcisi ayrı parçadadır. Yalnız sayfa açılınca yüklenir (ilk yük bütçesi).
    aiProviders: () => import('../api/provider-client').then((m) => m.createProviderClient(api)),
    // Bayi istemcisi ayrı parçadadır. Yalnız "Müşteriler" sayfası açılınca yüklenir.
    resellers: () => import('../api/reseller-client').then((m) => m.createResellerClient(api)),
  };
}
