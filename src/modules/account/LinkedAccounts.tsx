// Hesap sayfasındaki "Bağlı hesaplar" bölümü (AtonotA Login, G-160).
// Liste sunucudan gelir. Kodda platform listesi yoktur.
// Bağlama bir sayfa geçişidir: tarayıcı backend'in `start_link` yoluna gider. Tarayıcı belirteç tutmaz.
// Bağı kaldırma önce onay ister. Son giriş yolu kaldırılamaz; son kararı sunucu verir.
import { Alert, Button } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { LinkedAccounts as Accounts, LinkedProvider } from '../../api';
import { startLinkUrl } from '../../auth/auth';
import { useModule } from '../context';
import { failureKind, useRead, type FailureKind } from '../data';
import { useCopy } from '../messages';
import { ResourceView, Section } from '../shared';

/** Bağlamadan sonra dönülecek yol. Hesap sayfasının yoludur. */
const ACCOUNT_PATH = '/account';

function fill(template: string, name: string): string {
  return template.replaceAll('{name}', name);
}

/** Bu bağ kaldırılırsa kullanıcının giriş yolu kalır mı? */
function canUnlink(accounts: Accounts): boolean {
  const linked = accounts.providers.filter((item) => item.linked).length;
  return linked + accounts.local_sign_in_methods > 1;
}

type Outcome =
  | { kind: 'unlinked'; name: string }
  | { kind: 'last_method' }
  | { kind: 'error'; error: FailureKind };

function ProviderRow({
  provider,
  removable,
  actionable,
  confirming,
  pending,
  onAsk,
  onCancel,
  onConfirm,
}: {
  provider: LinkedProvider;
  /** Bu bağ kaldırılırsa giriş yolu kalır mı? */
  removable: boolean;
  /** Bağı kaldırma isteği gönderilebilir mi? İstemci yoksa düğme çizilmez. */
  actionable: boolean;
  confirming: boolean;
  pending: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const env = useModule();
  const copy = useCopy();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const askRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  const name = provider.display_name;
  const href = env ? startLinkUrl(env.tenant, provider.alias, ACCOUNT_PATH) : undefined;

  useEffect(() => {
    // Onay açılınca odak "Vazgeç" düğmesine gider. Kapanınca kaldırma düğmesine döner.
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirming.current) askRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  return (
    <li className="module-stack">
      <div className="module-actions">
        <strong>{name}</strong>
        <span>{provider.linked ? copy.linkedLinked : copy.linkedNotLinked}</span>
      </div>
      {!provider.linked ? (
        href ? (
          <a className="tlink" href={href}>
            {fill(copy.linkedLink, name)}
          </a>
        ) : null
      ) : !actionable ? null : !removable ? (
        <p>{copy.linkedLastMethod}</p>
      ) : confirming ? (
        <div role="group" aria-label={fill(copy.linkedConfirmGroup, name)} className="module-stack">
          <p>{fill(copy.linkedConfirmText, name)}</p>
          <div className="module-actions">
            <Button ref={cancelRef} onClick={onCancel} disabled={pending}>
              {copy.linkedCancel}
            </Button>
            <Button danger type="primary" onClick={onConfirm} loading={pending}>
              {copy.linkedConfirm}
            </Button>
          </div>
        </div>
      ) : (
        <div className="module-actions">
          <Button ref={askRef} onClick={onAsk}>
            {fill(copy.linkedUnlink, name)}
          </Button>
        </div>
      )}
    </li>
  );
}

export function LinkedAccounts() {
  const env = useModule();
  const copy = useCopy();
  const list = env?.client?.listLinkedAccounts;
  const unlink = env?.client?.unlinkAccount;
  const load = useMemo(() => (list ? (signal: AbortSignal) => list({ signal }) : null), [list]);
  const read = useRead(load, 'linked-accounts');
  // Kaldırmadan sonra sunucunun döndüğü yeni liste. Yeniden okuma gerekmez.
  const [latest, setLatest] = useState<Accounts | undefined>(undefined);
  const [confirming, setConfirming] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | undefined>(undefined);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function confirm(provider: LinkedProvider) {
    if (!unlink || controller.current) return;
    const ctrl = new AbortController();
    controller.current = ctrl;
    setPending(true);
    try {
      const next = await unlink(provider.alias, { signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      setLatest(next);
      setOutcome({ kind: 'unlinked', name: provider.display_name });
    } catch (error) {
      if (ctrl.signal.aborted) return;
      const code = typeof error === 'object' && error && 'code' in error ? error.code : undefined;
      setOutcome(
        code === 'LastSignInMethod'
          ? { kind: 'last_method' }
          : { kind: 'error', error: failureKind(error, true) },
      );
    } finally {
      if (!ctrl.signal.aborted) {
        controller.current = null;
        setPending(false);
        setConfirming(undefined);
      }
    }
  }

  return (
    <Section title={copy.linkedTitle}>
      <ResourceView state={read.state} retry={read.refresh}>
        {(loaded) => {
          const accounts = latest ?? loaded;
          const removable = canUnlink(accounts);
          return (
            <>
              <p>{copy.linkedIntro}</p>
              {outcome?.kind === 'unlinked' ? (
                <p role="status">{fill(copy.linkedUnlinked, outcome.name)}</p>
              ) : outcome ? (
                <Alert
                  role="alert"
                  type="error"
                  message={
                    outcome.kind === 'last_method' ? copy.linkedLastMethod : copy[outcome.error]
                  }
                />
              ) : null}
              {accounts.providers.length === 0 ? (
                <p>{copy.linkedEmpty}</p>
              ) : (
                <ul className="module-records">
                  {accounts.providers.map((provider) => (
                    <ProviderRow
                      key={provider.alias}
                      provider={provider}
                      removable={removable}
                      actionable={!!unlink}
                      confirming={confirming === provider.alias}
                      pending={pending && confirming === provider.alias}
                      onAsk={() => {
                        setOutcome(undefined);
                        setConfirming(provider.alias);
                      }}
                      onCancel={() => setConfirming(undefined)}
                      onConfirm={() => void confirm(provider)}
                    />
                  ))}
                </ul>
              )}
            </>
          );
        }}
      </ResourceView>
    </Section>
  );
}
