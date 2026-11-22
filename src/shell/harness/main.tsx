/**
 * Kabuk deneme sayfası. Yalnız geliştirme ve tarayıcı testleri içindir.
 *
 * GEÇİCİ: Tema `foundation` işinin `src/app/` sağlayıcısına taşınınca
 * bu sayfa da onu kullanacak. Şimdilik kaynak dosyadaki türetilmiş
 * antd temasını doğrudan verir.
 */
import '@fontsource-variable/outfit';
import '@fontsource/jetbrains-mono/400.css';

import config from '@design-source/control-size-config.json';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import trTR from 'antd/locale/tr_TR';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ShellApp } from '../ShellApp';
import { hexToRgba } from '../tokens';

const light = new URLSearchParams(window.location.search).get('tema') === 'acik';
const base = config.derived.antdTheme;
const token = light
  ? {
      colorPrimary: base.token.colorPrimary,
      colorPrimaryHover: base.token.colorPrimaryHover,
      colorPrimaryActive: base.token.colorPrimaryActive,
      fontSize: base.token.fontSize,
      controlHeight: base.token.controlHeight,
      controlHeightSM: base.token.controlHeightSM,
      controlHeightLG: base.token.controlHeightLG,
      borderRadius: base.token.borderRadius,
    }
  : base.token;

// Kaynak karar D06: açık temada birincil metin siyah %85.
// Koyu temada metin birincil renk %85, zemin birincil renk %14.
const pr = config.primary;
const buttonTokens = light
  ? { primaryColor: hexToRgba(pr.light.text, pr.light.opacity) }
  : {
      primaryColor: hexToRgba(pr.dark.text, pr.dark.opacity),
      colorPrimary: hexToRgba(pr.color, pr.dark.background),
      colorPrimaryHover: hexToRgba(pr.color, pr.dark.hoverBackground),
      colorPrimaryActive: hexToRgba(pr.color, pr.dark.activeBackground),
    };

const container = document.getElementById('root');
if (!container) throw new Error('Kök öğe bulunamadı: #root');

createRoot(container).render(
  <StrictMode>
    <ConfigProvider
      locale={trTR}
      theme={{
        algorithm: light ? theme.defaultAlgorithm : theme.darkAlgorithm,
        token: { ...token, fontFamily: "'Outfit Variable', system-ui, sans-serif" },
        components: light
          ? { Button: buttonTokens }
          : { ...base.components, Button: { ...base.components.Button, ...buttonTokens } },
      }}
    >
      <AntApp>
        <ShellApp />
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
