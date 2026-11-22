import { Alert } from 'antd';
import { deletionState, safeIdentityUrl } from '../contracts';
import { useCopy } from '../messages';
import { useModule } from '../context';
import { ModuleFrame, Section } from '../shared';

function DeletionHandoff() {
  const env = useModule();
  const copy = useCopy();
  let url: string | undefined;
  let status: 'pending' | 'submitted' | 'reauthenticate' | undefined;
  if (env?.pressOrigin) {
    try {
      const origin = new URL(env.pressOrigin);
      if (
        origin.protocol === 'https:' &&
        !origin.username &&
        !origin.password &&
        origin.pathname === '/' &&
        !origin.search &&
        !origin.hash
      )
        url = new URL('/account-deletion', origin).href;
    } catch {
      /* Invalid configuration keeps deletion unavailable. */
    }
  }
  if (env?.accountDeletionStatus !== undefined) {
    try {
      status = deletionState(env.accountDeletionStatus);
    } catch {
      /* Never infer completion from an invalid result. */
    }
  }
  return (
    <Section title={copy.deleteTitle}>
      <Alert type="warning" message={copy.deleteWarning} />
      {status === 'pending' ? (
        <p role="status">{copy.deletePending}</p>
      ) : status === 'submitted' ? (
        <p role="status">{copy.deleteSubmitted}</p>
      ) : url ? (
        <a className="tlink" href={url}>
          {copy.deleteHandoff}
        </a>
      ) : (
        <p>{copy.unavailable}</p>
      )}
    </Section>
  );
}
export default function AccountPage() {
  const env = useModule();
  const copy = useCopy();
  let securityUrl: string | undefined;
  if (env?.accountSecurityUrl && env.identityRealmUrl) {
    try {
      securityUrl = safeIdentityUrl(env.accountSecurityUrl, env.identityRealmUrl);
    } catch {
      /* Hide an untrusted destination. */
    }
  }
  return (
    <ModuleFrame title={copy.account}>
      <Section title={copy.profile}>
        {env?.profile ? (
          <dl>
            <dt>{copy.user}</dt>
            <dd>{env.profile.fullName}</dd>
            <dt>{copy.roles}</dt>
            <dd>{env.profile.roles.join(', ') || copy.notProvided}</dd>
          </dl>
        ) : (
          <p>{copy.profileUnavailable}</p>
        )}
      </Section>
      <Section title={copy.sessions}>
        <p>{copy.sessionsUnavailable}</p>
      </Section>
      <Section title={copy.security}>
        {securityUrl ? (
          <a className="tlink" href={securityUrl}>
            {copy.openSecurity}
          </a>
        ) : (
          <p>{copy.securityUnavailable}</p>
        )}
      </Section>
      <DeletionHandoff />
    </ModuleFrame>
  );
}
