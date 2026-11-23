import '@fontsource-variable/outfit';
import '@fontsource/jetbrains-mono/400.css';

import { useState } from 'react';
import { createRoot } from 'react-dom/client';

import { AppProviders } from '@/app';

import {
  Button,
  Card,
  Checkbox,
  Dropdown,
  Input,
  InputNumber,
  Link,
  Radio,
  Select,
  SplitDropdown,
  Switch,
  Tabs,
  Tag,
} from '..';
import type { DropdownItem, DropdownStyle } from '..';

import './demo.css';

const sizes = ['small', 'middle', 'large'] as const;
const styles: DropdownStyle[] = ['classic', 'shortcut', 'described', 'selectable', 'searchable'];
const items: DropdownItem[] = [
  { key: 'edit', label: 'Düzenle', group: 'Kayıt', description: 'Kaydı aç', shortcut: 'Enter' },
  { key: 'copy', label: 'Kopyala', group: 'Kayıt', description: 'Kaydı kopyala', shortcut: 'C' },
  { key: 'locked', label: 'Taşı', disabled: true, group: 'Kayıt' },
  {
    key: 'history',
    label: 'Bu kaydın daha önce yapılan tüm değişikliklerini görüntüle',
    group: 'Geçmiş',
  },
  { key: 'delete', label: 'Sil', danger: true },
];

export function ControlsDemo() {
  const [action, setAction] = useState('');

  return (
    <main className="controls-demo">
      <section className="controls-demo-row">
        {styles.map((style) => (
          <Dropdown
            key={style}
            label={style === 'classic' ? 'İşlemler' : style}
            style={style}
            items={items}
            selectedKey="copy"
            onSelect={setAction}
          />
        ))}
        <Checkbox data-testid="checkbox">Seç</Checkbox>
        <output data-testid="action">{action}</output>
      </section>
      <section className="controls-demo-row controls-demo-isolated">
        <SplitDropdown
          label="Dışa aktar"
          menuLabel="Dışa aktarma seçenekleri"
          items={items}
          onAction={() => setAction('export')}
          onSelect={setAction}
        />
      </section>
      {sizes.map((size) => (
        <section className="controls-demo-row" key={size} data-testid={`row-${size}`}>
          <Button size={size} data-testid={`button-${size}`}>
            Kaydet
          </Button>
          <Input aria-label="Ad" size={size} data-testid={`input-${size}`} />
          <Select
            aria-label="Durum"
            size={size}
            options={[
              { value: 'open', label: 'Açık' },
              { value: 'closed', label: 'Kapalı' },
            ]}
            defaultValue="open"
          />
          <InputNumber aria-label="Adet" size={size} data-testid={`number-${size}`} />
          <Link href="#example" size={size} data-testid={`link-${size}`}>
            Kartı gör
          </Link>
        </section>
      ))}
      <section className="controls-demo-row">
        <Radio.Button data-testid="radio">Birinci</Radio.Button>
        <Switch aria-label="Etkin" data-testid="switch" />
        <Tabs options={['Gün', 'Ay']} data-testid="tabs" />
        <Tag data-testid="tag">Açık</Tag>
        <Card id="example" data-testid="card">
          Örnek kart
        </Card>
      </section>
    </main>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <AppProviders>
      <ControlsDemo />
    </AppProviders>,
  );
}
