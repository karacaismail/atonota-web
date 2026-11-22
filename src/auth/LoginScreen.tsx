import { Button, Typography } from 'antd';

import messages from './messages.json';

export interface LoginScreenProps {
  /** Giriş düğmesine basılınca çağrılır. Örnek: `() => session.auth.signIn()`. */
  onSignIn: () => void;
  /** Düğmedeki marka adı. Verilmezse “Atonota” olur. */
  brandName?: string;
}

/** Giriş rotasının ekranı. Düğme arka ucun `start_login` akışını başlatır. */
export function LoginScreen({ onSignIn, brandName = messages.tr.brand }: LoginScreenProps) {
  const text = messages.tr;
  return (
    <section aria-labelledby="login-title">
      <Typography.Title level={1} id="login-title">
        {text.login_title}
      </Typography.Title>
      <Typography.Paragraph>{text.login_body}</Typography.Paragraph>
      <Button type="primary" onClick={onSignIn}>
        {text.login_button.replace('{brand}', brandName)}
      </Button>
    </section>
  );
}
