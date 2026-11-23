import { Typography } from 'antd';

import messages from './messages.json';

/** Sahte sunucu açıkken ekranda “Örnek veri” yazar (SZ-12). */
export function SampleDataNotice() {
  return (
    // K3: metin ekran kenarına yapışmaz. Kenar boşluğu boşluk tokenıdır (`--space-md`).
    <Typography.Paragraph
      role="status"
      type="secondary"
      style={{
        margin: 0,
        paddingBlock: 'var(--space-xxs)',
        paddingInline:
          'max(var(--space-md), env(safe-area-inset-left)) max(var(--space-md), env(safe-area-inset-right))',
      }}
    >
      {messages.tr.sample_data_notice}
    </Typography.Paragraph>
  );
}
