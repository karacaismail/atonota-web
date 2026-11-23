import type { ApiClient } from '../api';
import type { ModuleClient } from './runtime';

/** The shared client owns transport, CSRF, authentication, validation and error translation. */
export function createModuleClient(api: ApiClient): ModuleClient {
  return {
    getProfile: async (options) => {
      const { user } = await api.getBootstrap(options);
      return { name: user.name, fullName: user.full_name, roles: user.roles };
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
  };
}
