# Koleksiyon görünümleri

Koleksiyon varsayılan olarak yalnız tabloyu sunar.
Ana uygulama bağlantısını `foundation` ve `shell` işleri yapar.

## Kullanım

Bileşen, ortak tema ve React Router sağlayıcısının içinde çalışır.
Metadata tanımı `api-client` işinin `getDocType` çağrısından gelir:

```tsx
const docType = await apiClient.getDocType('Örnek Kayıt', undefined, { signal });
if (docType.status !== 'fresh') return;

const definition = createDefinition(docType.meta, {
  label: 'Örnek kayıtlar',
});

<CollectionView definition={definition} source={collectionSource} mode="dark" />;
```

`apiClient.getDocType`, `/api/method/platform_core.api.meta.get_doctype` ucunu çağırır ve `message` zarfını açarak doğrulanmış `DocTypeMeta` nesnesini `meta` alanında döndürür.
Geliştirme ve testlerde `src/mocks/` içindeki `sampleDocTypeMeta` sahte yanıtı bu ucu sözleşmeye uygun biçimde karşılar.
Özet veya zaman görünümlerinin alan rolleri (`groupField`, `startField`, `endField`, `durationField`) gerekirse `createDefinition` ikinci parametresinde verilir.

Başlık, `label` alanındaki Türkçe etiketten gelir.
Etiket verilmezse başlık “Kayıtlar” olur.
Tanım ve kaynak nesnelerini gereksiz yere yeniden oluşturmayın.
Oturum veya şirket değişirse yeni kaynak ve tanım sağlayın.
Yetki sürümü değişirse tanımı yeniden oluşturun.
Oturum kapanınca koleksiyon bileşenini kaldırın.
Üst bileşen, şirket ve kullanıcı kapsamını açıkça göstermelidir.

## Veri ve önbellek

`createDefinition`, `apiClient.getDocType` yanıtındaki `DocTypeMeta` nesnesini okur.
Katalog sürümleri 1 ve 2 desteklenir.
Bilinmeyen sürüm ve kesilmiş tanım reddedilir.
Gizli alanlar ve parola alanları gösterilmez.
Hassasiyet işareti korunur. Bu işaret kullanıcıya yetki vermez.
Bilinmeyen çizici güvenli düz metin gösterir.
Metne JSON tırnakları eklenmez. HTML çalıştırılmaz.

Liste ve sayfalama için Frappe `/api/v2/document` ucu kullanılacaktır.
`api-client` bu uç için tipli istemciyi ve sahte işleyiciyi kurmaktadır.
Tipli istemci `main` dalına girdiğinde `CollectionSource.list(request, signal)` doğrudan o istemciye bağlanacaktır.
İstek gereken alanları, süzgeçleri, sıralamayı ve sayfa sınırını içerir.
Eşit sıralama değerlerinde kayıt kimliği ikinci sırayı belirler.
Yanıt şu biçimdedir:

```ts
{
  data: [{ name: 'EXAMPLE-001', subject: 'Örnek iş' }],
  has_next_page: false,
  // total isteğe bağlıdır. Frappe /api/v2/document toplam sayı döndürmez.
}
```

API bağlantısı yetki hatalarını (`forbidden`, `session_expired`, 401 ve 403) `CollectionError('unauthorized', ...)` biçimine çevirir.
Diğer hatalarda kullanıcı yeniden deneyebilir.
Hatalı sayfadan “Önceki sayfa” düğmesiyle dönülebilir.
Ham sunucu hatası gösterilmez. Geç yanıt yeni sonucu değiştirmez.
İptal sinyali API çağrısına kadar aktarılmalıdır.

`query-cache.ts` geçici bir sorgu önbelleğidir.
Veriyi bileşen durumunun dışında, yalnız bellekte tutar.
Her koleksiyon kendi önbelleğini oluşturur.
Önbellek en fazla 20 sayfa saklar.
Aynı kapsamda önceki sayfaya dönüş yeni istek üretmez.
Kaynak veya tanım değişirse yeni önbellek oluşur.
Yetki hatası önceki sayfaları geçersiz kılar.
Bileşen kaldırılınca bekleyen istek iptal edilir.
Tarayıcı depolaması ve ortak kullanıcı önbelleği kullanılmaz.
Bu geçici çözüm süreye bağlı yenileme yapmaz.
Üst uygulama veri değişikliğinde kaynak veya tanımı yenilemelidir.
Ortak sorgu önbelleği sunulunca bu dosya onunla değiştirilmelidir.

## Geçici örnek kaynak

Ortak `api-client` (`@/api` ve `@/mocks`) `main` dalına birleşmiştir.
`example.ts`, metadata zarfını doğrudan `api-client` işinin `sampleDocTypeMeta` sahte yanıtına (`@/mocks`) ve `DocTypeMeta` türüne (`@/api`) bağlar; önizleme görünüm rollerini göstermek için yalnız örnek alan listesini genişletir.
`model.test.ts`, `apiClient.getDocType` çağrısını `src/mocks/node` sahte sunucusu üzerinden çalıştırarak `createDefinition` uyumunu doğrular.

`main` dalındaki sahte sunucuda genel belge listesi henüz yoktur; yalnız `/api/resource/Leave Application` bulunur.
Liste ve sayfalama için Frappe `/api/v2/document` ucu kullanılacaktır ve `api-client` tipli istemciyi hazırlamaktadır.
`fixtures/example-collection.json` yalnız `/api/v2/document` yanıt biçimindeki geçici liste satırlarını tutar.
Kaldırma koşulu: `api-client` tipli `/api/v2/document` istemcisini ve MSW işleyicisini `main` dalına getirdiğinde `example.ts` içindeki yerel liste uyarlayıcısı ve `fixtures/example-collection.json` kaldırılır, doğrudan tipli istemciye bağlanılır.
Örnek ekranda “Örnek veri” yazısı görünür.
Üretim giriş dosyası örnek kaynağı içe aktarmaz.

## Kapalı görünümler

`enableExperimentalCollectionViews` ayarının varsayılan değeri `false` değeridir.
Tablo dışındaki beş görünüm bu ayarla kapalıdır.
Bunlar Kanban, Pivot, Rapor, Gantt ve Timesheet görünümleridir.
Adres bu görünümlerden birini istese de tablo açılır.
Kapalı görünümün JavaScript dosyası indirilmez.

Gruplu sayım ve toplam için arka uç yeni uç yazmaktadır.
O uç ve tipli `api-client` bağlantısı `main` dalına gelene kadar özet görünümler kapalı kalır.
Sunucu özet ucu bağlanmadan ayarı ana uygulamada açmayın.
Ayar açıkken örnek görünümler yalnız gelen sayfayı hesaplar.
Örnek ekran bu sınırı belirtir.
Sunucu toplamı veya tam veri raporu iddiası yoktur.

Örnek ekranda denemek için adrese `?experimentalViews=1` ekleyin.
Bu adres seçeneği yalnız `preview/main.tsx` dosyasında okunur.
Ana bileşen bu adres seçeneğini okumaz.
Gerçek uygulamada ayarı yalnız çağıran kod açabilir.

Seçim çubuğu seçilen kayıtları gösterir ve seçimi kaldırır.
Bu teslimde kayıt değiştiren toplu işlem yoktur.

## Adres durumu

Adres şu alanları taşır:
`view`, `page`, `size`, `search`, `sort`, `direction`, `filter`, `value`.

Sayfa boyutu 10, 20 veya 50 kayıttır.
Arama ve süzgeç değişince ilk sayfa açılır.
Geri tuşu önceki sorguyu geri getirir.
Sorgu dışındaki adres alanları korunur.
Gizli bilgileri adres süzgeçlerine yazmayın.

## Ortak tasarım bağlantısı

Üretim bileşeni ana uygulamanın `ConfigProvider` temasını kullanır.
Koleksiyon ortak tema veya motor başlatmaz.
`collection-tokens.ts` yalnız koleksiyonun yerleşim ve renk eşlemesini yapar.
Ortak değişken adları `foundation` kaynağından okunmuştur.
Örnekler `--font-ui`, `--radius` ve `--shadow-dropdown` adlarıdır.
Hareket değişkenleri `--motion-duration-*` ve `--motion-easing-*` adlarını kullanır.
Dokunma motoru `--hit-t/r/b/l` değerlerini sağlar.
Odak modu `html[data-focus-mode="keyboard"]` alanından okunur.

Bu dalda `src/design/` ve `src/engines/` dışa aktarımları henüz boştur.
Bu nedenle `collection.css` içindeki odak ve dokunma alanı kuralları ile `preview/` klasöründeki geçici köprü dosyaları korunmaktadır.
Her kopyanın başında kaldırma koşulu yazılıdır: `foundation` `main` dalına girince bu kopyalar silinir ve yerlerine şu ortak işlevler bağlanır:

- `buildAntdTheme`
- `ensureDesignStyles`
- `startFocusMode`
- `startHitAreaEngine`

Kontroller antd'nin açık bileşen alanlarını kullanır.
Stil kurallarında iç sınıf seçicisi veya öncelik zorlaması yoktur.
Azaltılmış harekette Select kapanış animasyonu başlatılmaz.
Dokunmatik kaydırma sonrası tarayıcının son dokunma noktasında ürettiği hareketsiz `mousemove` olayı, klavyeyle seçilen etkin Select seçeneğini sıfırlamaz; gerçek fare hareketi seçeneği değiştirmeye devam eder.
Klavye odağı normal temada tek alt çizgiyle görünür.
Tablo kendi içinde yatay kayar. Sayfa yatay taşmaz.
Görünür metinler bu teslimde en az 14 CSS px değerindedir.

## Kontroller

Komutları depo kökünde çalıştırın:

```sh
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

Tarayıcı testleri `src/views/collection/e2e/*.spec.ts` konumundadır.
Kök `playwright.config.ts` bu dalda hâlâ yalnız `./tests/e2e` klasörünü koşar.
`foundation` kök ayarda `src/views/**/e2e` yolunu kapsamalı ve önizleme sunucusunu bağlamalıdır.
Yerel kontrol için kullanılan geçici ayar Git'e girmez.
Güncel komutlar ve sonuçlar `VERIFICATION.md` dosyasındadır.
Firefox proje kararı gereği çalıştırılmaz.
WebKit sonucu gerçek Safari sonucu değildir.
iPhone profili gerçek telefon denemesi değildir.

Önizlemeyi şu komutla çalıştırabilirsiniz:

```sh
node src/views/collection/qa/serve.mjs
```

Adres `http://127.0.0.1:4319/src/views/collection/preview/` biçimindedir.
Bu adres yalnız bu bilgisayarda çalışır.
Dolu porttaki başka servisi kapatmayın.
Bu teslim canlı dağıtım değildir.
