# Koleksiyon düzeltmesi 3 denetimi

Denetim 23 Kasım 2026 Pazartesi günü yapıldı.
Dal `main` (`beb0395`) üstüne alındı.
Kod yalnız `src/views/collection/` klasöründe değişti.
Kök ayarlar ve başka işlerin dosyaları değiştirilmedi.

## İnceleme 2 bulgularının ve sonraki parçanın durumu

| Madde | Sonuç ve kanıt |
| --- | --- |
| 1. `git rebase main` | Tamamlandı. Dal `beb0395` üstüne çakışmasız alındı. |
| 2. Önemli 1: iPhone 13 Select ok tuşu kararsızlığı | Düzeltildi. Kök neden bulundu, bileşen ve test düzeltildi; `--repeat-each 20` ile 20/20 geçti. |
| 3. README ve metadata örneği | Güncellendi. `README.md` ve `example.ts`, `api-client` işinin `getDocType` / `sampleDocTypeMeta` sahte yanıtına bağlandı; `model.test.ts` MSW üzerinden doğruladı. |
| 4. `/api/v2/document` liste ucu | Kaydedildi. Liste ve sayfalama için Frappe `/api/v2/document` ucu kullanılacak; `api-client` tipli istemciyi `main` dalına getirdiğinde geçici liste uyarlayıcısı kaldırılıp bağlanacak. |
| 5. Sunucu gruplu sayım ve toplam ucu | Korundu. Arka uçtaki yeni özet ucu `main` dalına gelene kadar `enableExperimentalCollectionViews` varsayılan olarak `false` kalır ve beş özet görünüm kapalıdır. |
| 6. Küçük 3 ve 4 kaldırma koşulları | Eklendi. `collection.css` içindeki odak ve dokunma alanı kopyalarının başına “`foundation` `main` dalına girince bu kopya silinir” koşulu yazıldı. |
| Önemli 2 / Önemli 3: Kök Playwright keşfi | Açık, `foundation` işine bağlıdır. Kök `playwright.config.ts` bu dalda hâlâ yalnız `./tests/e2e` klasörünü koşar. |

## Önemli 1 kök neden analizi ve düzeltme

İnceleme 2'deki `iphone-13` profilinde Select ok tuşu hatası olay iziyle yeniden üretildi (60 tekrarlık ön tanılamada 3/60 hata yakalandı):

1. **Bileşen nedeni (`CollectionControls.tsx`):** Dokunmatik tıklamadan sonra `Select` içindeki arama girdisi odaklandığında mobil WebKit sayfayı yumuşak kaydırır (`scrollY` değişir). Kaydırma bittiğinde WebKit, işaretçi hiç hareket etmediği hâlde son dokunma koordinatında (`clientX`, `clientY` sabit) yapay bir `mousemove` olayı üretir. Bu sırada açılır liste kaydırma nedeniyle o koordinatın altına geldiği için `rc-select` içindeki `OptionList` `onMouseMove` işleyicisi çalışır ve `ArrowDown` ile `_1` seçeneğine geçen etkin öğeyi yeniden `_0` seçeneğine döndürür. `CollectionSelect`, açık antd `popupRender` API'si üzerinden `onMouseMoveCapture` ile işaretçi koordinatı son dokunma veya tuş olayından beri anlamlı biçimde (> 1 CSS px) değişmediyse bu yapay `mousemove` yayılımını durdurur; gerçek fare hareketinde ise seçenek vurgusu normal çalışır.
2. **Test nedeni (`e2e/collection.spec.ts`):** `rc-motion`, açılır listeyi ilk karede `-prepare` aşamasında görünür kılar ve CSS animasyonunu bir sonraki animasyon karesinde başlatır. `element.getAnimations()` ilk karede çağrıldığında boş dizi döndürerek 500 ms açılış hareketini beklemeden geçebiliyordu. Test, `getAnimations()` çağrısından önce iki `requestAnimationFrame` bekleyerek açılış hareketinin gerçekten başlayıp bitmesini doğrular.

## Çalıştırılan kontroller

| Kontrol | Sonuç | Kanıt |
| --- | --- | --- |
| `npm run lint` | pass | ESLint ve Prettier temiz |
| `npm run typecheck` | pass | `api:types:check`, `tsconfig.json` ve `tsconfig.node.json` temiz |
| `npm test` | pass, 235 test (koleksiyonda 36 test) | 21 test dosyası geçti |
| Kök `npm run test:e2e` | pass, 40 test | `./tests/e2e` geçti; koleksiyon e2e yolunu henüz kapsamaz |
| iPhone 13 Select testi `--repeat-each 20` | pass, 20/20 test | `.pane/qa/duzeltme-3-iphone-repeat20.json` |
| Koleksiyon Playwright matrisi (Chromium, WebKit, iPhone 13) | pass, 60/60 test | `.pane/qa/duzeltme-3-accepted.json` |
| Gerçek Safari ve fiziksel telefon | not_run | Emülasyon bunların yerine geçmez |
| CI ve canlı dağıtım | not_run | Yerel başarı bunların yerine geçmez |
| Firefox | not_applicable | Proje kararı gereği çalıştırılmadı |
| Piksel farkı karşılaştırması | not_run | Onaylı görüntü tabanı yoktur |
| Gerçek zoom ve sanal klavye | not_run | Kök yazı boyutu denemesi bunların yerine geçmez |

Koşulan `iphone-13` `--repeat-each 20` turunda (20/20), WebKit `iphone-13` 60 tekrarlık tanılama turunda (60/60) ve 60 testlik tam Chromium/WebKit/iPhone 13 matrisinde (`expected: 60, skipped: 0, unexpected: 0, flaky: 0`) başarısız, atlanan veya yeniden denenen test görülmedi.
Bu ölçüm, çalıştırılan yerel emülasyon turlarını kapsar; gerçek cihaz ve CI ortamının yerine geçmez.

Çalıştırılan koleksiyon tarayıcı komutları şunlardır:

```sh
npx playwright test --config .pane/qa/correction.config.mjs src/views/collection/e2e/collection.spec.ts -g "expanded input and select targets" --project iphone-13 --repeat-each 20 --workers 4
npx playwright test --config .pane/qa/correction.config.mjs --output .pane/qa/duzeltme-3-results --workers 4
```

## Önce başarısız test kanıtı

`ab9b39d` commit'i düzeltmeden önce iki başarısız regresyon testini kaydetti (`.pane/qa/duzeltme-3-red.log`):

1. `corrections.test.tsx`: Kaydırma kaynaklı sabit koordinatlı `mousemove` olayının `ArrowDown` ile seçilen `_1` etkin seçeneğini `rc_select_TEST_OR_SSR_list_0` değerine sıfırladığını yakaladı.
2. `model.test.ts`: `apiClient.getDocType` sahte yanıtının `createDefinition` ile çalıştığını ve `exampleMeta` zarfının henüz `sampleDocTypeMeta` yanıtına bağlı olmadığını (`"example-only"`) yakaladı.

Düzeltmeden sonra her iki test ve tüm birim/tarayıcı turları geçti.

## Ortam ve ağ ölçümü

Çalışan sistem macOS, Node 24.21.0, Chromium 159.0.8154.6 ve WebKit 27.2 sürümlerindedir.
Chromium genişlikleri 320, 360, 375, 390, 844, 1024 ve 1440 CSS px değerleridir.
WebKit 320 ve 1440 CSS px genişliklerde ve `iphone-13` (390 × 664 CSS px) benzetim profilinde denendi.

320 piksel Chromium ölçümünde (`.pane/qa/duzeltme-3-accepted.json`):

- Ana önizleme dosyası (`index-COQT8UaU.js`): `198782` sıkıştırılmış bayt (`618590` açılmış bayt).
- Beş ek görünüm açıldığında toplam JavaScript: `202399` sıkıştırılmış bayt (`624567` açılmış bayt).
- Varsayılan tablo açılışında ve kapalı görünüm adreslerinde (`?view=pivot`) beş ek görünümün hiçbir parçası indirilmedi.

## Devir ve sınırlar

- **Foundation devri:** Kök `playwright.config.ts` dosyasına `src/views/**/e2e` yolu ve önizleme sunucusu eklenmelidir. `foundation` `main` dalına girdiğinde `collection.css` başındaki işaretli odak ve dokunma alanı kopyaları ile `preview/` geçici köprü dosyaları silinmelidir.
- **API istemcisi devri:** Frappe `/api/v2/document` tipli istemcisi ve MSW işleyicisi `main` dalına girdiğinde `example.ts` içindeki yerel liste uyarlayıcısı silinip doğrudan tipli istemciye bağlanmalıdır.
- **Arka uç özet ucu devri:** Gruplu sayım ve toplam ucu `main` dalına gelene kadar `enableExperimentalCollectionViews` varsayılan `false` kalmalıdır.
- Push veya canlı dağıtım yapılmadı. Gerçek okurla denenmedi.
