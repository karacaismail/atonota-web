import { Typography } from 'antd';

import messages from './messages.json';

/** Sahte sunucu açıkken ekranda “Örnek veri” yazar (SZ-12). */
export function SampleDataNotice() {
  return (
    <Typography.Paragraph role="status" type="secondary">
      {messages.tr.sample_data_notice}
    </Typography.Paragraph>
  );
}
