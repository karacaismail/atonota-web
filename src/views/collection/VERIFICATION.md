# Koleksiyon canlı API bağlantısı denetimi

Denetim 23 Kasım 2026 Pazartesi günü yapıldı.
Dal `collection-live-r2` adını taşır. Dal `main` (`f439e88`) üstünden açıldı.
Kod yalnız `src/views/collection/` klasöründe değişti.

## Yapılan işler

| Madde | Sonuç |
| --- | --- |
| 1. Liste ve sayfalama | `createApiSource` ortak `listDocuments` istemcisine bağlandı. `example.ts` ve `fixtures/example-collection.json` silindi. Testler MSW kullanır. |
| 2. Özet arayüzü | `CollectionSummarySource`, `toGroupSummaryRequest` ve `parseGroupSummary` eklendi. Pivot ve Rapor bu kaynağı kullanır. Görünümler varsayılan olarak kapalıdır. |
| 3. Toplam sayı | `total` alanı kaldırıldı. Sayfalama yalnız `hasNextPage` ile çalışır. |

## Çalıştırılan kontroller

| Kontrol | Sonuç | Kanıt |
| --- | --- | --- |
| `npm run lint` | pass | ESLint ve Prettier temiz |
| `npm run typecheck` | pass | Üç tip denetimi temiz |
| `npm test` | pass, 345 test | 30 test dosyası geçti. Koleksiyonda 62 test var. |
| Kök `npm run test:e2e` (`E2E_PORT=4391`) | pass, 40 test | `./tests/e2e` geçti. Koleksiyon yolunu kapsamaz. |
| Koleksiyon Playwright matrisi | pass, 60 test | `expected: 60, unexpected: 0, flaky: 0` |
| Gerçek Safari ve fiziksel telefon | not_run | Emülasyon bunların yerine geçmez. |
| CI ve canlı dağıtım | not_run | Yerel başarı bunların yerine geçmez. |
| Firefox | not_applicable | Proje kararı gereği koşulmadı. |
| Piksel farkı karşılaştırması | not_run | Onaylı görüntü tabanı yoktur. |

Koleksiyon matrisi şu komutla koşuldu:

```sh
npx playwright test --config .pane/qa/collection.config.mjs --workers 4
```

Ayar dosyası Git'e girmez. Ayar kök `playwright.config.ts` projelerini kullanır.
Ayar önizlemeyi `src/views/collection/qa/serve.mjs` ile 4319 portunda açar.

## Ortam

Sistem macOS, Node 24.21.0 ve Playwright 1.65.1 sürümündedir.
Chromium genişlikleri 320, 360, 375, 390, 844, 1024 ve 1440 CSS px değerleridir.
WebKit 320 ve 1440 CSS px genişlikte denendi. `iphone-13` profili de denendi.

## Önce başarısız test

Testler koddan önce yazıldı ve önce başarısız oldu:

1. `api-source.test.ts` ve `summary.test.ts` başarısız oldu. Çünkü `api-source.ts` ve `summary.ts` yoktu.
2. Görünüm testlerinden 10 tanesi başarısız oldu. Örneğin “Sonraki sayfa” düğmesi `hasNextPage` alanını okumuyordu.

## Bilinen sınırlar

- Ortak sahte sunucu `like` süzgecini desteklemez. Arama sonucu sahte sunucuda boş gelir. Tarayıcı testi bu yüzden yalnız giden isteği denetler.
- Ortak sahte sunucu `amount desc, name asc` gibi iki parçalı sıralamayı doğru okumaz. Yön `desc` olarak okunur.
- `src/mocks/browser.ts` işçiyi `onUnhandledFrame: 'error'` ile açar. İşçi sayfayı denetlerken ikinci sayfa yüklemesi bozulur. Önizleme bu yüzden işçiyi aynı işleyicilerle ama `bypass` ayarıyla açar.
- Bu üç madde `api-client` işinin dosyalarındadır. Bu dalda değiştirilmedi.
- Push veya canlı dağıtım yapılmadı. Gerçek okurla denenmedi.
