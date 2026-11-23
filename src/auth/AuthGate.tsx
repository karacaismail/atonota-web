import { Button, Typography } from 'antd';
import { lazy, type ReactNode, Suspense, useEffect } from 'react';

import { userMessage } from '@/api/errors';

import { AuthLayout } from './AuthLayout';
import { LoginScreen } from './LoginScreen';
import { tr } from './messages.json';
import type { PlatformSession } from './session';
import { useAuthState } from './useAuthState';

export interface AuthGateProps {
  session: PlatformSession;
  /** Oturum açıksa çizilir. İşlev verilirse oturumdaki kullanıcının adını alır. */
  children: ReactNode | ((user: string) => ReactNode);
  /** Giriş düğmesindeki marka adı. */
  brandName?: string;
}

/**
 * Platform düğmeleri ayrı parçadır. Parça yalnız giriş ekranı açılınca yüklenir.
 * Oturumu açık kullanıcının ilk yüküne girmez.
 */
const ProviderSignIn = lazy(() => import('./providers/ProviderSignIn'));

/**
 * Paneli oturuma bağlar.
 * İlk açılışta oturumu sorar. Oturum yoksa giriş ekranını gösterir ve kendiliğinden yönlendirmez.
 * Sunucu hatasında yalın bir metin ve yeniden deneme düğmesi gösterir.
 */
export function AuthGate({ session, children, brandName }: AuthGateProps) {
  const state = useAuthState(session.auth);
  const text = tr;

  useEffect(() => {
    void session.auth.check();
  }, [session]);

  switch (state.status) {
    case 'signed_in':
      return <>{typeof children === 'function' ? children(state.user) : children}</>;
    case 'signed_out':
      return (
        <LoginScreen
          onSignIn={(provider) => session.auth.signIn(undefined, provider)}
          platforms={
            <Suspense fallback={null}>
              <ProviderSignIn
                api={session.api}
                button={Button}
                labels={{ list: text.providers_label, button: text.login_button }}
                onSignIn={(provider) => session.auth.signIn(undefined, provider)}
              />
            </Suspense>
          }
          {...(brandName ? { brandName } : {})}
          {...(state.notice ? { notice: state.notice } : {})}
        />
      );
    case 'error':
      return (
        <AuthLayout>
          <Typography.Paragraph role="alert" style={{ margin: 0 }}>
            {userMessage(state.error)}
          </Typography.Paragraph>
          <Button block onClick={() => void session.auth.check()}>
            {text.retry}
          </Button>
        </AuthLayout>
      );
    case 'redirecting':
      return (
        <AuthLayout>
          <Typography.Paragraph role="status" style={{ margin: 0 }}>
            {text.redirecting}
          </Typography.Paragraph>
        </AuthLayout>
      );
    case 'checking':
      return (
        <AuthLayout>
          <Typography.Paragraph role="status" style={{ margin: 0 }}>
            {text.checking}
          </Typography.Paragraph>
        </AuthLayout>
      );
  }
}
