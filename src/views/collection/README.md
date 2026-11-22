# Koleksiyon görünümleri

Bu klasör altı kayıt görünümü sunar. Ana uygulama bağlantısını foundation işi yapar.

## Kullanım

`CollectionView` bileşeni bir React Router sağlayıcısının içinde çalışır.

```tsx
const definition = createDefinition(metadata.message, {
  groupField: 'status',
  startField: 'start_date',
  endField: 'end_date',
  durationField: 'hours',
});

<CollectionView definition={definition} source={collectionSource} mode="dark" />;
```

Tanım ve veri kaynağı nesnelerini gereksiz yere yeniden oluşturmayın.
Oturum veya şirket değişirse yeni nesneler sağlayın.
Yetki sürümü değişirse tanımı yeniden oluşturun.
Oturum kapandığında koleksiyon bileşenini kaldırın.
Üst bileşen, şirket ve kullanıcı kapsamını açıkça göstermelidir.

## Veri sözleşmesi

`createDefinition`, `platform_core-shell.openapi.yaml` içindeki `Meta` verisini okur.
Metot yanıtındaki `message` alanını bu işleve verin.
Katalog sürümleri 1 ve 2 desteklenir.
Bilinmeyen sürüm ve kesilmiş tanım reddedilir.
Gizli alanlar ve parola alanları gösterilmez.
Sunucunun hassasiyet işareti korunur.
Hassas kayıtlar ve alanlar ekranda belirtilir.
Hassasiyet işareti kullanıcıya yetki vermez.
Başlık alanı ile liste alanları kullanılır.
Bilinmeyen çizici yalnız güvenli JSON metni gösterir.
Kod ve HTML çalıştırılmaz.

`CollectionSource.list(request, signal)` liste isteğini veri kaynağına iletir.
Gerçek API bağlantısı isteği sunucuya göndermelidir.
İstemci yalnız gelen sayfayı gösterir.
İstek gereken alanları, süzgeçleri, sıralamayı ve sayfa sınırını içerir.
Eşit sıralama değerlerinde kayıt kimliği ikinci sırayı belirler.
Liste yanıtı şu biçimdedir:

```ts
{
  data: [{ name: 'EXAMPLE-001', subject: 'Örnek iş' }],
  has_next_page: false,
  // total isteğe bağlıdır. Sunucu vermiyorsa eklemeyin.
}
```

API bağlantısı 401 ve 403 yanıtlarını `CollectionError('unauthorized', ...)` biçimine çevirir.
Diğer hatalar yeniden deneme düğmesi gösterir.
Ham sunucu hatası ekrana yazılmaz.
Geç kalan istek yeni sonucu değiştirmez.
İptal sinyali API çağrısına kadar aktarılmalıdır.

Ortak API istemcisi bu dalda henüz hazır değildir.
`example.ts` yalnız örnek veri sağlar.
Örnek verinin arama ve sayfalama işlemleri kendi veri katmanındadır.
Örnek ekranda “Örnek veri” yazısı görünür.
Üretim giriş dosyası örnek veriyi içe aktarmaz.

## Görünümlerin kapsamı

- Tablo, gelen alan tanımından çizilir.
- Kanban, kayıtları seçilen alana göre gruplar.
- Pivot, gruplardaki kayıt sayılarını gösterir.
- Rapor, gruplardaki kayıt sayılarını çubuklarla gösterir.
- Gantt, başlangıç ve bitiş tarihlerini gösterir.
- Timesheet, çalışma sürelerini ve geçerli sürelerin toplamını gösterir.

Özetler yalnız açık sayfadaki kayıtları kapsar.
Ekran bu sınırı açıkça belirtir.
Tüm kayıtları kapsayan rapor için sunucudan ayrı rapor sonucu gerekir.
Süre alanının etiketi birimi içermelidir.
Eksik tarih ve süreler kullanıcıya bildirilir.
Gerekli alan ataması yoksa görünüm açıklama gösterir.

Seçim çubuğu seçilen kayıtları gösterir ve seçimi kaldırır.
Bu teslimde kayıt değiştiren toplu işlem yoktur.
Beş ek görünüm dinamik `import()` ile yüklenir.
Örnek veri veya ek görünüm ortak girişten erken yüklenmez.

## Adres durumu

Adres şu alanları taşır.
`view`, `page`, `size`, `search`, `sort`, `direction`, `filter`, `value`.

Sayfa boyutu 10, 20 veya 50 kayıttır.
Süzgeç ve sıralama yalnız tanımdaki alanları kullanır.
Arama ve süzgeç değişince ilk sayfa açılır.
Tarayıcının geri tuşu önceki sorguyu geri getirir.
Sorgu dışındaki adres alanları korunur.
Gizli bilgileri adres süzgeçlerine yazmayın.

## Tasarım ve ortak bağlantılar

Renk, ölçü ve yazı değerleri `design/source/control-size-config.json` dosyasından gelir.
`collection-theme.ts` geçici, koleksiyona özel tema bağlantısıdır.
Ortak tasarım ve motor dışa aktarımları bu dalda henüz boştur.
Foundation işi bu bağlantıyı ortak tema ve motorlarla birleştirmelidir.
Bu iş ortak dosyaları değiştirmez.

Normal klavye odağı tek alt çizgiyle görünür.
Tab tuşu göstergeyi açar. İşaretçi kullanımı göstergeyi kapatır.
Zorunlu renk modunda sistem çerçevesi kullanılır.
Hareketi azaltma ayarı CSS ve antd temasına birlikte uygulanır.
Input ve Select dokunma alanları görünür sınırın dışında da çalışır.
Komşu kontroller ve kapsayıcı sınırı genişlemeyi kısıtlar.

Tablo kendi içinde yatay kayar.
Kelime ortasından bölünmez. Yazı boyutu dar ekranda küçülmez.
Bu teslimde görünür metinler en az 14 px değerindedir.
Yerleşim aynı bileşen ağacında uyarlanır.
Boyut değişimi arama taslağını ve odağı korur.

## Kontrol komutları

Komutları depo kökünde çalıştırın.

```sh
npm run lint
npm run typecheck
npm test
npm run test:e2e
npx playwright test --config src/views/collection/qa/playwright.config.mjs --project chromium-320
npx playwright test --config src/views/collection/qa/playwright.config.mjs
```

Varsayılan 4173 portu kullanımdaysa mevcut servise dokunmayın.
Aynı kök testlerini ayrı portta şu komutla çalıştırın:

```sh
npm run test:e2e -- --config src/views/collection/qa/root-gate.config.mjs
```

Koleksiyon testleri 4319 portunda ayrı üretim çıktısı oluşturur.
Kök testlerinin ayrı portu 4321 değeridir.
Çıktılar `.pane/qa/` klasörüne yazılır.
Kök testleri ana uygulama iskeletini denetler.
Koleksiyon testleri bu klasördeki örnek ekranı denetler.
Firefox çalıştırılmaz.
WebKit sonucu gerçek Safari sonucu değildir.
iPhone profili gerçek telefon denemesi değildir.

Önizlemeyi açmak için şu komutu çalıştırın:

```sh
node src/views/collection/qa/serve.mjs
```

Önizleme adresi `http://127.0.0.1:4319/src/views/collection/preview/` biçimindedir.
Bu adres yalnız bu bilgisayarda çalışır.
Ana uygulamaya veya canlı servise dağıtım yapılmış değildir.

Teknik doğrulamada yararlanılan kaynaklar:
[React lazy](https://react.dev/reference/react/lazy) ve
[Ant Design ConfigProvider](https://ant.design/components/config-provider/).
Kullanılan API'ler kurulu antd 5.29.3 türleriyle doğrulanmıştır.
