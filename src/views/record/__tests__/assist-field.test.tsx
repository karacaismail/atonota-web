import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RecordView } from '../RecordView';
import { LEAVE_META } from '../harness/leaveFixture';
import type { DocField, DocTypeMeta, RecordAssistRequest, RecordDataAdapter } from '../types';

const ASSIST = 'Yardımcıyla yaz';

const extra = (fieldname: string, fieldtype: string, component: string, more = {}): DocField => ({
  fieldname,
  fieldtype,
  label: `Örnek ${fieldname}`,
  component,
  read_only: false,
  sensitivity: 'standard',
  ...more,
});

const MIXED_META: DocTypeMeta = {
  ...LEAVE_META,
  schema: {
    ...LEAVE_META.schema,
    fields: [
      ...LEAVE_META.schema.fields,
      extra('note_data', 'Data', 'input'),
      extra('note_code', 'Code', 'code'),
      extra('note_text', 'Text', 'text-area'),
      extra('note_long', 'Long Text', 'text-area'),
      extra('note_editor', 'Text Editor', 'text-editor'),
      extra('note_locked', 'Long Text', 'text-area', { read_only: true }),
    ],
  },
};

function renderForm(
  onAssistField?: (request: RecordAssistRequest) => void,
  meta: DocTypeMeta = MIXED_META,
) {
  const adapter: RecordDataAdapter = {
    getDocTypeMeta: vi.fn(async () => meta),
    getRecord: vi.fn(async () => ({ name: 'SAMPLE-LEAVE-1' })),
    saveRecord: vi.fn(async () => ({ name: 'SAMPLE-LEAVE-1' })),
    searchLink: vi.fn(async () => []),
  };
  const view = render(
    <RecordView
      doctype={meta.schema.name}
      createMode
      adapter={adapter}
      {...(onAssistField ? { onAssistField } : {})}
    />,
  );
  return { ...view, adapter };
}

function fieldBox(container: HTMLElement, fieldname: string): HTMLElement {
  const box = container.querySelector<HTMLElement>(`.rv-field[data-fieldname="${fieldname}"]`);
  if (!box) throw new Error(`Missing field ${fieldname}`);
  return box;
}

describe('field assistant button', () => {
  it('shows exactly one button on each editable long text field only', async () => {
    const { container } = renderForm(vi.fn());
    await screen.findByRole('combobox', { name: /İzin türü/ });
    for (const name of ['description', 'note_text', 'note_long', 'note_editor']) {
      expect(
        within(fieldBox(container, name)).getAllByRole('button', { name: ASSIST }),
      ).toHaveLength(1);
    }
    for (const name of [
      'employee_name',
      'leave_type',
      'from_date',
      'to_date',
      'note_data',
      'note_code',
      'note_locked',
    ]) {
      expect(
        within(fieldBox(container, name)).queryByRole('button', { name: ASSIST }),
      ).not.toBeInTheDocument();
    }
  });

  it('never renders two assistant buttons in one field', async () => {
    const { container } = renderForm(vi.fn());
    await screen.findByRole('combobox', { name: /İzin türü/ });
    const fields = [...container.querySelectorAll<HTMLElement>('.rv-field')];
    expect(fields.length).toBeGreaterThan(5);
    for (const box of fields) {
      expect(within(box).queryAllByRole('button', { name: ASSIST }).length).toBeLessThanOrEqual(1);
    }
    expect(screen.getAllByRole('button', { name: ASSIST })).toHaveLength(4);
  });

  it('hides the button when no onAssistField handler is given', async () => {
    renderForm();
    await screen.findByRole('combobox', { name: /İzin türü/ });
    expect(screen.queryByRole('button', { name: ASSIST })).not.toBeInTheDocument();
  });

  it('only raises an event and never changes the field value', async () => {
    const user = userEvent.setup();
    const onAssistField = vi.fn();
    const { container, adapter } = renderForm(onAssistField, LEAVE_META);
    const text = await screen.findByLabelText('Açıklama');
    fireEvent.change(text, { target: { value: 'Örnek metin' } });
    const button = within(fieldBox(container, 'description')).getByRole('button', {
      name: ASSIST,
    });
    expect(button).toHaveAttribute('type', 'button');
    expect(button.getAttribute('aria-describedby')?.split(' ')).toContain(
      text.getAttribute('aria-labelledby'),
    );
    await user.click(button);
    button.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onAssistField).toHaveBeenCalledTimes(3);
    expect(onAssistField).toHaveBeenLastCalledWith({
      doctype: 'Leave Application',
      fieldname: 'description',
      label: 'Açıklama',
      value: 'Örnek metin',
    });
    expect(text).toHaveValue('Örnek metin');
    expect(adapter.saveRecord).not.toHaveBeenCalled();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
