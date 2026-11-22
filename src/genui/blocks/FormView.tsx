import { CheckCircle, Lightning, XCircle } from '@phosphor-icons/react';
import { Alert, Button, Checkbox, Form, Input, Select, Tag } from 'antd';
import { useState } from 'react';

import type { FieldChange, FormBlock, FormField, FormValues, GenUIActionHandler } from '../types';
import { ChangeTable } from './ChangeTable';
import { BUSY_NOTE, FAILED_NOTE } from './ConfirmView';

type Decision = 'approved' | 'rejected';

function initialValues(fields: FormField[]): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    if (field.value !== undefined) values[field.name] = field.value;
    else values[field.name] = field.kind === 'checks' ? [] : '';
  }
  return values;
}

/** Değeri ekranda okunur metne çevirir. Seçeneklerde etiketi gösterir. */
function display(field: FormField, value: string | string[] | undefined): string {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  const labels = list.map((v) => field.options?.find((o) => o.value === v)?.label ?? v);
  return labels.join(', ');
}

function diff(fields: FormField[], before: FormValues, after: FormValues): FieldChange[] {
  return fields.map((field) => ({
    field: field.label,
    before: display(field, before[field.name]),
    after: display(field, after[field.name]),
  }));
}

/**
 * Form.Item kimliği, değeri ve değişim işlevini alt öğeye verir.
 * Bu yüzden gelen bütün özellikler denetime aktarılır.
 */
function FieldControl({
  field,
  disabled,
  ...control
}: {
  field: FormField;
  disabled: boolean;
  id?: string;
}) {
  const options = field.options ?? [];
  switch (field.kind) {
    case 'select':
      return <Select {...control} size="small" options={options} disabled={disabled} />;
    case 'checks':
      return <Checkbox.Group {...control} options={options} disabled={disabled} />;
    default:
      return <Input {...control} size="small" disabled={disabled} />;
  }
}

/**
 * Form bloğu (U4, AX-6).
 * "Kaydet" önce farkı gösterir. Değerler yalnız "Onayla ve gönder" ile gider.
 * Kaydı arka uç yapar. Arayüz kaydın sonucunu kendisi uydurmaz.
 */
export function FormView({
  block,
  onAction,
  busy = false,
}: {
  block: FormBlock;
  onAction: GenUIActionHandler;
  busy?: boolean;
}) {
  const [form] = Form.useForm<FormValues>();
  const [initial] = useState(() => initialValues(block.fields));
  const [pending, setPending] = useState<FormValues | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [failed, setFailed] = useState(false);
  const locked = decision !== null;

  const send = (next: Decision, values?: FormValues) => {
    if (locked || busy) return;
    const accepted = onAction({
      kind: 'form',
      blockId: block.id,
      decision: next,
      title: block.title,
      ...(values ? { values } : {}),
    });
    if (accepted) setDecision(next);
    setFailed(!accepted);
  };

  const tag =
    decision === 'approved'
      ? 'Onay gönderildi'
      : decision === 'rejected'
        ? 'Vazgeçildi'
        : pending
          ? 'Değişikliği kontrol edin'
          : 'Taslak, onayınızı bekliyor';

  return (
    <section data-genui="form" className="genui-card genui-form">
      <header className="genui-card-h">
        <Lightning aria-hidden />
        <strong>{block.title}</strong>
        <Tag bordered={false} className="genui-tag">
          {tag}
        </Tag>
      </header>
      <Form<FormValues>
        form={form}
        layout="vertical"
        initialValues={initial}
        onFinish={(values) => setPending(values)}
        disabled={locked || pending !== null}
        requiredMark={false}
      >
        <div className="genui-fields">
          {block.fields.map((field) => (
            <Form.Item
              key={field.name}
              name={field.name}
              label={field.label}
              rules={field.required ? [{ required: true, message: `${field.label} gerekli.` }] : []}
            >
              <FieldControl field={field} disabled={locked || pending !== null} />
            </Form.Item>
          ))}
        </div>

        {pending && !locked && (
          <div className="genui-review">
            <p className="genui-summary">Şu değişiklik gönderilecek. Kontrol edip onaylayın.</p>
            <ChangeTable changes={diff(block.fields, initial, pending)} />
          </div>
        )}

        {busy && !locked && <p className="genui-muted-text">{BUSY_NOTE}</p>}
        {failed && <Alert type="error" showIcon message={FAILED_NOTE} role="alert" />}

        {locked ? (
          <p role="status" className="genui-done-line">
            {decision === 'approved' ? (
              <CheckCircle weight="fill" aria-hidden />
            ) : (
              <XCircle weight="fill" aria-hidden />
            )}
            {decision === 'approved'
              ? 'Değerler gönderildi. Kayıt sonucunu asistan yeni mesajla bildirecek.'
              : 'Vazgeçtiniz. Hiçbir kayıt yapılmadı.'}
          </p>
        ) : pending ? (
          <div className="genui-actions">
            <Button
              size="small"
              type="primary"
              disabled={busy}
              onClick={() => send('approved', pending)}
            >
              Onayla ve gönder
            </Button>
            <Button size="small" disabled={false} onClick={() => setPending(null)}>
              Düzenlemeye dön
            </Button>
          </div>
        ) : (
          <div className="genui-actions">
            <Button size="small" type="primary" htmlType="submit" disabled={busy}>
              {block.submitLabel}
            </Button>
            <Button size="small" disabled={busy} onClick={() => send('rejected')}>
              {block.cancelLabel ?? 'Vazgeç'}
            </Button>
          </div>
        )}
      </Form>
    </section>
  );
}
