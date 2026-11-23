import { Button, Typography } from 'antd';

import type { LoginProvider } from '@/api/guards';

import type { SignedOutNotice } from './auth';
import { AuthLayout } from './AuthLayout';
import messages from './messages.json';
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
   * Sunucudan gelen açık platformlar (G-159). Kodda platform listesi yoktur.
   * Liste boşsa ya da verilmezse yalnız AtonotA Login düğmesi görünür.
   */
  providers?: readonly LoginProvider[];
}

/**
 * Giriş rotasının ekranı. Düğmeler arka ucun `start_login` akışını başlatır.
 * Yerleşim telefon önce kurulur: 320 px genişlikte kenar boşluğu vardır ve düğmeler tam genişliktedir.
 * Ölçüler AuthLayout içinde projenin CSS değişkenlerinden gelir.
 */
export function LoginScreen({
  onSignIn,
  brandName = messages.tr.brand,
  notice,
  providers = [],
}: LoginScreenProps) {
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
      <Button type="primary" block onClick={() => onSignIn(undefined)} style={{ width: '100%' }}>
        {text.login_button.replace('{brand}', brandName)}
      </Button>
      {providers.length > 0 ? (
        <ul
          aria-label={text.providers_label}
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)',
          }}
        >
          {providers.map((provider) => (
            <li key={provider.alias}>
              <Button block onClick={() => onSignIn(provider.alias)} style={{ width: '100%' }}>
                {text.login_button.replace('{brand}', provider.display_name)}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <Typography.Paragraph style={{ margin: 0 }}>
        <a href={PRODUCT_PATH}>{text.product_link}</a>
      </Typography.Paragraph>
    </AuthLayout>
  );
}
