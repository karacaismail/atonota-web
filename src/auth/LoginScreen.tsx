import { Button, Typography } from 'antd';

import { AuthLayout } from './AuthLayout';
import messages from './messages.json';

export interface LoginScreenProps {
  /** Giriş düğmesine basılınca çağrılır. Örnek: `() => session.auth.signIn()`. */
  onSignIn: () => void;
  /** Düğmedeki marka adı. Verilmezse “Atonota” olur. */
  brandName?: string;
}

/**
 * Giriş rotasının ekranı. Düğme arka ucun `start_login` akışını başlatır.
 * Yerleşim telefon önce kurulur: 320 px genişlikte kenar boşluğu vardır ve düğme tam genişliktedir.
 * Ölçüler AuthLayout içinde projenin CSS değişkenlerinden gelir.
 */
export function LoginScreen({ onSignIn, brandName = messages.tr.brand }: LoginScreenProps) {
  const text = messages.tr;
  return (
    <AuthLayout labelledBy="login-title">
      <Typography.Title level={1} id="login-title" style={{ margin: 0 }}>
        {text.login_title}
      </Typography.Title>
      <Typography.Paragraph style={{ margin: 0 }}>{text.login_body}</Typography.Paragraph>
      <Button type="primary" block onClick={onSignIn} style={{ width: '100%' }}>
        {text.login_button.replace('{brand}', brandName)}
      </Button>
    </AuthLayout>
  );
}
