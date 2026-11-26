# Kayıt formu

Form, kayıt türünde tanımlanan bölümleri kullanır. Her başlıklı bölüm, görünür başlığıyla adlandırılır.
Başlıksız bölüm, boş başlık göstermez.

Hata metni, alanın hemen altında görünür. Açıklama varsa hata metninden sonra gelir.
Alan, hata metnine `aria-describedby` ile bağlanır. Hatalı alan `aria-invalid` alır.
Kullanıcı alanı değiştirince o alanın hata mesajı kalkar.

Gönderim başarısız olunca canlı bölge hata sayısını bildirir.
Canlı bölge, ekran okuyucuya değişen metni bildirir.
Form, ilk hatalı alanın sekmesini ve bölümünü açar.
Ardından odak, o alana gider. Aynı gönderim yeniden yapılırsa duyuru tekrarlanır.
Odak aktarımı, sekmenin görünmesini bekler. Bu bekleme, hareket süresine bağlı değildir.

Formun başlığı `title` özelliğiyle verilebilir.
Gönderim düğmesinin yazısı `saveActionLabel` özelliğiyle verilebilir.
Bu özellikler verilmezse önceki başlık ve düğme yazısı korunur.
Salt okunur kayıt, form gönderimiyle kaydedilemez.

## Yeni kayıt bilgileri

Form, yeni izin talebinde kişinin bilgilerini adaptörden alır.
Adaptör, sunucudan gelen bilgiyi forma aktarır.
Adaptör, ortak API istemcisini kullanır.
API, uygulamanın sunucuyla konuştuğu yoldur.
İstek yolu `GET /api/method/hrms_tr.api.get_leave_request_context` olur.
İstekte başka bir kişi seçilmez.
Sunucu varsayılan yıllık izin türünü belirler.

`getNewRecordContext` yöntemi yeni kayıt bilgisini getirir.
Bu yöntem yalnız yeni izin talebinde veri döner.
Diğer adaptörlerde bu yöntem bulunmayabilir.
Bu durumda form, kişiye ait alanları boş bırakır.

Form, yalnız alan tanımında bulunan bilgileri doldurur.
Kaynağı veya değeri eksik alan boş kalır.
Türkçe ekranda bakiye `8,5 gün` gibi yazılır.
Gerçek sıfır bakiye ekranda `0 gün` olur.
Birim ve sayı biçimi yalnız gösterimde kullanılır.
Sistem, eski başvurudan bakiye kopyalamaz.
Hesaplanan bakiye değiştirilemez. Form bu değeri kaydetme isteğine eklemez.

Dolan alanın altında kaynak notu görünür.
Alan, nota `aria-describedby` ile bağlanır.
Kullanıcı alanı değiştirince kaynak notu kalkar.
Kullanıcı eski değeri tekrar yazsa da not geri gelmez.
Kullanıcı değişiklikleri geri alırsa sistemin kaynak notu yeniden görünür.
Form kaydedilince yeni kayıt kaynak notları kalkar.

Geçersiz sunucu yanıtında form hata gösterir.
Kullanıcı bu ekrandan yeniden deneyebilir.
Ön bilgi isteğinde ağ veya erişim hatası olursa form açılır.
Kişinin adı ve bakiyesi boş kalır. Kaynak notları görünmez.
Ön bilgi isteğindeki 417 hatasında da form açılır.
401 yanıtı oturumun dolduğunu bildirirse mevcut giriş ekranı korunur.
Böylece kullanıcı, süresi dolmuş oturumla form doldurmaz.
Formun alan tanımları alınamazsa mevcut hata ekranı korunur.
Kayıt değişince bekleyen istek iptal edilir.
Geciken yanıt, yeni kaydı değiştirmez.

## Görünüm

Form, Outfit yazı tipini kullanır. Renkler ve ölçüler merkezi tokenlardan gelir.
Token, ortak kullanılan tasarım değeridir.
Hata rengi, ortak `danger` tokenından gelir.
Düğme renkleri, ortak `primary` tokenından gelir.
Kaydedilmemiş değişiklik yazısı, gövde metni rengini kullanır.
Telefonda kontrol yüksekliği en az 48 CSS px olur.
En küçük metin 14 CSS px olur. Gövde metni 16 CSS px olur.
Klavye odağı alt çizgiyle gösterilir. Odaklanınca alanın çevresindeki kenarlık renk değiştirmez.
Bölümlerde dekoratif gölge kullanılmaz.

## Deneme ekranı

İzin formu, onaylı taslaktaki bölüm adlarını kullanır.
Deneme verileri `harness/leaveFixture.ts` dosyasındadır. Ekranda yalnız örnek kişi bilgisi bulunur.
Bu ekran canlı sunucuya bağlanmaz. Deneme ekranı üretim paketine girmez.

Ekranın yolu şöyledir:

```text
/src/views/record/harness/?scenario=leave
```

Yeni kayıt bilgilerini deneyen ekranın yolu şöyledir:

```text
/src/views/record/harness/?scenario=leave-prefill
```

Bu ekran, ortak API istemcisini sahte bir istemciyle değiştirir.
Ekran, üretimde kullanılan yanıt denetimini çalıştırır.
Adrese `&context=empty` eklenirse bilgiler boş gelir.
Adrese `&context=zero` eklenirse bakiye sıfır gelir.
Adrese `&context=network` eklenirse ön bilgi isteği ağ hatası verir.
Adrese `&context=forbidden` eklenirse ön bilgi isteği 403 hatası verir.
Adrese `&context=unauthenticated` eklenirse ön bilgi isteği 401 hatası verir.
Bu son deneme, oturum süresinin dolduğunu bildirmez.
Adrese `&context=validation` eklenirse ön bilgi isteği 417 hatası verir.

## Kontroller

Komutları depo kökünde çalıştırın.

```sh
npm run lint
npm run typecheck
npm test -- --maxWorkers=2
npm run build
E2E_PORT=4286 npm run test:e2e -- src/views/record/e2e --workers=2
```

Bölüm ve hata testleri `__tests__/form-validation.test.tsx` dosyasındadır.
Yeni kayıt testleri `__tests__/prefill.test.tsx` dosyasındadır.
Yeni kayıt tarayıcı testleri `e2e/prefill.spec.ts` dosyasındadır.
Tarayıcı testleri `e2e/form-validation.spec.ts` dosyasındadır.
Testler gerçek sunucu isteklerini engelleyen ortak test düzenini kullanır.
Tarayıcı kapsamı Chromium ve WebKit olur. Firefox çalıştırılmaz.
WebKit sonucu, gerçek Safari sonucu sayılmaz.

Gerçek okurla denenmedi.
