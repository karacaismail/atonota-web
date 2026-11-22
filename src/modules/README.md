# Panel modülleri

Bu klasör beş sayfanın kayıtlarını ve ekranlarını içerir.
Kabuk, `moduleRegistrations` listesini okur.
Kabuk, seçilen sayfanın `load()` işlevini çağırır.
Sayfa kodu ancak bu çağrıyla yüklenir.

`ModuleProvider` siteyi, hesabı ve ortak istemciyi alır.
Hesap değişince sağlayıcı ekran durumunu sıfırlar.
Bekleyen okuma ve yazma istekleri iptal edilir.
İptal, sunucunun yazmayı geri aldığı anlamına gelmez.
Ekranlar yazmayı kendiliğinden yinelemez.

## Bağlantılar

- Hesap ekranı doğrulanmış profil bilgisini gösterir.
- Hesap silme bağlantısı Press üzerindeki `/account-deletion` sayfasını açar.
- Press kendi oturumunu ve güvenlik belirtecini kullanır.
- Press kimliği yeniden doğrular ve silme onayı alır.
- Panel başka köke silme isteği göndermez.
- İzin işlemleri okunan `modified` değerini değiştirmeden gönderir.
- Yapay zekâ onayı, açılan önerinin farkını ve özet değerini kullanır.
- Sunucu işlemi reddederse ekran başarı göstermez.
- Sunucu sonucu bilinmiyorsa ekran yeniden yazmayı önermez.
- Erişim açıklaması sunucunun kararını gösterir.

## Eksik sözleşmeler

Kaynak, `.pane/backend-ref/backend/contracts/` klasöründeki sözleşmelerdir.
Bu kopyada aşağıdaki kullanıcı ekranları için yeterli sözleşme bulunmuyor:

- Profil düzenleme ve oturum listesi.
- Kullanıcı ve rol yönetimi.
- Site ve plan bilgileri.
- Ayrıntılı yapay zekâ işlem günlüğü.

Kimlik eşitleme uçları, kullanıcı yönetimi yerine kullanılmaz.
Press sözleşmesindeki ek uç listeleri, kullanıcıya açık API tanımı sayılmaz.
Bu ekranlar eksik bağlantıyı açıkça bildirir.
Öneri geçmişi, ayrıntılı işlem günlüğü gibi sunulmaz.
Arka uç sahibi sözleşmeleri tamamlayınca `api-client` sahibi istemciyi bağlar.

## Doğrulama

Çalışma dizini depo köküdür.

- `npm test -- src/modules`
- `npm run lint`
- `npm run typecheck`
- `npm run test:e2e`

Türler katı TypeScript ayarlarıyla denetlenir.
Tasarım değerleri ortak tema ve CSS değişkenlerinden gelir.
Tarayıcı kabulü 320 CSS px genişlikten başlar.
Firefox bu projede kapsam dışıdır.

Gerçek okurla denenmedi.
