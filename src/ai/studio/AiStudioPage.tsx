import { AiStudio } from './AiStudio';

/**
 * AI Studio sayfası. Kabuk `/panel/ai` yolunda bu dosyayı tembel yükler (`src/shell/routes.ts`).
 * Taşıyıcı verilmez. AiStudio sahte taşıyıcıyı kullanır ve kaynağı ekranda gösterir (AX-7).
 * Gerçek model geçidi bağlantısı `api-client` ile sonraki işte kurulur.
 */
export default function AiStudioPage() {
  return <AiStudio />;
}
