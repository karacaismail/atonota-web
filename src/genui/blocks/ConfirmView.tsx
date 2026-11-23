import { CheckCircle, Warning, XCircle } from '@phosphor-icons/react';
import { Alert, Button } from 'antd';

import type { ConfirmBlock, GenUIActionHandler, GenUIDecision } from '../types';
import { ChangeTable } from './ChangeTable';
import { BUSY_NOTE, FAILED_NOTE, USED_NOTE, useDecision } from './useDecision';

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
  decided,
}: {
  block: ConfirmBlock;
  onAction: GenUIActionHandler;
  busy?: boolean;
  decided?: GenUIDecision | undefined;
}) {
  const { decision, notice, locked, apply } = useDecision(decided);

  const decide = (next: GenUIDecision) => {
    if (locked || busy) return;
    apply(
      next,
      onAction({ kind: 'confirm', blockId: block.id, decision: next, title: block.title }),
    );
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
      {notice === 'busy' && <Alert type="error" showIcon message={FAILED_NOTE} role="alert" />}
      {notice === 'used' && <Alert type="warning" showIcon message={USED_NOTE} role="alert" />}
      {!locked && (
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
      )}
    </section>
  );
}
