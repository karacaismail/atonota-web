import { Button, Typography } from 'antd';

import type { SignedOutNotice } from './auth';
import { AuthLayout } from './AuthLayout';
import messages from './messages.json';

export interface LoginScreenProps {
  /** Giriş düğmesine basılınca çağrılır. Örnek: `() => session.auth.signIn()`. */
  onSignIn: () => void;
  /** Düğmedeki marka adı. Verilmezse “AtonotA Login” olur. */
  brandName?: string;
  /** Verilirse açıklamanın altında kısa bir not görünür. Örnek: `idp_session_may_remain`. */
  notice?: SignedOutNotice;
}

/**
 * Giriş rotasının ekranı. Düğme arka ucun `start_login` akışını başlatır.
 * Yerleşim telefon önce kurulur: 320 px genişlikte kenar boşluğu vardır ve düğme tam genişliktedir.
 * Ölçüler AuthLayout içinde projenin CSS değişkenlerinden gelir.
 */
export function LoginScreen({ onSignIn, brandName = messages.tr.brand, notice }: LoginScreenProps) {
  const text = messages.tr;
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
      <Button type="primary" block onClick={onSignIn} style={{ width: '100%' }}>
        {text.login_button.replace('{brand}', brandName)}
      </Button>
    </AuthLayout>
  );
}
