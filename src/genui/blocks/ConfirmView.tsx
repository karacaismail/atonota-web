import { CheckCircle, Warning, XCircle } from '@phosphor-icons/react';
import { Alert, Button } from 'antd';
import { useState } from 'react';

import type { ConfirmBlock, GenUIActionHandler } from '../types';
import { ChangeTable } from './ChangeTable';

type Decision = 'approved' | 'rejected';

export const BUSY_NOTE = 'Yanıt bitince onay verebilirsiniz.';
export const FAILED_NOTE = 'Onay gönderilemedi. Yanıt bitince yeniden deneyin.';

/**
 * Sabit onay ekranı (U4, AX-4, AX-6). Kendi başına işlem yapmaz.
 * İşlem özetini ve değişecek alanları önce ve sonra biçiminde gösterir.
 * Sohbet meşgulken düğmeler kapalıdır. Blok yalnız karar sohbete kabul
 * edilince kilitlenir. Böylece aynı karar iki kez gitmez ve kaybolmaz.
 */
export function ConfirmView({
  block,
  onAction,
  busy = false,
}: {
  block: ConfirmBlock;
  onAction: GenUIActionHandler;
  busy?: boolean;
}) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [failed, setFailed] = useState(false);

  const decide = (next: Decision) => {
    if (decision || busy) return;
    const accepted = onAction({
      kind: 'confirm',
      blockId: block.id,
      decision: next,
      title: block.title,
    });
    if (accepted) setDecision(next);
    setFailed(!accepted);
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
      <header className="genui-card-h">
        <span className="genui-warn" aria-hidden>
          <Warning />
        </span>
        <strong>{block.title}</strong>
      </header>
      <p className="genui-summary">{block.summary}</p>
      <ChangeTable changes={block.changes} />
      {busy && <p className="genui-muted-text">{BUSY_NOTE}</p>}
      {failed && <Alert type="error" showIcon message={FAILED_NOTE} role="alert" />}
      <div className="genui-actions">
        <Button
          size="small"
          type="primary"
          danger={block.danger ?? false}
          disabled={busy}
          onClick={() => decide('approved')}
        >
          {block.confirmLabel}
        </Button>
        <Button size="small" disabled={busy} onClick={() => decide('rejected')}>
          {block.cancelLabel}
        </Button>
      </div>
    </section>
  );
}
