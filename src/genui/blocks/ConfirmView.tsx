import { CheckCircle, Warning, XCircle } from '@phosphor-icons/react';
import { Alert, Button } from 'antd';
import { useEffect, useState } from 'react';

import type { ConfirmBlock, GenUIActionHandler, GenUIDecision } from '../types';
import { ChangeTable } from './ChangeTable';
import {
  BUSY_NOTE,
  EXPIRED_LABEL,
  EXPIRED_NOTE,
  FAILED_NOTE,
  USED_NOTE,
  useDecision,
} from './useDecision';

/** Tarayıcının bekleme süresi bu sayıyı aşamaz (yaklaşık 24,8 gün). */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Son zaman geçtiyse `true` döner. Blok açıkken süre dolarsa değer kendiliğinden değişir.
 * Durum, süresi dolan zamanı saklar. Böylece yeni süre gelince eski karar geçerli kalmaz.
 */
function useExpired(expiresAt: string | undefined): boolean {
  const at = expiresAt === undefined ? Number.NaN : Date.parse(expiresAt);
  const [expiredAt, setExpiredAt] = useState<number | null>(() =>
    Number.isFinite(at) && at <= Date.now() ? at : null,
  );
  useEffect(() => {
    if (!Number.isFinite(at)) return undefined;
    const left = Math.max(0, at - Date.now());
    if (left > MAX_TIMEOUT_MS) return undefined;
    const timer = window.setTimeout(() => setExpiredAt(at), left);
    return () => window.clearTimeout(timer);
  }, [at]);
  return Number.isFinite(at) && expiredAt === at;
}

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
  // Süresi geçen öneri onaylanamaz; sunucu da reddeder.
  const expired = useExpired(block.expiresAt);

  const decide = (next: GenUIDecision) => {
    if (locked || busy || expired) return;
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
      {expired && !locked && (
        <div role="status">
          <strong>{EXPIRED_LABEL}</strong>
          <p className="genui-muted-text">{EXPIRED_NOTE}</p>
        </div>
      )}
      {!locked && !expired && (
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
