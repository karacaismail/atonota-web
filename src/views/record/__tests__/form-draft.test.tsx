import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RecordView } from '../RecordView';
import { LEAVE_CONTEXT, LEAVE_META } from '../harness/leaveFixture';
import type { DocTypeMeta, RecordDataAdapter } from '../types';
import { validateRecordDraft } from '../validation';

function adapterFor(withContext = true, meta: DocTypeMeta = LEAVE_META): RecordDataAdapter {
  return {
    getDocTypeMeta: vi.fn(async () => meta),
    getRecord: vi.fn(async () => ({ name: 'SAMPLE-LEAVE-1' })),
    saveRecord: vi.fn(async () => ({ name: 'SAMPLE-LEAVE-1' })),
    searchLink: vi.fn(async () => []),
    getNewRecordContext: withContext ? vi.fn(async () => LEAVE_CONTEXT) : undefined,
  };
}

function renderLeave(onCancel?: () => void, withContext = true) {
  return render(
    <RecordView
      doctype="Leave Application"
      title="Yeni izin talebi"
      saveActionLabel="Talebi gönder"
      createMode
      adapter={adapterFor(withContext)}
      {...(onCancel ? { onCancel } : {})}
    />,
  );
}

describe('leave form matches the approved draft', () => {
  it('writes required errors as short instructions', () => {
    const errors = validateRecordDraft(LEAVE_META, {}, 'tr');
    expect(errors['leave_type']).toBe('İzin türünü seçin.');
    expect(errors['from_date']).toBe('Başlangıç tarihini yazın.');
    expect(errors['to_date']).toBe('Bitiş tarihini yazın.');
  });

  it('keeps a grammatical instruction when the label ends with a consonant', () => {
    const meta: DocTypeMeta = {
      ...LEAVE_META,
      schema: {
        ...LEAVE_META.schema,
        fields: [
          {
            fieldname: 'department',
            fieldtype: 'Link',
            label: 'Departman',
            options: 'Department',
            component: 'link-select',
            read_only: false,
            reqd: true,
            sensitivity: 'standard',
          },
          {
            fieldname: 'city',
            fieldtype: 'Data',
            label: 'Şehir',
            component: 'input',
            read_only: false,
            reqd: true,
            sensitivity: 'standard',
          },
        ],
      },
    };
    const errors = validateRecordDraft(meta, {}, 'tr');
    expect(errors['department']).toBe('Departman alanından seçim yapın.');
    expect(errors['city']).toBe('Şehir alanını doldurun.');
  });

  it('shows "Seçin" in an empty select', async () => {
    renderLeave(undefined, false);
    const type = await screen.findByRole('combobox', { name: /İzin türü/ });
    const select = type.closest('.ant-select');
    expect(select).not.toBeNull();
    expect(within(select as HTMLElement).getByText('Seçin')).toBeInTheDocument();
  });

  it('shows name and balance as read-only text with their label and source note', async () => {
    const { container } = renderLeave();
    const name = await screen.findByRole('textbox', { name: 'Ad' });
    expect(name.tagName).not.toBe('INPUT');
    expect(name).toHaveAttribute('aria-readonly', 'true');
    expect(name).toHaveTextContent('Örnek Kişi 1');
    expect(name).toHaveAccessibleDescription('Personel kaydından geldi.');
    const balance = screen.getByRole('textbox', { name: 'Kalan yıllık izin' });
    expect(balance.tagName).not.toBe('INPUT');
    expect(balance).toHaveTextContent('8,5 gün');
    expect(balance).toHaveAccessibleDescription('İzin kayıtlarından hesaplandı.');
    for (const fieldname of ['employee_name', 'leave_balance']) {
      const field = container.querySelector(`[data-fieldname="${fieldname}"]`);
      expect(field?.querySelector('input')).toBeNull();
      // The source note stays below the value.
      const note = field?.querySelector('.rv-field-source');
      const value = field?.querySelector('[aria-readonly="true"]');
      expect(note && value && value.compareDocumentPosition(note)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }
  });

  it('marks an empty date input so it can look empty', async () => {
    renderLeave();
    const start = await screen.findByLabelText(/Başlangıç tarihi/);
    expect(start).toHaveAttribute('data-empty', 'true');
  });

  it('puts "Vazgeç" and the submit button below the form', async () => {
    const onCancel = vi.fn();
    const { container } = renderLeave(onCancel);
    await screen.findByRole('textbox', { name: 'Ad' });
    const actions = container.querySelector('.rv-form-actions');
    expect(actions).not.toBeNull();
    const buttons = within(actions as HTMLElement).getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['Vazgeç', 'Talebi gönder']);
    expect(screen.getAllByRole('button', { name: 'Talebi gönder' })).toHaveLength(1);
    const lastSection = container.querySelectorAll('.rv-section-card');
    expect(
      lastSection[lastSection.length - 1]?.compareDocumentPosition(actions as HTMLElement),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('leaves without saving when nothing changed', async () => {
    const onCancel = vi.fn();
    renderLeave(onCancel);
    await screen.findByRole('textbox', { name: 'Ad' });
    await userEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('asks before leaving with unsaved changes', async () => {
    const onCancel = vi.fn();
    renderLeave(onCancel);
    const description = await screen.findByLabelText('Açıklama');
    await userEvent.type(description, 'Örnek açıklama');
    await userEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
    expect(onCancel).not.toHaveBeenCalled();
    const guard = screen.getByRole('alert');
    expect(guard).toHaveTextContent('Kaydedilmemiş değişiklikleriniz var.');
    await userEvent.click(within(guard).getByRole('button', { name: 'Düzenlemeye devam et' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(description).toHaveValue('Örnek açıklama');
    await userEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
    await userEvent.click(
      within(screen.getByRole('alert')).getByRole('button', { name: 'Kaydetmeden çık' }),
    );
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
