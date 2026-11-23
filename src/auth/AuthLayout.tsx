import { Flex } from 'antd';
import type { ReactNode } from 'react';

export interface AuthLayoutProps {
  children: ReactNode;
  /** Bölümün başlığının kimliği. Verilirse bölüm bu başlıkla adlanır. */
  labelledBy?: string;
}

/**
 * Giriş, bekleme ve hata ekranlarının ortak yerleşimi. Dış öğe sayfanın ana bölgesidir (`main`).
 * Telefon önce kurulur: 320 px genişlikte kenar boşluğu vardır.
 * Geniş ekranda içerik dar form sütununda (`--form-max-width`) ortalanır.
 * Bütün ölçüler projenin CSS değişkenlerinden gelir (`src/design/css-variables.ts`).
 */
export function AuthLayout({ children, labelledBy }: AuthLayoutProps) {
  return (
    <Flex
      component="main"
      vertical
      gap="var(--space-md)"
      {...(labelledBy ? { 'aria-labelledby': labelledBy } : {})}
      style={{
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: 'var(--form-max-width)',
        marginInline: 'auto',
        paddingInline: 'var(--space-md)',
        paddingBlock: 'var(--space-xl)',
      }}
    >
      {children}
    </Flex>
  );
}
