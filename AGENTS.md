# atonota-web: ajan talimatları

Bu depo Atonota platformunun ayrı arayüzüdür. İngilizcesi "headless frontend" olarak geçer. Arayüz Frappe arka ucunu yalnız API ile kullanır. Arka uç ayrı bir depodadır: `frappesetup` deposunun `backend/` klasörü.

Bu dosya bütün ajanlar ve insanlar için geçerlidir. Kurallar kalıcıdır.

## Amaç

- Bu depo tam bir SaaS panelidir. Panel Frappe arka ucunun bütün arayüz ihtiyacını karşılar. Frappe'nin kendi masaüstü arayüzü kullanıcıya açılmaz.
- Arayüz önce yapay zekâ için tasarlanır. İngilizcesi "AI first" olarak geçer.
- Arayüz önce telefon ekranı için kurulur. Kabul 320 CSS px genişlikte başlar.
- Teslim cihazın yeteneğine uyarlanır. İngilizcesi "adaptive delivery" olarak geçer. Telefon gereksiz masaüstü kodunu indirmez.
- Bütün görsel kararlar `design/source/` klasöründeki dosyalardan gelir. Bu dosyalar projenin standardı, örneği ve tasarım dilidir.
- Kaynak dosyalar masaüstü örnekleriyle yazıldı. Telefonda aynı tasarım dili korunur. Yerleşim telefon için yeniden kurulur.

## Karar kaynakları

Bu üç dosya proje sahibinin kesin kararlarıdır:

1. `design/source/control-size-config.json`: ölçüler, renkler, gölgeler ve bileşen kuralları.
2. `design/source/design-system.json`: aynı kararların özeti ve bileşen envanteri.
3. `design/source/control-size-engine.html`: kararların çalışan örneği.

Mimari ve kod kuralları `docs/standards/headless-frontend-standartlari.md` dosyasındadır. Bu dosya `frappesetup` deposundaki proje standardının kopyasıdır. Görsel dil kaynak dosyalardan, mimari bu standarttan gelir.

Dosyalardaki "locked", "decision" ve "son karar" alanları değişmez. Bir karar bu dosyayla çelişirse kaynak dosya esas alınır. Bunun tek istisnası aşağıdaki "Ortak kurallarla ilişki" bölümüdür.

Örnek dosyalardaki kişi adları "Örnek Kişi" gibi etiketlerle değiştirildi. Arayüzde gerçek görünümlü kişi adı, telefon ya da e-posta kullanılmaz.

## Teknik kararlar

Bu kararlar orkestratörün kararlarıdır. Kayıt tarihi 23 Kasım 2026 Pazartesi günüdür.

| Konu | Karar |
| --- | --- |
| Arayüz kütüphanesi | React 18.3 ve TypeScript, katı mod |
| Derleme | Vite |
| Bileşenler | `antd` 5.29.3 ve `@ant-design/x` 1.6.1 |
| İkonlar | `@phosphor-icons/react`, ağırlık `regular` |
| Yazı tipi | Outfit (`@fontsource-variable/outfit`), kod için JetBrains Mono |
| Paket yöneticisi | npm ve `package-lock.json` |
| Birim testi | Vitest ve Testing Library |
| Tarayıcı testi | Playwright: Chromium, WebKit ve iPhone 13 profili. Firefox koşulmaz. |
| Erişilebilirlik testi | axe |
| Kimlik | Keycloak, OIDC ve PKCE. Sunucu `id.atonota.net`. |
| API istemcisi | Arka uç OpenAPI sözleşmelerinden üretilir. |
| Sahte sunucu | MSW. Geliştirme ve testler gerçek arka uca bağlı değildir. |

## Klasör sahipliği

Her iş yalnız kendi klasörünü değiştirir. Ortak dosya gerekiyorsa raporda istenir.

| Klasör | Sahip iş |
| --- | --- |
| `package.json`, `vite.config.ts`, `.github/`, `src/design/`, `src/engines/`, `src/app/`, `tests/setup/` | `foundation` |
| `src/components/controls/` | `controls` |
| `src/shell/` | `shell` |
| `src/ai/`, `src/genui/`, `src/mascot/` | `ai-studio` |
| `src/api/`, `src/auth/`, `contracts/`, `src/mocks/` | `api-client` |
| `src/views/collection/` | `views-collection` |
| `src/views/record/` | `views-record` |
| `src/modules/` | `modules` |
| `src/adaptive/`, `tests/perf/` | `adaptive` |

`package.json` ya da ayar dosyası değişikliği gerekiyorsa iş bunu raporda ister. `foundation` işi ekler.

## Tasarım tokenları

- Tek kaynak `design/source/control-size-config.json` dosyasıdır.
- `src/design/` bu dosyadan antd teması ve CSS değişkenleri üretir.
- Bileşen içinde sabit renk, ölçü, gölge ya da süre yazılmaz. Değerler tokenlardan gelir.
- Açık ve koyu tema aynı tokenlardan üretilir.

## Ortak kurallarla ilişki

Proje sahibinin genel kuralları bu depoda da geçerlidir. İki kural için bu projede kayıtlı istisna vardır.

1. **Metin boyutu.** Genel kural en küçük okunur metni 14 px sayar. Bu projede kaynak dosya en küçük metni 12 px yapar. 10 px ve 9 px yalnız kaynak dosyadaki istisnalarda kullanılır. Bu istisnalar buton ve inputta kullanılmaz. Gövde metni 14 px kalır.
2. **Hareket.** Genel varsayılan eğri `cubic-bezier(.65, 0, .35, 1)` eğrisidir. Dropdown açılışı kaynak dosyadaki "Skew + Scale" hareketini kullanır. Süre 500 ms, eğri `cubic-bezier(.2, .9, .3, 1.15)` olur. Bütün süre ve eğriler merkezi tokendadır. `prefers-reduced-motion` açıksa hareket durur.

Şu genel kurallar istisnasız geçerlidir:

- **Odak.** Çevreleyen odak halkası yasaktır. antd'nin varsayılan odak çerçevesi kapatılır. Klavye odağı çevrelemeyen tek bir göstergeyle görünür. Örneğin alt çizgi kullanılabilir. `forced-colors: active` iken yalnız `outline: 2px solid CanvasText` kullanılır.
- **Kavisli vurgu kenarı yasaktır.** Köşesi yuvarlak kutunun tek kenarına renkli çizgi çizilmez. Kenar göstergesi kullanılacaksa o köşeler radiussuz olur. Örnek: sidebar aktif öğesinin 3 px göstergesi.
- **Tablolar** kendi kapsayıcısında yatay kayar. Sözcük ortasından bölünmez. Sayfa yatay taşmaz.
- **Açılır listeler** antd `Select` ile yapılır. Tarayıcının yerel `<select>` öğesi kullanılmaz.
- **Dokunma alanı** kaynak dosyadaki R1–R10 kurallarına uyar. Görünen alan × 1.12 olur.
- **Hover** hiçbir eylemin tek yolu değildir.

## Yapay zekâ kuralları

- Asistan yanıtı `{ text, steps, ui[] }` biçimindedir. Kurallar kaynak dosyadaki U1–U6 maddeleridir.
- `ui` blokları yalnız kayıtlı bileşenlerle çizilir. Bilinmeyen blok güvenli JSON görünümüne düşer.
- Onaysız eylem yoktur. Onay ve form blokları kullanıcı onayı olmadan işlem yapmaz.
- Sahte ilerleme gösterilmez. Gerçek araç olayı yoksa ilerleme çubuğu gösterilmez.
- Kodda model adı ya da model sağlayıcı kitaplığı yazılmaz. Arayüz arka ucun model geçidini kullanır.

## Test ve teslim

- Yeni ve anlamlı davranışta önce test yazılır. Test önce başarısız olmalıdır.
- Her bileşen 320, 360, 375, 390 px, yatay telefon, tablet ve masaüstünde denenir.
- Teslimden önce şu dört kapı geçmelidir: `npm run lint`, `npm run typecheck`, `npm test` ve `npm run test:e2e`.
- Çalıştırılmayan denetim `not_run` diye raporlanır.

## Git

- Commit'in yazarı ve committer'ı şu kimliktir: `karacaismail <35493655+karacaismail@users.noreply.github.com>`.
- Yapay zekâ ortak yazar satırı ve imzası eklenmez.
- Pane panelinde commit şu önekle atılır: `env -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL git commit`.
- `--no-verify` kullanılmaz. Yazar koruması atlatılmaz.
- Secret, gerçek `.env` ve kişisel veri depoya girmez.
- Depo herkese açıktır. Lisans sonraki iştir. Proje sahibi söylemeden lisans dosyası eklenmez ve lisans sorulmaz.

## Trunk tabanlı akış

- Ana dal `main` dalıdır. Bütün işler buraya sık ve küçük parçalarla birleşir.
- Her iş kısa ömürlü bir dalda çalışır. Dal adı iş adıdır. Örnek: `foundation`.
- İşçi push etmez. Orkestratör incelemeden ve kapılardan geçen işi `main` dalına birleştirir.
- Orkestratör her birleşmeden sonra `main` dalını hemen GitHub'a gönderir.
- Uzun süren iş de parça parça birleşir. Bitmemiş özellik varsayılan olarak kapalı bir ayarın arkasında durur.
