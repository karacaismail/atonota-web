import { Button, Typography } from 'antd';

import type { ReactNode } from 'react';

import type { SignedOutNotice } from './auth';
import { AuthLayout } from './AuthLayout';
import { tr } from './messages.json';
import { PRODUCT_PATH } from './product/path';

export interface LoginScreenProps {
  /**
   * Giriş düğmesine basılınca çağrılır. Platform düğmesi platform adını verir.
   * AtonotA Login düğmesi ad vermez. Örnek: `(provider) => session.auth.signIn(undefined, provider)`.
   */
  onSignIn: (provider?: string) => void;
  /** Düğmedeki marka adı. Verilmezse “AtonotA Login” olur. */
  brandName?: string;
  /** Verilirse açıklamanın altında kısa bir not görünür. Örnek: `idp_session_may_remain`. */
  notice?: SignedOutNotice;
  /**
   * Platform düğmeleri (G-159). AtonotA Login düğmesinin altında çizilir.
   * AuthGate buraya tembel yüklenen `ProviderSignIn` bileşenini koyar. Verilmezse yalnız
   * AtonotA Login düğmesi görünür.
   */
  platforms?: ReactNode;
}

/**
 * Giriş rotasının ekranı. Düğmeler arka ucun `start_login` akışını başlatır.
 * Yerleşim telefon önce kurulur: 320 px genişlikte kenar boşluğu vardır ve düğmeler tam genişliktedir.
 * Ölçüler AuthLayout içinde projenin CSS değişkenlerinden gelir.
 */
export function LoginScreen({
  onSignIn,
  brandName = tr.brand,
  notice,
  platforms,
}: LoginScreenProps) {
  const text = tr;
  return (
    <AuthLayout labelledBy="login-title">
      <Typography.Title level={1} id="login-title" style={{ margin: 0 }}>
        {text.login_title}
      </Typography.Title>
      <Typography.Paragraph style={{ margin: 0 }}>{text.login_body}</Typography.Paragraph>
      {notice ? (
        // Not soluk çizilmez. antd `secondary` rengi 14 px metinde 4.5:1 vermez (inceleme 2, Ö-1).
        <Typography.Paragraph role="status" style={{ margin: 0 }}>
          {text[notice]}
        </Typography.Paragraph>
      ) : null}
      <Button type="primary" block onClick={() => onSignIn(undefined)} style={{ width: '100%' }}>
        {text.login_button.replace('{brand}', brandName)}
      </Button>
      {platforms}
      <Typography.Paragraph style={{ margin: 0 }}>
        <a href={PRODUCT_PATH}>{text.product_link}</a>
      </Typography.Paragraph>
    </AuthLayout>
  );
}
