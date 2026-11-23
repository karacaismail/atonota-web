import { describe, expect, it, vi } from 'vitest';
import { createApiClient, createCsrfStore, readApiConfig } from '@/api';
import { createModuleClient } from '../client';

describe('shared API adapter', () => {
  it.each([undefined, true] as const)(
    'preserves the profile truncation flag %s',
    async (truncated) => {
      const api = createApiClient({
        config: readApiConfig({}, 'https://example.test'),
        csrf: createCsrfStore(),
      });
      const { sampleBootstrap } = await import('@/mocks');
      vi.spyOn(api, 'getBootstrap').mockResolvedValue(
        truncated ? { ...sampleBootstrap, truncated } : sampleBootstrap,
      );
      const client = createModuleClient(api);
      expect(await client.getProfile?.({})).toEqual({
        name: sampleBootstrap.user.name,
        fullName: sampleBootstrap.user.full_name,
        roles: sampleBootstrap.user.roles,
        truncated,
      });
    },
  );
  it('requests visible leave fields with stable server-side paging', async () => {
    const api = createApiClient({
      config: readApiConfig({}, 'https://example.test'),
      csrf: createCsrfStore(),
    });
    const list = vi.spyOn(api, 'listLeaveApplications').mockResolvedValue([]);
    const client = createModuleClient(api);
    const signal = new AbortController().signal;
    await client.listLeaveApplications?.(
      { limit_start: 20, limit_page_length: 20, order_by: 'modified desc, name asc' },
      { signal },
    );
    expect(list).toHaveBeenCalledWith(
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
        start: 20,
        pageLength: 20,
        orderBy: 'modified desc, name asc',
      },
      { signal },
    );
  });
  it('passes the original version to the common write client', async () => {
    const api = createApiClient({
      config: readApiConfig({}, 'https://example.test'),
      csrf: createCsrfStore(),
    });
    const approve = vi.spyOn(api, 'approveLeave').mockResolvedValue({ name: 'example-leave' });
    const client = createModuleClient(api);
    const signal = new AbortController().signal;
    await client.approveLeaveApplication?.(
      { name: 'example-leave', version: '2026-11-23 10:00:00.000001' },
      { signal },
    );
    expect(approve).toHaveBeenCalledWith('example-leave', '2026-11-23 10:00:00.000001', { signal });
  });
});
