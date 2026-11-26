import { X } from '@phosphor-icons/react';
import type { KeyboardEvent, ReactNode, Ref } from 'react';
import { useId } from 'react';

import { t } from '../messages';

export const ASSIST_PANEL_ID = 'shell-assist';

interface AssistPanelProps {
  open: boolean;
  /** Telefon kabuğunda panel alttan tam boy açılan iletişim kutusudur. */
  compact: boolean;
  onClose: () => void;
  panelRef: Ref<HTMLDivElement>;
  closeRef: Ref<HTMLButtonElement>;
  /** Panelin içeriği. İçerik `ai-studio` işinindir. Kabuk yalnız yeri kurar. */
  children?: ReactNode;
}

/**
 * Yardımcı panelin yeri. Geniş ekranda sağdaki ızgara sütunudur ve içeriği örtmez.
 * Telefonda alttan tam boy açılır. Odak perdesi kullanılmaz.
 */
export function AssistPanel({
  open,
  compact,
  onClose,
  panelRef,
  closeRef,
  children,
}: AssistPanelProps) {
  const titleId = useId();
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    e.preventDefault();
    onClose();
  };
  return (
    <div
      ref={panelRef}
      id={ASSIST_PANEL_ID}
      className="shell-assist"
      aria-labelledby={titleId}
      data-open={open ? 'true' : 'false'}
      // Geniş ekranda kapalı panel ızgarada yer tutmaz.
      hidden={!compact && !open}
      onKeyDown={onKeyDown}
      {...(compact ? { role: 'dialog', 'aria-modal': true } : { role: 'complementary' })}
    >
      <div className="shell-assist-head">
        <h2 id={titleId} className="shell-assist-title">
          {t.assist.title}
        </h2>
        <button
          ref={closeRef}
          type="button"
          className="shell-iconbtn"
          aria-label={t.assist.close}
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="shell-assist-body">
        {children ?? <p className="shell-muted">{t.assist.empty}</p>}
      </div>
    </div>
  );
}
