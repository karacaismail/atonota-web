import { createRoot } from 'react-dom/client';
import { useState } from 'react';

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
  Switch,
  Tabs,
  Tag,
} from '..';

const root = document.getElementById('root');
const sizes = ['small', 'middle', 'large'] as const;

export function ControlsDemo() {
  const [action, setAction] = useState('');

  return (
    <main>
      <section>
        <Dropdown
          label="İşlemler"
          items={[{ key: 'edit', label: 'Düzenle' }]}
          onSelect={setAction}
        />
        <Checkbox data-testid="checkbox">Seç</Checkbox>
        <output>{action}</output>
      </section>
      {sizes.map((size) => (
        <section key={size}>
          <Button size={size} data-testid={`button-${size}`}>
            Kaydet
          </Button>
          <Input aria-label="Ad" size={size} data-testid={`input-${size}`} />
          <Select
            aria-label="Durum"
            size={size}
            data-testid={`select-${size}`}
            options={[{ value: 'open', label: 'Açık' }]}
          />
          <InputNumber aria-label="Adet" size={size} data-testid={`number-${size}`} />
          <Link href="#example" data-testid={`link-${size}`}>
            Kartı gör
          </Link>
        </section>
      ))}
      <section>
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

if (root) createRoot(root).render(<ControlsDemo />);
