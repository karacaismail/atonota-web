import { Alert } from 'antd';
import { useCallback } from 'react';
import { pressAccountDeletionUrl, readPressConfig } from '../../api';
import { deletionState, parseProfile, safeIdentityUrl } from '../contracts';
import { useCopy } from '../messages';
import { useModule } from '../context';
import { useRead } from '../data';
import { ModuleFrame, ResourceView, Section } from '../shared';
import { LinkedAccounts } from './LinkedAccounts';

function DeletionHandoff() {
  const env = useModule();
  const copy = useCopy();
  let url: string | undefined;
  let status: 'pending' | 'submitted' | 'reauthenticate' | undefined;
  if (env?.pressOrigin) {
    try {
      const press = readPressConfig({ VITE_PRESS_URL: env.pressOrigin });
      if (press) url = pressAccountDeletionUrl(press);
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
function AccountProfile() {
  const env = useModule();
  const copy = useCopy();
  const get = env?.client?.getProfile;
  const load = useCallback(
    async (signal: AbortSignal) => {
      const profile = parseProfile(await get?.({ signal }));
      if (profile.name !== env?.user) throw new Error('invalid_response');
      return profile;
    },
    [get, env?.user],
  );
  const read = useRead(!env?.profile && get ? load : null, 'profile');
  const renderProfile = (profile: {
    fullName: string;
    roles: readonly string[];
    truncated?: boolean;
  }) => (
    <dl>
      <dt>{copy.user}</dt>
      <dd>{profile.fullName}</dd>
      <dt>{copy.roles}</dt>
      <dd>
        {profile.truncated ? copy.rolesTruncated : profile.roles.join(', ') || copy.notProvided}
      </dd>
    </dl>
  );
  return (
    <Section title={copy.profile}>
      {env?.profile ? (
        renderProfile(env.profile)
      ) : (
        <ResourceView state={read.state} retry={read.refresh}>
          {renderProfile}
        </ResourceView>
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
      <AccountProfile />
      <LinkedAccounts />
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
