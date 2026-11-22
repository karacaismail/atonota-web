# Uygulama kabuğu (`src/shell/`)

Bu klasör uygulamanın kabuğudur. Kabukta sidebar, sayfa başlığı ve yönlendirme vardır. Kararlar `design/source/control-size-config.json` dosyasından gelir.

## Telefon kararı: çekmece

Telefonda sidebar çekmeceye dönüşür. Alt gezinme kullanılmaz.

Gerekçeler şunlardır:

1. Sidebar yalnız bağlantı listesi değildir. İçinde komut alanı, AI ajanları, çalışma alanı seçici ve kredi kartı vardır. Alt gezinme en çok 4 ya da 5 bağlantı taşır. Bu parçalar oraya sığmaz.
2. Kaynak kural S4 şöyle der: AI öğeleri gezinmeyle eşit ağırlıktadır. Alt gezinme AI öğelerini ikinci plana iterdi.
3. Çekmece masaüstüyle aynı içeriği taşır. Kullanıcı iki ayrı düzen öğrenmez.

Telefonda alt menü sağda açılmaz. Ekranda yer yoktur. Alt menü üst öğenin altında, çekmecenin içinde açılır. Açmak için üst öğeye dokunun. İkinci dokunuş alt menüyü kapatır. Klavye kuralları aynıdır.

## Ne zaman telefon kabuğu açılır

Telefon kabuğu şu sorguyla açılır: `(max-width: 767px), (max-height: 499px)`.

- Genişlik 767 px ya da altındaysa telefon kabuğu açılır.
- Yükseklik 499 px ya da altındaysa da telefon kabuğu açılır. Yatay telefon bu yüzden telefon kabuğunda kalır.
- Tablet ve masaüstü geniş kabuğu kullanır.

Sidebar her iki kabukta aynı DOM yerindedir. Kabuk değişince sidebar yeniden kurulmaz. Bu yüzden yön değişiminde açık panel ve odak korunur.

## Geniş ekran

- Solid varsayılandır. Genişlik 288 px olur.
- Rail isteğe bağlıdır. Genişlik 68 px olur. Anahtar sidebar başlığındadır.
- Rail tercihi tarayıcıda saklanır. Saklama kapalıysa tercih yalnız o oturumda kalır.
- Alt menü sağdaki panelde açılır. Kurallar F1–F6 maddeleridir.

Alt menü şu yollarla açılır:

1. Fare öğenin üzerine gelir. Panel 60 ms sonra açılır.
2. Klavye odağı öğeye gelir. Panel hemen açılır.
3. Kullanıcı öğeye tıklar ya da dokunur.

Klavye kuralları şunlardır:

- Sağ ok panelin ilk öğesine geçer.
- Aşağı ve yukarı ok panel içinde gezinir.
- Sol ok ya da Escape paneli kapatır. Odak üst öğeye döner.
- Üst öğede Escape paneli kapatır. Odak üst öğede kalır.

## Kayan hover zemini (G1–G3)

Fare menü öğesinin üzerine gelince açık renkli bir zemin belirir. Zemin öğeden öğeye kayar. Süre 200 ms'dir.

- Fare menüye dışarıdan girerse zemin hareketsiz yerleşir.
- Fare menüden çıkarsa zemin yerinde solar.
- Klavye odağı da zemini taşır.

## Sayfa başlığı

Varsayılan çeşit "Araç çubuklu" çeşittir. Kurallar HD1–HD6 ve VT1–VT3 maddeleridir.

Başlık yedi veri durumunu gösterir: normal, canlı, yükleniyor, boş, hata, seçim ve kaydedilmemiş.

Geniş ekranda başlık sabit kalır. Sayfa gövdesi başlığın altında kayar. Gövde kayınca başlığın altında gölge belirir.

Telefonda başlık sayfayla birlikte kayar. Telefon ekranı kısadır. Sabit başlık içeriğin çoğunu kapatırdı. Telefonda yalnız üst çubuk sabittir. Üst çubukta menü düğmesi vardır.

## Rotalar

Rota kaydı `routes.ts` dosyasındadır. Adres yardımcıları `paths.ts` dosyasındadır.

Her iş kendi sayfası için `routes.ts` dosyasına tek bir satır ekler. Satırın dört alanı vardır:

1. `path`: react-router yolu.
2. `label`: menü etiketi.
3. `icon`: Phosphor ikonu.
4. `load`: tembel yükleyici. Örnek: `() => import('@/modules/satis/TeklifPage')`.

Kuralın tamamı dosyanın başındaki yorumdadır. `routes.test.ts` biçimi denetler.

Sayfalar `React.lazy` ile yüklenir. Kabuk hemen çizilir. Sayfa gelene kadar yalnız içerik alanı bekler.

Adres örnekleri şunlardır:

- `/` ana sayfadır.
- `/satis/teklif` bir koleksiyon sayfasıdır.
- `/satis/teklif?gorunum=kanban` aynı sayfanın Kanban görünümüdür.
- `/satis/teklif/TEK-0003` tek kayıt sayfasıdır.

Örnek sayfalarda veri durumu adresle seçilebilir. Örneğin `?durum=hata` hata durumunu gösterir. Değerler şunlardır: `canli`, `yukleniyor`, `bos` ve `hata`.

## Geçici bağlantılar

`foundation` işi iki parçayı henüz `main` dalına koymadı. Kabuk bu parçaları geçici olarak kendisi kurar.

1. **Tokenlar.** `tokens.ts` değerleri kaynak dosyadan okur. `src/design/` dışa aktarımı gelince `tokens.ts` oradan okuyacak.
2. **Odak perdesi.** `focus-dim/` klasörü D1–D5 kararını uygular. `src/engines/focus-dim/` gelince `useFocusDim` o motoru çağıracak.

3. **Adlı değerler.** `shell.css` dosyasının başında adlı değer bölümü vardır. Kaynakta karşılığı olmayan boşluk, ölçü ve süreler oradadır. `foundation` boşluk ve hareket tokenlarını koyunca bölüm oraya taşınır. Bölüm dışında sabit değer yazılmaz. `shellCss.test.ts` bunu denetler.

Bileşenler yalnız `useFocusDim` kancasını ve `shellTokens` nesnesini kullanır. Bu yüzden geçişte bileşen kodu değişmez.

## Denemeler

Birim testleri `npm test` ile koşar.

Tarayıcı testleri kabuk deneme sayfasında koşar. Komut şudur:

```bash
npx playwright test -c src/shell/e2e/playwright.config.mjs
```

Testler `src/shell/e2e/` altında kalır. Kök Playwright ayarı bu klasörü de okuyacak. O zamana kadar kabuk ayarı kullanılır.

Matris kök ayarla aynıdır: Chromium ve WebKit, iPhone 13 profili. Firefox koşulmaz.

Deneme sayfası `harness/` klasöründedir. Tema geçicidir. `?tema=acik` adresi açık temayı açar.
