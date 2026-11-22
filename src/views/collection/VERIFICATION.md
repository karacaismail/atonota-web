# Koleksiyon teslim denetimi

Denetim 23 Kasım 2026 Pazartesi günü tamamlandı.
Değişiklik alanı `src/views/collection/` klasörüdür.
Ana uygulama ve ortak ayarlar değiştirilmedi.

## Sonuçlar

| Kontrol | Sonuç | Kanıt |
| --- | --- | --- |
| `npm run lint` | pass | `.pane/qa/lint.log` |
| `npm run typecheck` | pass | `.pane/qa/typecheck.log` |
| `npm test` | pass, 25 test | `.pane/qa/unit.log` |
| Varsayılan `npm run test:e2e` | fail, 4173 portu dolu | `.pane/qa/root-e2e.log` |
| Aynı kök testleri, ayrı port | pass, 10 test | `.pane/qa/root-e2e-isolated.log` |
| Koleksiyon tarayıcı testleri | pass, 40 test | `.pane/qa/browser-matrix.log` |
| Gerçek Safari ve fiziksel telefon | not_run | Bu teslimde çalıştırılmadı. |
| CI ve canlı dağıtım | not_run | Yerel sonuçlar bunların yerine geçmez. |
| Firefox | not_applicable | Proje kararı gereği çalıştırılmadı. |
| Piksel farkı karşılaştırması | not_run | Önceki görüntü tabanı bulunmuyor. |
| Gerçek tarayıcı zoom ve sanal klavye | not_run | Kök boyutu denemesi bunların yerine geçmez. |

25 birim testinin 24 tanesi koleksiyon içindir.
Kalan test ana uygulama iskeletini denetler.
Kök tarayıcı testleri ana uygulama iskeletini denetler.
Koleksiyon testleri ayrı üretim çıktısını denetler.

Ayrı portta kullanılan komut şudur:

```sh
npm run test:e2e -- --config src/views/collection/qa/root-gate.config.mjs
```

Koleksiyon testlerinin komutu şudur:

```sh
npx playwright test --config src/views/collection/qa/playwright.config.mjs
```

Dolu porttaki servis kapatılmadı.
Testler yalnız ayrılmış yerel portları kullandı.
Kullanıcının kişisel tarayıcısı kullanılmadı.

## Ortam

- İşletim sistemi macOS 26.5.1, yapı 25F80 değerindedir.
- Çalışan Node sürümü 24.21.0 değerindedir.
- Çalışan npm sürümü 11.19.0 değerindedir.
- Paket dosyası React 18.3.1 ve antd 5.29.3 sürümlerini sabitler.
- Kilit dosyası aynı sürümleri içerir.
- TypeScript sürümü 5.9.3, Vite sürümü 8.3.8 değerindedir.
- Playwright sürümü 1.65.1 değerindedir.
- Chromium motoru 159.0.8154.6 sürümünde çalıştı.
- WebKit motoru 27.2 sürümünde çalıştı.

Chromium genişlikleri 320, 360, 375, 390, 844, 1024 ve 1440 CSS px değerleridir.
WebKit 320 ve 1440 CSS px genişlikte çalıştı.
iPhone 13 benzetim profili de çalıştı.
Fare, klavye ve ilgili profillerde dokunma komutları kullanıldı.
Benzetim profillerinin tarayıcı kimliği gerçek işletim sistemini göstermez.
Ayrıntılar `.pane/qa/network-summary.json` dosyasındadır.

## Doğrulanan davranışlar

- Tablo kendi içinde kayıyor. Sayfa yatay taşmıyor.
- Uzun model adları kelime ortasından bölünmüyor.
- Görünür metinler 14 px altına düşmüyor.
- Klavye odağı alt çizgiyle görünüyor.
- Genişletilmiş Input ve Select alanları çalışıyor.
- Açılır listede oklar, Enter ve Escape çalışıyor.
- Süzgeç, sıralama, sayfa ve görünüm adreste korunuyor.
- Tarayıcının geri tuşu önceki sorguyu geri getiriyor.
- Kaynak değişince eski seçim yeni kaynakta görünmüyor.
- Geç gelen yanıt yeni sonucu değiştirmiyor.
- Dört veri durumu çiziliyor. Hata yeniden denenebiliyor.
- Açık ve koyu tema erişilebilirlik taraması geçti.
- Hareketi azaltma ayarında açılır liste gerçekten kapanıyor.
- Boyut değişince arama taslağı ve odak korunuyor.
- Hassasiyet işaretleri sunucu tanımından korunuyor.
- Seçenek listesi olmayan adres süzgeci ekranda doğru açıklanıyor.

## Kaynak yükleme kanıtı

Tablo açılışında beş ek görünümün dosyası istenmedi.
Her dosya, ilgili görünüm seçilince istendi.
Derleme bildirimi bu dosyaları dinamik giriş olarak gösteriyor.

320 px Chromium ölçümünde ana JavaScript dosyası 197155 sıkıştırılmış bayttır.
Aynı dosya açılınca 612224 bayttır.
Beş ek görünüm açılınca toplam sıkıştırılmış JavaScript 200766 bayta çıktı.
Bu ölçüm yerel önizleme sunucusuna aittir.
Canlı sunucu veya yavaş ağ ölçümü değildir.

Derleyici, ana dosya için 500 kB uyarısı verdi.
Uyarı gizlenmedi. Kabul edilmiş performans bütçesi bu dalda bulunmuyor.
Foundation ve adaptive işleri ortak paket sınırını değerlendirmelidir.

## İnceleme ve sınırlar

Bağımsız inceleyici kaynak farkını ve kontrol sonuçlarını okudu.
İnceleyici 320 px ve yatay görünüm görüntülerini de inceledi.
Katalog sürümü, sıralama, seçim kapsamı ve süzgeç bulguları düzeltildi.
Dokunma alanı ve hareketi azaltma sorunları da düzeltildi.
Düzeltmeler için önce başarısız test kanıtı alındı.
Kanıt dosyaları `.pane/qa/*-red.log` adlarını taşır.

Kurulu liste kütüphanesi açılış sırasında seçili öğeyi gecikmeli etkinleştiriyor.
Çok hızlı ok tuşu, açılış sırasında bu işlemle yarışabilir.
Klavye denetimi hareket bitince çalışır.
Açılış sırasında hızlı tuş kullanımının sorunsuz olduğu iddia edilmez.
Paket dosyaları veya kütüphane kodu değiştirilmedi.

Ekran görüntüleri `.pane/qa/browser-results/` klasöründedir.
Makine raporu `.pane/qa/collection-report.json` dosyasındadır.
Önceki başarısız turların kanıtı ayrı günlüklerde bulunur.

Türkçe denetiminde hata bulunmadı.
Teknik sözcük uyarıları elle incelendi.
Gerçek okurla denenmedi.

## Devir

Foundation işi bileşeni ana uygulamanın yönlendiricisine bağlamalıdır.
Aynı iş geçici tema bağlantısını ortak tema ve motorlarla birleştirmelidir.
API işi `CollectionSource` üzerinden gerçek liste istemcisini bağlamalıdır.
API bağlantısı yetki hatasını ve iptal sinyalini korumalıdır.
Sunucu tanımı değişince `createDefinition` yeniden çağrılmalıdır.

Bu teslim örnek verili, salt okunur koleksiyon yüzeyidir.
Sunucuda veri değiştiren toplu işlem eklenmedi.
Özetler yalnız açık sayfayı kapsar.
Push veya canlı dağıtım yapılmadı.
