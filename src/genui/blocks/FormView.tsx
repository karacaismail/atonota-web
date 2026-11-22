import { CheckCircle, Lightning, XCircle } from '@phosphor-icons/react';
import { Button, Checkbox, Form, Input, Select, Tag } from 'antd';
import { useState } from 'react';

import type { FormBlock, FormField, FormValues, GenUIAction } from '../types';

type Decision = 'approved' | 'rejected';

function initialValues(fields: FormField[]): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    if (field.value !== undefined) values[field.name] = field.value;
    else values[field.name] = field.kind === 'checks' ? [] : '';
  }
  return values;
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
 * Form bloğu (U4). Değerler yalnız kullanıcı "Kaydet" düğmesine basınca gider.
 * Kaydı arka uç yapar. Arayüz kaydın sonucunu kendisi uydurmaz.
 */
export function FormView({
  block,
  onAction,
}: {
  block: FormBlock;
  onAction: (action: GenUIAction) => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const [decision, setDecision] = useState<Decision | null>(null);
  const locked = decision !== null;

  const submit = (values: FormValues) => {
    if (locked) return;
    setDecision('approved');
    onAction({ kind: 'form', blockId: block.id, decision: 'approved', title: block.title, values });
  };

  const cancel = () => {
    if (locked) return;
    setDecision('rejected');
    onAction({ kind: 'form', blockId: block.id, decision: 'rejected', title: block.title });
  };

  return (
    <section data-genui="form" className="genui-card genui-form">
      <header className="genui-card-h">
        <Lightning aria-hidden />
        <strong>{block.title}</strong>
        <Tag bordered={false} className="genui-tag">
          {decision === 'approved'
            ? 'Onay gönderildi'
            : decision === 'rejected'
              ? 'Vazgeçildi'
              : 'Taslak, onayınızı bekliyor'}
        </Tag>
      </header>
      <Form<FormValues>
        form={form}
        layout="vertical"
        initialValues={initialValues(block.fields)}
        onFinish={submit}
        disabled={locked}
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
              <FieldControl field={field} disabled={locked} />
            </Form.Item>
          ))}
        </div>
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
        ) : (
          <div className="genui-actions">
            <Button size="small" type="primary" htmlType="submit">
              {block.submitLabel}
            </Button>
            <Button size="small" onClick={cancel}>
              {block.cancelLabel ?? 'Vazgeç'}
            </Button>
          </div>
        )}
      </Form>
    </section>
  );
}
