/**
 * AI Studio deneme sayfası. Yalnız geliştirme sunucusunda açılır.
 * Adres: /src/ai/dev/studio.html
 * Uygulama yönlendirmesi `foundation` işine aittir. Sayfa oraya bağlanınca
 * bu dosya yalnız tarayıcı testleri için kalır.
 */
import '@fontsource-variable/outfit';
import '@fontsource/jetbrains-mono/400.css';

import config from '@design-source/control-size-config.json';
import { ConfigProvider, theme } from 'antd';
import type { ThemeConfig } from 'antd';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AiStudio } from '../studio/AiStudio';

const dark = config.theme.mode === 'dark';
const derived = config.derived.antdTheme as ThemeConfig;
const appTheme: ThemeConfig = {
  ...derived,
  token: {
    ...derived.token,
    fontFamily: "'Outfit Variable', system-ui, sans-serif",
    fontFamilyCode: "'JetBrains Mono', ui-monospace, monospace",
  },
  algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
};

const container = document.getElementById('root');
if (!container) throw new Error('Kök öğe bulunamadı: #root');

document.documentElement.style.height = '100%';
document.body.style.margin = '0';
document.body.style.height = '100%';
container.style.height = '100dvh';

createRoot(container).render(
  <StrictMode>
    <ConfigProvider theme={appTheme}>
      <div style={{ height: '100%', background: appTheme.token?.colorBgLayout }}>
        <AiStudio />
      </div>
    </ConfigProvider>
  </StrictMode>,
);
