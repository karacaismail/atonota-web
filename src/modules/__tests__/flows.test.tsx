import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModuleProvider, type ModuleClient } from '../runtime';
import AiOperationsPage from '../ai-operations/Page';
import AccountPage from '../account/Page';
import LeavePage from '../hr/Page';

const proposal = {
  proposal_id: 'proposal-1',
  status: 'pending',
  result: '',
  tool: 'update_record',
  preview: {
    action: 'update',
    summary: 'Kayıt başlığı değişecek.',
    changes: [{ fieldname: 'title', old: 'Eski başlık', new: 'Yeni başlık' }],
  },
  digest: 'a'.repeat(64),
  expires_at: '2099-11-23T11:00:00+03:00',
  created_at: '2026-11-23T10:00:00+03:00',
  destructive: false,
  billable: false,
};
function wrap(node: React.ReactNode, client: ModuleClient) {
  return (
    <ModuleProvider
      value={{ tenant: 'example-site', user: 'example-user', mode: 'example', client }}
    >
      {node}
    </ModuleProvider>
  );
}
afterEach(cleanup);

describe('explicit approval', () => {
  it('loads the current proposal, shows the diff and sends the reviewed digest once', async () => {
    const approve = vi.fn().mockResolvedValue({
      executed: false,
      deny_reason: 'document_changed',
      proposal: { ...proposal, status: 'rejected' },
    });
    const client = {
      listProposals: vi.fn().mockResolvedValue({ proposals: [proposal], has_next_page: false }),
      getProposal: vi.fn().mockResolvedValue({ ...proposal, digest: 'b'.repeat(64) }),
      approveProposal: approve,
    };
    render(wrap(<AiOperationsPage />, client));
    fireEvent.click(await screen.findByRole('button', { name: 'İncele' }));
    expect(await screen.findByText('Eski başlık')).toBeVisible();
    expect(screen.getByText('Yeni başlık')).toBeVisible();
    expect(approve).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Değişikliği okudum ve onaylıyorum.'));
    fireEvent.click(screen.getByRole('button', { name: 'Onayla ve uygula' }));
    await waitFor(() => expect(approve).toHaveBeenCalledTimes(1));
    expect(approve).toHaveBeenCalledWith(
      'proposal-1',
      'b'.repeat(64),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(await screen.findByText('Kayıt değişti. Yeni bir öneri gereklidir.')).toBeVisible();
  });
  it('does not offer blind retry for an unknown execution result', async () => {
    const unknown = { ...proposal, status: 'consumed', result: 'unknown' };
    const approve = vi.fn();
    render(
      wrap(<AiOperationsPage />, {
        listProposals: vi.fn().mockResolvedValue({ proposals: [unknown], has_next_page: false }),
        getProposal: vi.fn().mockResolvedValue(unknown),
        approveProposal: approve,
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'İncele' }));
    expect(await screen.findByText('İşlem sonucu bilinmiyor. Kaydı kontrol edin.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Onayla ve uygula' })).not.toBeInTheDocument();
    expect(approve).not.toHaveBeenCalled();
  });
  it('hands account deletion to the configured Press page without a cross-origin write', () => {
    render(
      <ModuleProvider
        value={{
          tenant: 'example-site',
          user: 'example-user',
          mode: 'example',
          pressOrigin: 'https://press.example.test',
        }}
      >
        <AccountPage />
      </ModuleProvider>,
    );
    expect(screen.getByRole('link', { name: 'Hesap silmeye git' })).toHaveAttribute(
      'href',
      'https://press.example.test/account-deletion',
    );
    expect(screen.queryByRole('button', { name: 'Hesap silmeyi onayla' })).not.toBeInTheDocument();
  });
  it('sends the version from the opened leave record after confirmation', async () => {
    const leave = {
      name: 'leave-1',
      status: 'Open',
      docstatus: 0,
      modified: '2026-11-23 10:00:00.000001',
    };
    const approve = vi.fn().mockResolvedValue({ name: 'leave-1' });
    render(
      wrap(<LeavePage />, {
        listLeaveApplications: vi.fn().mockResolvedValue([leave]),
        getLeaveApplication: vi.fn().mockResolvedValue(leave),
        approveLeaveApplication: approve,
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'İncele' }));
    fireEvent.click(await screen.findByLabelText('İzin talebini okudum ve onaylıyorum.'));
    fireEvent.click(screen.getByRole('button', { name: 'İzni onayla' }));
    await waitFor(() =>
      expect(approve).toHaveBeenCalledWith(
        { name: 'leave-1', version: leave.modified },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
  });
});
