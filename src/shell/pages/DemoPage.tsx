import { Link } from 'react-router-dom';

import { PageHeader } from '../header/PageHeader';
import { t } from '../messages';
import { routes } from '../paths';

const noop = () => undefined;

/**
 * Kabuğun deneme sayfası. Yalnız e2e derlemesinde `/_demo/shell` yolunda açılır.
 * Menü burada örnek gruplarla çizilir. Sayfada ekmek kırıntısı bağlantısı ve metin bağlantısı var.
 * Tarayıcı testleri odak, alt çizgi ve dokunma alanını bu öğelerde dener.
 */
export default function DemoPage() {
  return (
    <div className="shell-page">
      <PageHeader
        title={t.demo.title}
        crumbs={[{ label: t.pages.home, to: routes.home() }, { label: t.demo.title }]}
        view="report"
        onViewChange={noop}
        state={{ kind: 'normal', syncedAt: '10:42' }}
      />
      <div className="shell-body">
        <p className="shell-muted">{t.pages.sample}</p>
        <p>
          {t.demo.linkBefore} <Link to={routes.assistant()}>{t.demo.link}</Link> {t.demo.linkAfter}
        </p>
      </div>
    </div>
  );
}
