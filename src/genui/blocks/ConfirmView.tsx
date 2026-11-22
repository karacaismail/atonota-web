import { CheckCircle, Warning, XCircle } from '@phosphor-icons/react';
import { Button } from 'antd';
import { useState } from 'react';

import type { ConfirmBlock, GenUIAction } from '../types';

type Decision = 'approved' | 'rejected';

/**
 * Onay bloğu (U4). Kendi başına işlem yapmaz.
 * Kullanıcı düğmeye basınca karar sohbete yeni mesaj olarak gider.
 * Karar verildikten sonra blok kilitlenir. Böylece aynı karar iki kez gitmez.
 */
export function ConfirmView({
  block,
  onAction,
}: {
  block: ConfirmBlock;
  onAction: (action: GenUIAction) => void;
}) {
  const [decision, setDecision] = useState<Decision | null>(null);

  const decide = (next: Decision) => {
    if (decision) return;
    setDecision(next);
    onAction({ kind: 'confirm', blockId: block.id, decision: next, title: block.title });
  };

  if (decision) {
    return (
      <section data-genui="confirm" className={`genui-card genui-done is-${decision}`}>
        {decision === 'approved' ? (
          <CheckCircle weight="fill" aria-hidden />
        ) : (
          <XCircle weight="fill" aria-hidden />
        )}
        <span role="status">
          {decision === 'approved'
            ? 'Onayınız gönderildi. Sonucu asistan yeni mesajla bildirecek.'
            : 'Vazgeçtiniz. Hiçbir işlem yapılmadı.'}
        </span>
      </section>
    );
  }

  return (
    <section data-genui="confirm" className="genui-card genui-confirm">
      <span className="genui-warn" aria-hidden>
        <Warning />
      </span>
      <div className="genui-confirm-t">
        <strong>{block.title}</strong>
        {block.detail && <span className="genui-muted-text">{block.detail}</span>}
      </div>
      <div className="genui-actions">
        <Button
          size="small"
          type="primary"
          danger={block.danger ?? false}
          onClick={() => decide('approved')}
        >
          {block.confirmLabel}
        </Button>
        <Button size="small" onClick={() => decide('rejected')}>
          {block.cancelLabel}
        </Button>
      </div>
    </section>
  );
}
