// Giriş ekranının platform düğmeleri (G-159). Bu dosya ilk yüke girmez.
// AuthGate onu yalnız giriş ekranı açılınca `import()` ile yükler. Oturumu açık kullanıcı indirmez.
// Liste sunucudan gelir. Kodda platform listesi yoktur. Liste okunamazsa hiçbir düğme çizilmez.
//
// Düğme bileşeni ve metinler giriş ekranından gelir. Bu parça arayüz kitaplığını ve metin
// kataloğunu kendisi içe aktarmaz. Aktarırsa paketleyici ilk yükteki ortak parçaları yeniden böler
// ve telefonun ilk yükü büyür (inceleme 1, bulgu 10).
import type { Button as AntButton } from 'antd';
import { useEffect, useState } from 'react';

import type { ApiClient, LoginProvider } from '@/api';
import { createLoginClient } from '@/api/login-client';

/** Platform düğmesinin bileşeni. Giriş ekranı antd `Button` bileşenini verir. Yalnız tür alınır. */
export type ProviderButton = typeof AntButton;

export interface ProviderLabels {
  /** Listenin adı. Örnek: “Başka bir hesapla oturum açın”. */
  list: string;
  /** Düğme metni. `{brand}` yerine platformun adı gelir. Örnek: “{brand} ile oturum aç”. */
  button: string;
}

export interface ProviderListProps {
  providers: readonly LoginProvider[];
  labels: ProviderLabels;
  button: ProviderButton;
  /** Platform düğmesine basılınca platform adıyla çağrılır. Örnek: `'google'`. */
  onSignIn: (provider: string) => void;
}

/** Platform düğmeleri. Liste boşsa hiçbir şey çizilmez. */
export function ProviderList({ providers, labels, button: Button, onSignIn }: ProviderListProps) {
  if (providers.length === 0) return null;
  return (
    <ul
      aria-label={labels.list}
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
            {labels.button.replace('{brand}', provider.display_name)}
          </Button>
        </li>
      ))}
    </ul>
  );
}

export interface ProviderSignInProps extends Omit<ProviderListProps, 'providers'> {
  api: Pick<ApiClient, 'frappeDocument'>;
}

/** Platform listesini sunucudan okur ve düğmeleri çizer. */
export default function ProviderSignIn({ api, ...list }: ProviderSignInProps) {
  const [providers, setProviders] = useState<readonly LoginProvider[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    createLoginClient(api)
      .listLoginProviders({ signal: controller.signal })
      .then(
        (items) => {
          if (!controller.signal.aborted) setProviders(items);
        },
        () => {
          if (!controller.signal.aborted) setProviders([]);
        },
      );
    return () => controller.abort();
  }, [api]);
  return <ProviderList providers={providers} {...list} />;
}
