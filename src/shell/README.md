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

Her iş kendi sayfası için `lazyRoutes` listesine yalnız kendi satırını ekler. Başka işin satırı değiştirilmez. Satırın dört alanı vardır:

1. `path`: react-router yolu.
2. `label`: menü etiketi.
3. `icon`: Phosphor ikonu.
4. `load`: tembel yükleyici. Örnek: `() => import('@/modules/satis/TeklifPage')`.

Kuralın tamamı dosyanın başındaki yorumdadır. `routes.test.ts` biçimi denetler.

`ShellApp` rotaları şu sırayla ekler:

1. `lazyRoutes` satırları.
2. Koleksiyon yolları (`collectionRoutes`). Bu yolların sahibi kabuktur.
3. Bilinmeyen adres için "Sayfa bulunamadı".

Modül sayfaları `src/modules/registry.ts` dosyasındaki `moduleRegistrations` listesinden gelir. Kabuk her kaydı `lazyRoutes` listesine bir satır olarak ekler. Menü etiketi kaydın Türkçe adıdır. Modüller menüde "Asistan" bağlantısından sonra görünür. Sayfa dosyası yalnız sayfa açılınca istenir.

## Panel yolu

Canlıda panel `/panel/` yolunda sunulur. Yerel geliştirme kök yolda çalışır.

- Yolu derleme ayarı belirler: `vite/base-path.ts`. Üretim kipi `/panel/` kullanır. Geliştirme ve e2e kipi `/` kullanır.
- `ATONOTA_BASE` ortam değişkeni varsayılanı ezer. Örnek: `ATONOTA_BASE=/ npm run build`.
- Router `basename` değerini `import.meta.env.BASE_URL` değerinden alır. Rota kayıtları önek yazmaz.
- Kabuk rotalarındaki `/panel/ai` yolu canlıda `/panel/panel/ai` olur. Yol çalışır. Adı sadeleştirmek ayrı bir iştir.
- Uygulama içindeki yol `src/app/base-path.ts` ile bulunur. Örnek: `/panel/atonota-login` için `/atonota-login`.
- Girişten dönüş adresi tarayıcının tam yoludur. Yani canlıda `/panel/` öneki de gider.

## Menü verisi

Menü yalnız açılabilen sayfaları gösterir. Menüyü `nav.ts` dosyası kurar. Sıra şöyledir:

1. Rota kaydındaki parametresiz sayfalar gelir. Modül kayıtları da bu listededir.
2. Sonra sunucunun sidebar grupları gelir. Uygulama girişi grupları `viewData.navigation` alanıyla verir.

Gruplar açılış verisinden (`get_bootstrap`) gelir. Grupta yalnız DocType bağlantıları vardır. Sahte sunucunun açılış verisinde grup yoktur. Bu yüzden sahte sunucuyla menüde grup görünmez.

### Yetki süzgeci (G-94)

Menü, kullanıcının açamadığı sayfayı göstermez. Süzgeç `nav.ts` içindeki `permittedNav` işlevidir.

1. Modül kaydı, sayfanın okuduğu DocType adlarını `requires` alanında yazar. Örneğin "İzin talepleri" sayfası `Leave Application` türünü okur.
2. Kabuk bu türleri `viewData.navigation.loadReadable` ile sunucuya sorar.
3. Uygulama girişi her tür için tanım ucunu (`get_doctype`) çağırır. Sunucu okuma yetkisi yoksa 403 verir.
4. Sunucunun sidebar grupları Frappe'nin izin süzgecinden geçmiştir. Gruptaki türler okunabilir sayılır.
5. Rota bağlantıları ve sunucu grupları aynı süzgeçten geçer. Hızlı eylemler de süzülmüş gruplardan gelir.

Kodda rol adı yoktur. Yetki bilgisi gelmezse menü yetki isteyen sayfayı göstermez.

Canlı menüde uydurma sayı yoktur. Ajan listesi için sunucuda veri yoktur. Bu yüzden canlı menüde ajan bölümü gizlidir. Üst çubuktaki çalışma alanı adı da gizlidir.

Örnek gruplar ve örnek ajanlar yalnız deneme sayfasında görünür. Deneme sayfası `/_demo/shell` adresidir. Bu sayfa yalnız e2e derlemesinde vardır. Flyout, kayan zemin ve bağlantı odağı testleri bu sayfada koşar.

Modül sayfası `ModuleProvider` içinde açılır. Ortamı uygulama girişi `viewData.modules` alanıyla verir. Ortamı `createShellModuleEnvironment` kurar. Bu işlev istemciyi `createModuleClient` ile ortak API istemcisinden yapar. Örnek:

```tsx
<ShellApp
  viewData={{
    modules: createShellModuleEnvironment({ api: session.api, tenant, user }),
  }}
/>
```

`user` değeri Frappe kullanıcı kimliğidir. Bu değer açılış verisindeki `user.name` alanıdır. Ortam verilmezse modül sayfası "Modül bağlantısı kurulmadı" yazar.

Bazı ilk adres parçaları ayrılmıştır: `_demo` ve `panel`. Bu adresler koleksiyon ya da kayıt sayfasına hiçbir zaman düşmez. Örneğin `/_demo/tablo` adresinin satırı yoksa "Sayfa bulunamadı" görünür.

AI Studio satırı `/panel/ai` adresidir. Satır `shellFeatures.aiStudio` ayarının arkasındadır. Ayar açıktır. Yükleyici `src/ai/studio/AiStudioPage.tsx` dosyasını tembel yükler.

Sayfa dosyası yüklenemezse "Sayfa yüklenemedi" görünür. Örneğin ağ kopmuş ya da yeni sürüm yayımlanmış olabilir. "Yeniden dene" düğmesi sayfayı yeniden yükler. Kabuk bu sırada yerinde kalır.

Sayfalar `React.lazy` ile yüklenir. Kabuk hemen çizilir. Sayfa gelene kadar yalnız içerik alanı bekler.

Adres örnekleri şunlardır:

- `/` ana sayfadır.
- `/satis/teklif` bir koleksiyon sayfasıdır.
- `/satis/teklif?gorunum=kanban` aynı sayfanın Kanban görünümüdür.
- `/satis/teklif/TEK-0003` tek kayıt sayfasıdır.

## Görünümler ve veri bağlantısı

Koleksiyonu yalnız `views-collection` işinin `CollectionView` bileşeni çizer. Kabuk kendi tablosunu çizmez.

Liste rotası `/:module/:doctype` adresidir. Bu rota `pages/CollectionRoute.tsx` dosyasını tembel yükler. Dosya önce liste tanımını getirir. Sonra `CollectionView` bileşenini çizer.

Kabuk API istemcisi kurmaz. Veri bağlantısını uygulama girişi verir. Örnek:

```tsx
<ShellApp
  viewData={{
    collection: {
      loadDefinition: ({ module, doctype }, signal) => /* API ile tanımı getir */,
      source: apiCollectionSource,
    },
  }}
/>
```

Bağlantı verilmezse liste sayfası "Veri kaynağı bağlı değil" yazar.

Kayıt rotası için de aynı kural geçerlidir. Uygulama girişi kayıt rotasını `views-record` işinin `RecordView` bileşenine bağlar. Kayıt istekleri oturumun ortak API istemcisinden geçer. Sayfa çerçevesini (`shell-page`, `shell-body`) kabuk çizer. Kayıt bileşeni yalnız içeriği verir. Kayıt bağlantısı yoksa `pages/RecordPage.tsx` örnek formu gösterir. Bu yalnız deneme sayfasında olur.

Liste tablosunda kayıt adı kayda giden bağlantıdır. Adresi kabuk verir: `routes.record(module, doctype, name)`.

## Yan menünün sunucu verisi

Bu bölüm 24 Kasım 2026 Salı günü yazıldı. Canlı panelde örnek veri gösterilmez. Örnek veri yalnız `/_demo/shell` deneme sayfasında görünür.

### Çalışma alanı seçici

- Veri `viewData.workspaces` alanından gelir. Tür `ShellWorkspaceData` türüdür.
- Bu sürümde çalışma alanı oturumun kiracısıdır. Kiracı, oturumun Frappe sitesidir.
- Uygulama girişi adı site adresinden kurar. Örnek: `https://acme.atonota.net` adresi `acme.atonota.net` adını verir.
- Tek çalışma alanı varsa seçici açılır liste değildir. Ad sade görünür ve Tab sırasına girmez.
- Birden çok çalışma alanı varsa seçici açılır liste olur.
- Veri yoksa yalnız logo görünür.

### Hızlı eylemler

- Hızlı eylemler sunucunun sidebar gruplarından gelir. Gruplar Frappe'nin izin süzgecinden geçer.
- Bu yüzden kullanıcının açamadığı sayfa hızlı eylem olmaz.
- En çok 3 eylem görünür. Sayı `QUICK_ACTION_LIMIT` sabitindedir.
- Liste boşsa bölüm çizilmez.

### AI kredisi

- Sayaç `viewData.credit.load` işlevinden okur. Tür `ShellCreditData` türüdür.
- İşlev `null` döndürürse sayaç görünmez. İstek başarısız olursa da sayaç görünmez.
- Bağlantı yoksa sayaç görünmez. Uydurma sayı gösterilmez.

Arka uçta kredi ucu yoktur. Önerilen sözleşme şudur:

- Uç adresi `GET /api/method/platform_core.api.model.get_credit` olur.
- Yanıt örneği `{ "message": { "used": 250, "total": 1000 } }` biçimindedir.
- `used` ve `total` sıfır ya da daha büyük tam sayıdır. `total` sıfırsa sayaç görünmez.
- Kiracının kredisi yoksa yanıt `{ "message": null }` olur.

Bu uç OpenAPI sözleşmesinde yoktur. API istemcisi OpenAPI sözleşmesinden üretilir. Bu yüzden istemciye ve sahte sunucuya elle uç eklenmedi. Uç arka uca eklenince `api-client` işi istemciyi üretir. Sonra uygulama girişi `credit.load` işlevini bağlar.

### AI Studio

- Taşıyıcı `viewData.ai` alanından gelir. Tür `ShellAiData` türüdür.
- Bağlantı yoksa AI Studio "AI Studio bağlantısı kurulmadı" yazar. Sahte ajan çalışmaz.
- Sahte taşıyıcı yalnız e2e derlemesinde açılır. Ekran kaynağı "Sahte sunucu" diye yazar.

### Ana sayfa

- Arka uçta panel özeti ucu yoktur.
- Canlı ana sayfa "Panel özeti henüz yok." yazar. Örnek ajan ve uydurma eşitleme saati gösterilmez.

## Geçici bağlantılar

`foundation` işi iki parçayı henüz `main` dalına koymadı. Kabuk bu parçaları geçici olarak kendisi kurar.

1. **Tokenlar.** `tokens.ts` değerleri kaynak dosyadan okur. `src/design/` dışa aktarımı gelince `tokens.ts` oradan okuyacak.
2. **Odak perdesi.** `focus-dim/` klasörü D1–D5 kararını uygular. `src/engines/focus-dim/` gelince `useFocusDim` o motoru çağıracak.

3. **Adlı değerler.** `shell.css` dosyasının başında adlı değer bölümü vardır. Kaynakta karşılığı olmayan boşluk, ölçü ve süreler oradadır. `foundation` boşluk ve hareket tokenlarını koyunca bölüm oraya taşınır. Bölüm dışında sabit değer yazılmaz. `shellCss.node.test.ts` bunu denetler.

Bileşenler yalnız `useFocusDim` kancasını ve `shellTokens` nesnesini kullanır. Bu yüzden geçişte bileşen kodu değişmez.

## Denemeler

Birim testleri `npm test` ile koşar.

Tarayıcı testleri `src/shell/e2e/` klasöründedir. Testler kabuk deneme sayfasında koşar. Deneme sayfası derlenmiş çıktıdır. Geliştirme sunucusu tembel sayfada sayfayı yeniden yüklüyordu. Bu da testleri kararsız yapıyordu.

Kabuğun ayrı Playwright ayarı kaldırıldı. Testleri tek test kapısı koşacak. Kapıyı `foundation` işi kuracak. Kök ayar bu klasörü okumalı ve deneme sayfasını sunmalı.

Matris kök ayarla aynıdır: Chromium ve WebKit, iPhone 13 profili. Firefox koşulmaz.

Deneme sayfası `harness/` klasöründedir. Tema geçicidir. `?tema=acik` adresi açık temayı açar. `?yol=/satis/teklif/TEK-0003` adresi kabuğu bu yolda açar. Deneme sayfasında kayıt bağlantısı yoktur. Bu yüzden kayıt adresi örnek formu çizer. Örnek form testi bu yolu kullanır.

## Yardım kulakçığı (G-137)

Sayfanın sağ kenarında "Yardım" kulakçığı durur. Kulakçık bir düğmedir ve `aria-expanded` taşır.

- Panel sayfa yardımını, sık görevleri ve "Kendi kendine destek modu" anahtarını gösterir.
- Anahtar `role=switch` taşır. Tercih tarayıcıda `atonota.shell.selfHelp` anahtarıyla saklanır.
- Mod açıkken alan ve sayfa yardım işaretleri görünür. Mod kapalıyken işaret çizilmez.
- Alan işareti ekran okuyucuya alan adıyla duyurulur. Örnek: "Başlık alanının yardımı".
- Panel AI panelinin sağ yuvasını kullanır. Genişlik kaynaktaki `aiStudio.layout.right` değeridir.
- Panel yan yana sığmazsa tam ekran çekmece olur. Eşik sidebar, panel ve 600 px okunur içerik toplamıdır.
- Escape paneli kapatır. Odak paneli açan öğeye döner: kulakçık ya da alan işareti.
- Panel kodu ilk yüke girmez. Kulakçık ilk kez açılınca panel parçası iner.
- Fare ya da odak kulakçığa gelince indirme önceden başlar.
- Panel inene kadar boş ve gizli bir yer tutucu durur. Böylece `aria-controls` her zaman var olan bir öğeyi gösterir.
- Panel bir kez inince kapalıyken de DOM'da kalır. Böylece yön değişince açık panel, anahtar ve odak korunur.
- Panel `Switch` bileşenini `@/components/controls/Switch` dosyasından alır. Toplu dosya `InputNumber` ve `Radio` parçalarını da pakete sokar.
- Giriş ekranının indirdiği antd modülleri `antd-initial` parçasında toplanır (`vite.config.ts`). Böylece tembel panel giriş parçalarını bölmez.

Bileşen yardımı ve bağlantılar da yapıldı (G-137, G-138).

- Mod açıkken bileşen yardım işareti görünür. Örnek: kayıt formunun başlığındaki işaret.
- Bileşen işareti ekran okuyucuya bileşen adıyla duyurulur. Örnek: "Kayıt formu bileşeninin yardımı".
- Bileşen kimliği yardım kaydındaki `component_id` değeridir. Kayıt formu için değer `record-form` olur.
- Panel bileşen yardımını `getComponentHelp` ucundan okur.
- Alan işareti belge türünü `HelpDoctype` bağlamından alır. Kayıt görünümü bu bağlamı verir.
- Belge türü varsa panel alan yardımını `getFieldHelp` ucundan okur.
- Sunucu yardımı yoksa alan yardımı Frappe alan açıklamasından gelir.
- Panel "Tur", "Belge" ve "Destek talebi" bağlantılarını gösterir.
- Adresler sunucudaki yardım kaydından gelir. Kodda adres yoktur.
- Sunucu bir bağlantıyı vermezse o bağlantı çizilmez. İstek başarısız olursa da bağlantı çizilmez.
- Panel adresi ayrıca denetler (`links.ts`). Yalnız `https` adresi ya da site içi yol kabul edilir.
- Örneğin `javascript:` ile başlayan adres çizilmez.
- Sunucu sözleşmesi `contracts/openapi/platform_core-help.openapi.yaml` dosyasıdır. Sürüm `0.2.0` olur.
- Uygulama girişi bağlantıyı `src/app/view-data.ts` içinde kurar. Kabuk API istemcisi kurmaz.
