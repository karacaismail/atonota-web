# Koleksiyon görünümleri

Koleksiyon varsayılan olarak yalnız tabloyu sunar.
Ana uygulama bağlantısını foundation işi yapar.

## Kullanım

Bileşen, ortak tema ve React Router sağlayıcısının içinde çalışır.

```tsx
const definition = createDefinition(metadata.message, {
  label: 'Örnek işler',
  groupField: 'status',
  startField: 'start_date',
  endField: 'end_date',
  durationField: 'hours',
});

<CollectionView definition={definition} source={collectionSource} mode="dark" />;
```

Başlık, `label` alanındaki Türkçe etiketten gelir.
Etiket verilmezse başlık “Kayıtlar” olur.
Tanım ve kaynak nesnelerini gereksiz yere yeniden oluşturmayın.
Oturum veya şirket değişirse yeni kaynak ve tanım sağlayın.
Yetki sürümü değişirse tanımı yeniden oluşturun.
Oturum kapanınca koleksiyon bileşenini kaldırın.
Üst bileşen, şirket ve kullanıcı kapsamını açıkça göstermelidir.

## Veri ve önbellek

`createDefinition`, arka ucun `Meta` yanıtını okur.
Metot yanıtındaki `message` alanını bu işleve verin.
Katalog sürümleri 1 ve 2 desteklenir.
Bilinmeyen sürüm ve kesilmiş tanım reddedilir.
Gizli alanlar ve parola alanları gösterilmez.
Hassasiyet işareti korunur. Bu işaret kullanıcıya yetki vermez.
Bilinmeyen çizici güvenli düz metin gösterir.
Metne JSON tırnakları eklenmez. HTML çalıştırılmaz.

`CollectionSource.list(request, signal)` liste isteğini veri kaynağına iletir.
İstek gereken alanları, süzgeçleri, sıralamayı ve sayfa sınırını içerir.
Eşit sıralama değerlerinde kayıt kimliği ikinci sırayı belirler.
Yanıt şu biçimdedir:

```ts
{
  data: [{ name: 'EXAMPLE-001', subject: 'Örnek iş' }],
  has_next_page: false,
  // total isteğe bağlıdır. Sunucu vermiyorsa eklemeyin.
}
```

API bağlantısı yetki hatalarını `CollectionError('unauthorized', ...)` biçimine çevirir.
Bunlar 401 ve 403 yanıtlarıdır.
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

Ortak API istemcisi bu dalda henüz hazır değildir.
`fixtures/example-collection.json` sözleşme biçimindeki örnek yanıtları tutar.
Metadata yanıtı `message` alanındadır. Liste yanıtı `list` alanındadır.
`example.ts` bu dosyayı doğrular ve örnek liste isteğini uygular.
Bu kaynak gerçek API veya MSW bağlantısı değildir.
API işi MSW işleyicilerini sununca bu geçici kaynak kaldırılmalıdır.
Bağlantıda aynı metadata ve liste sözleşmeleri kullanılmalıdır.
Örnek ekranda “Örnek veri” yazısı görünür.
Üretim giriş dosyası örnek kaynağı içe aktarmaz.

## Kapalı görünümler

`enableExperimentalCollectionViews` ayarının varsayılan değeri `false` değeridir.
Tablo dışındaki beş görünüm bu ayarla kapalıdır.
Bunlar Kanban, Pivot, Rapor, Gantt ve Timesheet görünümleridir.
Adres bu görünümlerden birini istese de tablo açılır.
Kapalı görünümün JavaScript dosyası indirilmez.

Arka uç sözleşmesinde gruplu sayım ve toplam ucu yoktur.
Bu nedenle kapalı görünümler üretim için hazır sayılmaz.
Sunucu özetleri bağlanmadan ayarı ana uygulamada açmayın.
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
Ortak değişken adları foundation kaynağından okunmuştur.
Örnekler `--font-ui`, `--radius` ve `--shadow-dropdown` adlarıdır.
Hareket değişkenleri `--motion-duration-*` ve `--motion-easing-*` adlarını kullanır.
Dokunma motoru `--hit-t/r/b/l` değerlerini sağlar.
Odak modu `html[data-focus-mode="keyboard"]` alanından okunur.

Bu dalda ortak dışa aktarımlar henüz boştur.
Önizleme bu yüzden geçici bağlantılar kullanır.
Bunlar `preview/TemporaryFoundation.tsx` ve aynı klasördeki geçici dosyalardır.
Bu dosyalar üretim girişinden yüklenmez.
Foundation dışa aktarımları gelince geçici dosyaları kaldırın.
Yerlerine şu ortak işlevleri bağlayın:

- `buildAntdTheme`
- `ensureDesignStyles`
- `startFocusMode`
- `startHitAreaEngine`

Kontroller antd'nin açık bileşen alanlarını kullanır.
Stil kurallarında iç sınıf seçicisi veya öncelik zorlaması yoktur.
Azaltılmış harekette Select kapanış animasyonu başlatılmaz.
Önizleme temasında hareket de kapatılır.
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
Ayrı, kalıcı Playwright ayarı kaldırıldı.
Foundation kök ayarda bu yolu kapsamalıdır.
Kök derleme örnek ekranı da servis etmelidir.
Bu dalda kök bağlantı henüz doğrulanmadı.
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
