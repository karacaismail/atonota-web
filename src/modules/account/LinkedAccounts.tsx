// The "Linked accounts" section on the account page (AtonotA Login, G-160).
// The list comes from the server. The code holds no platform list.
// Linking is a page navigation: the browser goes to the backend's `start_link` route.
// The browser holds no token.
// Unlinking asks for confirmation first. The last sign-in method cannot be removed;
// the server makes the final decision.
// The client is a separate chunk (`linkedAccounts`). The chunk loads only when this section opens.
import { Alert, Button } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { LinkedAccounts as Accounts, LinkedProvider } from '../../api';
import { startLinkUrl } from '../../api/login-client';
import { useModule } from '../context';
import { failureKind, useRead, type FailureKind } from '../data';
import { useCopy as useModuleCopy } from '../messages';
import linkedMessages from './messages.json';
import type { LinkedAccountsClient } from '../runtime';
import { ResourceView, Section } from '../shared';

/** The path back after linking: the account page. The value is only in this page's chunk. */
const ACCOUNT_PATH = '/account';

/**
 * The section's texts. The catalogue goes only into the account page's chunk (initial load budget).
 * Shared error texts come from the module catalogue.
 */
function useCopy() {
  const env = useModule();
  return { ...useModuleCopy(), ...linkedMessages[env?.locale ?? 'tr'] };
}

function fill(template: string, name: string): string {
  return template.replaceAll('{name}', name);
}

/** Does the user keep a sign-in method if this link is removed? */
function canUnlink(accounts: Accounts): boolean {
  const linked = accounts.providers.filter((item) => item.linked).length;
  return linked + accounts.local_sign_in_methods > 1;
}

type Outcome =
  | { kind: 'unlinked'; name: string }
  | { kind: 'last_method' }
  | { kind: 'error'; error: FailureKind };

interface RowProps {
  provider: LinkedProvider;
  /** Is a sign-in method left if this link is removed? */
  removable: boolean;
  confirming: boolean;
  pending: boolean;
  /** If true, focus moves to this row's "link account" link. This happens after unlinking. */
  focusLink: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function ProviderRow({
  provider,
  removable,
  confirming,
  pending,
  focusLink,
  onAsk,
  onCancel,
  onConfirm,
}: RowProps) {
  const env = useModule();
  const copy = useCopy();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const askRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const wasConfirming = useRef(false);
  const name = provider.display_name;
  const href = env ? startLinkUrl(env.tenant, provider.alias, ACCOUNT_PATH) : undefined;

  useEffect(() => {
    // When the confirmation opens, focus moves to the "Cancel" button.
    // On cancel, focus returns to the remove button. If the link is gone, that button is gone too;
    // then focus moves to the "link account" link in the same row (the effect below).
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirming.current) askRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  useEffect(() => {
    if (focusLink && !provider.linked) linkRef.current?.focus();
  }, [focusLink, provider.linked]);

  return (
    <li className="module-stack">
      <div className="module-actions">
        <strong>{name}</strong>
        <span>{provider.linked ? copy.linkedLinked : copy.linkedNotLinked}</span>
      </div>
      {!provider.linked ? (
        href ? (
          <a ref={linkRef} className="tlink" href={href}>
            {fill(copy.linkedLink, name)}
          </a>
        ) : null
      ) : !removable ? (
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
  const loadClient = env?.client?.linkedAccounts;
  // The client loads once. Reading and unlinking use the same client.
  const getClient = useMemo(() => {
    if (!loadClient) return null;
    let cached: Promise<LinkedAccountsClient> | undefined;
    return () => (cached ??= loadClient());
  }, [loadClient]);
  const load = useMemo(
    () =>
      getClient
        ? async (signal: AbortSignal) => (await getClient()).listLinkedAccounts({ signal })
        : null,
    [getClient],
  );
  const read = useRead(load, 'linked-accounts');
  // The new list the server returns after unlinking. No re-read is needed.
  const [latest, setLatest] = useState<Accounts | undefined>(undefined);
  const [confirming, setConfirming] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | undefined>(undefined);
  const [focusAlias, setFocusAlias] = useState<string | undefined>(undefined);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function confirm(provider: LinkedProvider) {
    if (!getClient || controller.current) return;
    const ctrl = new AbortController();
    controller.current = ctrl;
    setPending(true);
    try {
      const client = await getClient();
      const next = await client.unlinkAccount(provider.alias, { signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      setLatest(next);
      setFocusAlias(provider.alias);
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
              {/*
               * The status region is rendered empty first. The text is written later, so the
               * screen reader announces it (review 2, finding 4). Pending and result share it.
               */}
              <p role="status" data-testid="linked-status">
                {pending
                  ? copy.linkedPending
                  : outcome?.kind === 'unlinked'
                    ? fill(copy.linkedUnlinked, outcome.name)
                    : null}
              </p>
              {outcome && outcome.kind !== 'unlinked' ? (
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
                      confirming={confirming === provider.alias}
                      pending={pending && confirming === provider.alias}
                      focusLink={focusAlias === provider.alias}
                      onAsk={() => {
                        setOutcome(undefined);
                        setFocusAlias(undefined);
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
