import { Flex } from 'antd';
import type { ReactNode } from 'react';

export interface AuthLayoutProps {
  children: ReactNode;
  /** Bölümün başlığının kimliği. Verilirse bölüm bu başlıkla adlanır. */
  labelledBy?: string;
}

/**
 * Giriş, bekleme ve hata ekranlarının ortak yerleşimi.
 * Telefon önce kurulur: 320 px genişlikte kenar boşluğu vardır.
 * Bütün ölçüler projenin CSS değişkenlerinden gelir (`src/design/css-variables.ts`).
 */
export function AuthLayout({ children, labelledBy }: AuthLayoutProps) {
  return (
    <Flex
      component="section"
      vertical
      gap="var(--space-md)"
      {...(labelledBy ? { 'aria-labelledby': labelledBy } : {})}
      style={{
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: 'var(--content-max-width)',
        marginInline: 'auto',
        paddingInline: 'var(--space-md)',
        paddingBlock: 'var(--space-xl)',
      }}
    >
      {children}
    </Flex>
  );
}
