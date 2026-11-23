import { t } from '../messages';

/**
 * AI Studio yer tutucusu. `shellFeatures.aiStudio` kapalıyken bu sayfa açılmaz.
 * AI Studio `main` dalına girince `ai-studio` işi yükleyiciyi kendi sayfasına bağlar.
 * O zaman bu dosya silinir.
 */
export default function AiStudioPendingPage() {
  return (
    <div className="shell-page">
      <div className="shell-body">
        <h1 className="shell-h1">{t.pages.aiStudio}</h1>
        <p role="status">{t.pages.aiStudioPending}</p>
      </div>
    </div>
  );
}
