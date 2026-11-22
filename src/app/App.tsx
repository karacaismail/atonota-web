import { Button, Flex, Input, Select, Space, Typography } from 'antd';

import { HitSuffix } from '@/engines/hit-area';

import { AppProviders } from './AppProviders';
import { ThemeModeSwitch } from './ThemeModeSwitch';

const sizeOptions = [
  { value: 'sm', label: 'Küçük' },
  { value: 'md', label: 'Orta' },
  { value: 'lg', label: 'Büyük' },
];

/** Temel önizleme sayfası. Kabuk işi bu sayfanın yerini alır. */
export function FoundationPage() {
  return (
    <main style={{ padding: 'var(--btn-h-sm)', maxWidth: 960, marginInline: 'auto' }}>
      <Flex vertical gap="large">
        <Flex justify="space-between" align="center" wrap gap="small">
          <Typography.Title level={1} style={{ margin: 0 }}>
            Atonota
          </Typography.Title>
          <ThemeModeSwitch />
        </Flex>
        <Typography.Paragraph>
          Arayüz temeli hazır. Bu sayfa tasarım kararlarını gösterir.
        </Typography.Paragraph>

        <section aria-labelledby="buttons-title">
          <Typography.Title level={2} id="buttons-title">
            Butonlar
          </Typography.Title>
          <Flex gap="middle" wrap align="center">
            <Button size="small" data-testid="btn-sm">
              Küçük
            </Button>
            <Button type="primary" data-testid="btn-md">
              Orta
            </Button>
            <Button size="large" data-testid="btn-lg">
              Büyük
            </Button>
            <Button disabled data-testid="btn-disabled">
              Pasif
            </Button>
          </Flex>
          <Space.Compact style={{ marginTop: 16 }} data-testid="compact">
            <Button data-testid="compact-left">Sol</Button>
            <Button data-testid="compact-right">Sağ</Button>
          </Space.Compact>
        </section>

        <section aria-labelledby="inputs-title">
          <Typography.Title level={2} id="inputs-title">
            Giriş alanları
          </Typography.Title>
          <Flex vertical gap="middle">
            <Input aria-label="Ad" placeholder="Ad" suffix={<HitSuffix />} data-testid="input-md" />
            <Select
              aria-label="Boyut"
              placeholder="Boyut seçin"
              options={sizeOptions}
              style={{ width: '100%' }}
              data-testid="select-md"
            />
            <Typography.Paragraph style={{ margin: 0 }}>
              Yardım için <a href="#yardim">yardım sayfasına</a> bakın.
            </Typography.Paragraph>
          </Flex>
        </section>
      </Flex>
    </main>
  );
}

export function App() {
  return (
    <AppProviders>
      <FoundationPage />
    </AppProviders>
  );
}
