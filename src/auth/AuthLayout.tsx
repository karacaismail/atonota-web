import { Flex, theme } from 'antd';
import type { ReactNode } from 'react';

export interface AuthLayoutProps {
  children: ReactNode;
  /** Bölümün başlığının kimliği. Verilirse bölüm bu başlıkla adlanır. */
  labelledBy?: string;
}

/**
 * Giriş, bekleme ve hata ekranlarının ortak yerleşimi.
 * Telefon önce kurulur: 320 px genişlikte kenar boşluğu vardır. Geniş ekranda içerik `screenSM` genişliğini aşmaz.
 * Bütün ölçüler Ant Design tokenlarından gelir.
 */
export function AuthLayout({ children, labelledBy }: AuthLayoutProps) {
  const { token } = theme.useToken();
  return (
    <Flex
      component="section"
      vertical
      gap={token.marginMD}
      {...(labelledBy ? { 'aria-labelledby': labelledBy } : {})}
      style={{
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: token.screenSM,
        marginInline: 'auto',
        paddingInline: token.padding,
        paddingBlock: token.paddingXL,
      }}
    >
      {children}
    </Flex>
  );
}
