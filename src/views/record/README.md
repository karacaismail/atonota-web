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

## Görünüm

Form, Outfit yazı tipini kullanır. Renkler ve ölçüler merkezi tokenlardan gelir.
Token, ortak kullanılan tasarım değeridir.
Hata rengi, ortak `danger` tokenından gelir.
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

## Kontroller

Komutları depo kökünde çalıştırın.

```sh
npm run lint
npm run typecheck
npm test -- --maxWorkers=2
npm run build
E2E_PORT=4286 npm run test:e2e -- src/views/record/e2e --workers=2
```

Yeni davranış testleri `__tests__/form-validation.test.tsx` dosyasındadır.
Tarayıcı testleri `e2e/form-validation.spec.ts` dosyasındadır.
Testler gerçek sunucu isteklerini engelleyen ortak test düzenini kullanır.
Tarayıcı kapsamı Chromium ve WebKit olur. Firefox çalıştırılmaz.
WebKit sonucu, gerçek Safari sonucu sayılmaz.

Gerçek okurla denenmedi.
