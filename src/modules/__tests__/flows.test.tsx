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
  it.each([
    ['expired', 'Onay süresi doldu.'],
    ['not_pending', 'Bu öneri artık onay beklemiyor.'],
    ['digest_mismatch', 'Öneriyi doğrulayamadık. İncelemeyi kapatıp yeniden açın.'],
    ['permission', 'Bu işlem için yetkiniz yok.'],
    ['execution_failed', 'İşlem tamamlanamadı.'],
    [null, 'Sunucu işlemi başlattı. İşlem tamamlanamadı.'],
  ])('explains approval outcome %s', async (reason, message) => {
    render(
      wrap(<AiOperationsPage />, {
        listProposals: vi.fn().mockResolvedValue({ proposals: [proposal], has_next_page: false }),
        getProposal: vi.fn().mockResolvedValue(proposal),
        approveProposal: vi.fn().mockResolvedValue({
          executed: reason === null,
          deny_reason: reason,
          proposal:
            reason === null ? { ...proposal, status: 'consumed', result: 'failed' } : proposal,
        }),
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'İncele' }));
    fireEvent.click(await screen.findByLabelText('Değişikliği okudum ve onaylıyorum.'));
    fireEvent.click(screen.getByRole('button', { name: 'Onayla ve uygula' }));
    expect(await screen.findByText(message)).toBeVisible();
  });

  it('explains why roles are missing from a shortened profile', async () => {
    render(
      wrap(<AccountPage />, {
        getProfile: vi.fn().mockResolvedValue({
          name: 'example-user',
          fullName: 'Örnek Kişi',
          roles: [],
          truncated: true,
        }),
      }),
    );
    expect(await screen.findByText('Sunucu rol listesini kısalttı.')).toBeVisible();
  });

  it('shows a fallback when a leave list entry has no employee name', async () => {
    render(
      wrap(<LeavePage />, {
        listLeaveApplications: vi.fn().mockResolvedValue([{ name: 'leave-1', status: 'Open' }]),
      }),
    );
    expect(await screen.findByText('Bilgi verilmedi')).toBeVisible();
  });

  it('does not offer a write for an invalid leave version', async () => {
    const leave = { name: 'leave-1', status: 'Open', docstatus: 0, modified: 'x'.repeat(41) };
    const approve = vi.fn();
    render(
      wrap(<LeavePage />, {
        listLeaveApplications: vi.fn().mockResolvedValue([leave]),
        getLeaveApplication: vi.fn().mockResolvedValue(leave),
        approveLeaveApplication: approve,
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'İncele' }));
    expect(
      await screen.findByText('Kayıt sürümü eksik veya geçersiz. Kaydı yeniden okuyun.'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'İzni onayla' })).not.toBeInTheDocument();
    expect(approve).not.toHaveBeenCalled();
  });
  it.each(['approve', 'reject'] as const)('rejects a mismatched %s response', async (operation) => {
    const different = {
      ...proposal,
      proposal_id: 'another-proposal',
      status: operation === 'approve' ? 'consumed' : 'rejected',
      result: operation === 'approve' ? 'succeeded' : '',
    };
    render(
      wrap(<AiOperationsPage />, {
        listProposals: vi.fn().mockResolvedValue({ proposals: [proposal], has_next_page: false }),
        getProposal: vi.fn().mockResolvedValue(proposal),
        approveProposal: vi.fn().mockResolvedValue({ executed: true, proposal: different }),
        rejectProposal: vi.fn().mockResolvedValue(different),
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'İncele' }));
    fireEvent.click(await screen.findByLabelText('Değişikliği okudum ve onaylıyorum.'));
    fireEvent.click(
      screen.getByRole('button', {
        name: operation === 'approve' ? 'Onayla ve uygula' : 'Öneriyi reddet',
      }),
    );
    expect(
      await screen.findByText('İşlem sonucu bilinmiyor. Yeni istekten önce kaydı yeniden okuyun.'),
    ).toBeVisible();
  });
  it('distinguishes null values from empty text in the review', async () => {
    render(
      wrap(<AiOperationsPage />, {
        listProposals: vi.fn().mockResolvedValue({ proposals: [proposal], has_next_page: false }),
        getProposal: vi.fn().mockResolvedValue({
          ...proposal,
          preview: { ...proposal.preview, changes: [{ fieldname: 'title', old: null, new: '' }] },
        }),
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'İncele' }));
    expect(await screen.findByText('Değer yok')).toBeVisible();
    expect(screen.getByText('Boş metin')).toBeVisible();
  });
  it('does not confuse a display name with the Frappe user identifier', async () => {
    render(
      wrap(<AccountPage />, {
        getProfile: vi
          .fn()
          .mockResolvedValue({ name: 'Örnek Kişi', fullName: 'Örnek Kişi', roles: [] }),
      }),
    );
    expect(await screen.findByText('Sunucunun yanıtı doğrulanamadı.')).toBeVisible();
    expect(screen.queryByText('Örnek Kişi')).not.toBeInTheDocument();
  });
  it('loads only the signed-in profile from the shared client', async () => {
    render(
      wrap(<AccountPage />, {
        getProfile: vi.fn().mockResolvedValue({
          name: 'example-user',
          fullName: 'Örnek Kişi',
          roles: ['Örnek rol'],
        }),
      }),
    );
    expect(await screen.findByText('Örnek Kişi')).toBeVisible();
    expect(screen.getByText('Örnek rol')).toBeVisible();
  });
  it('rejects a detail response for a different proposal', async () => {
    render(
      wrap(<AiOperationsPage />, {
        listProposals: vi.fn().mockResolvedValue({ proposals: [proposal], has_next_page: false }),
        getProposal: vi.fn().mockResolvedValue({ ...proposal, proposal_id: 'another-proposal' }),
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'İncele' }));
    expect(await screen.findByText('Sunucunun yanıtı doğrulanamadı.')).toBeVisible();
    expect(screen.queryByLabelText('Değişikliği okudum ve onaylıyorum.')).not.toBeInTheDocument();
  });
  it('shows a server-confirmed pending deletion without offering another request', () => {
    render(
      <ModuleProvider
        value={{
          tenant: 'site',
          user: 'user',
          mode: 'example',
          pressOrigin: 'https://press.example.test',
          accountDeletionStatus: { pending: true },
        }}
      >
        <AccountPage />
      </ModuleProvider>,
    );
    expect(screen.getByText('Silme sürüyor. Sonuç henüz doğrulanmadı.')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Hesap silmeye git' })).not.toBeInTheDocument();
  });
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

/** MVP denetimi: süresi geçmiş öneri listede "Süresi doldu" yazar ve onaylanamaz. */
describe('süresi geçmiş öneri', () => {
  const stale = { ...proposal, expires_at: '2000-01-01T00:00:00+03:00' };

  it('listede "Süresi doldu" durumuyla görünür', async () => {
    render(
      wrap(<AiOperationsPage />, {
        listProposals: vi.fn().mockResolvedValue({ proposals: [stale], has_next_page: false }),
      }),
    );
    expect(await screen.findByText('Süresi doldu')).toBeVisible();
    expect(screen.queryByText('Onay bekliyor')).toBeNull();
  });

  it('incelemede onay düğmesi yoktur', async () => {
    render(
      wrap(<AiOperationsPage />, {
        listProposals: vi.fn().mockResolvedValue({ proposals: [stale], has_next_page: false }),
        getProposal: vi.fn().mockResolvedValue(stale),
        approveProposal: vi.fn(),
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'İncele' }));
    expect(await screen.findByText('Bu öneri onaylanamaz. Güncel öneriyi yeniden okuyun.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Onayla ve uygula' })).toBeNull();
  });
});
