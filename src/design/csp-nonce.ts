// CSP nonce. Sunucu her sayfa için yeni bir değer üretir ve şu öğeye yazar:
// `<meta property="csp-nonce" nonce="...">` (frappesetup backend: platform_core/www/panel.html).
// Vite de bu öğeyi okur ve tembel parçaların stil bağlantılarına aynı değeri verir.
// Arayüz çalışma anında eklenen stil ve betik öğelerine bu değeri verir. Değer yoksa arayüz yine çalışır.

/** Sayfadaki nonce değerini okur. Değer yoksa ya da boşsa `undefined` döner. */
export function readCspNonce(doc: Document | undefined = globalThis.document): string | undefined {
  const meta = doc?.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]');
  // Tarayıcı nonce özniteliğini gizler; değer `nonce` özelliğinden okunur.
  const value = meta?.nonce || meta?.getAttribute('nonce') || '';
  return value === '' ? undefined : value;
}

const NONCE_TAGS = new Set(['style', 'script']);
const installed = new WeakMap<Document, string>();

/**
 * Belgede oluşturulan her `<style>` ve `<script>` öğesine nonce değerini verir.
 *
 * Neden: antd 5 (`@ant-design/cssinjs` 1.24) CSS değişkeni stillerini nonce olmadan ekler.
 * ConfigProvider `csp` ayarı bu öğelere ulaşmaz. Tarayıcı nonce değerini öğe belgeye girerken
 * denetler. Bu yüzden değer öğe oluşturulurken verilir. Nonce yoksa hiçbir şey değişmez.
 * Çağrı tekrarlanabilir. Aynı belgeye ikinci kez kurulmaz.
 */
export function installCspNonce(doc: Document | undefined = globalThis.document): string | undefined {
  if (!doc) return undefined;
  const done = installed.get(doc);
  if (done !== undefined) return done;
  const nonce = readCspNonce(doc);
  if (!nonce) return undefined;
  const original = doc.createElement;
  doc.createElement = function createElementWithNonce(
    this: Document,
    tagName: string,
    options?: ElementCreationOptions,
  ): HTMLElement {
    const element = original.call(this, tagName, options);
    if (NONCE_TAGS.has(tagName.toLowerCase()) && !element.nonce) element.nonce = nonce;
    return element;
  } as Document['createElement'];
  installed.set(doc, nonce);
  return nonce;
}
