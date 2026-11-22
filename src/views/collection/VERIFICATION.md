# Koleksiyon düzeltmesi 2 denetimi

Denetim 23 Kasım 2026 Pazartesi günü yapıldı.
Başlangıç commit'i `7e5e47e` değeridir.
Kod yalnız `src/views/collection/` klasöründe değişti.
Kök ayarlar ve başka işlerin dosyaları değiştirilmedi.

## İnceleme bulgularının durumu

| Bulgu | Sonuç ve kanıt |
| --- | --- |
| Engelleyici 1 | Düzeltildi. Azaltılmış harekette liste Escape ile ve seçimle kapanıyor. |
| Engelleyici 2 | Düzeltildi. Select genişletilmiş alanı fareyle ve dokunmayla açılıyor. |
| Önemli 3 | Klasör taşıması tamamlandı. Kök keşif ve CI bağlantısı foundation işine bağlıdır. |
| Önemli 4 | Varsayılan olarak yalnız tablo açıktır. Sunucu özet ucu henüz yoktur. |
| Önemli 5 | Kaynak stillerinden bütün iç sınıf seçicileri ve öncelik zorlamaları kaldırıldı. |
| Önemli 6 | Üretim bileşeni ortak temayı bekliyor. Geçici kopyalar yalnız önizlemede bulunuyor. |
| Önemli 7 | Örnek kaynak sözleşme biçimindeki dosyadan okunuyor. Gerçek MSW bağlantısı bekleniyor. |
| Küçük 1 | Açılır liste gölgesi açık veya koyu temanın ortak değişkeninden geliyor. |
| Küçük 2 | Başlık tanımdaki Türkçe etiketten geliyor. |
| Küçük 3 | Bilinmeyen çizici metne JSON tırnakları eklemiyor. HTML çalıştırılmıyor. |
| Küçük 4 | Koleksiyon ve Kanban bölüm başlıkları `h2` kullanıyor. |
| Küçük 5 | Hatalı sayfada “Önceki sayfa” düğmesi açık kalıyor. |
| Küçük 6 | Başarısız testler düzeltmelerden önce ayrı commitlerde kaydedildi. |
| Küçük 7 | Sunucu yanıtları ayrı bellek önbelleğinde tutuluyor. Ortak önbellek gelince geçici bağlantı kaldırılacak. |

Kapalı görünümlerin ayarı `enableExperimentalCollectionViews` adındadır.
Varsayılan değeri `false` değeridir.
Kanban, Pivot, Rapor, Gantt ve Timesheet kapalıdır.
Adres üzerinden kapalı görünüm istenirse tablo açılır.
Kapalı görünümün dosyası indirilmez.
Sunucu özeti bağlanmadan bu ayar üretimde açılmamalıdır.
Örnek ekranda ayar açıkça açılabilir.
Örnek hesaplar yalnız gelen sayfayı kapsar.

## Çalıştırılan kontroller

| Kontrol | Sonuç | Kanıt |
| --- | --- | --- |
| `npm run lint` | pass | `.pane/qa/correction-lint.log` |
| `npm run typecheck` | pass | `.pane/qa/correction-typecheck.log` |
| `npm test` | pass, 36 test | `.pane/qa/correction-unit.log` |
| İlk 320 piksel Chromium turu | pass, 5 test | `.pane/qa/correction-320.log` |
| Son Chromium ve WebKit turu | pass, 60 test | `.pane/qa/correction-accepted.log` |
| Kök `npm run test:e2e` | not_run | Kök ayar bu dalda koleksiyon yolunu henüz keşfetmiyor. |
| Gerçek Safari ve fiziksel telefon | not_run | Emülasyon bunların yerine geçmez. |
| CI ve canlı dağıtım | not_run | Yerel başarı bunların yerine geçmez. |
| Firefox | not_applicable | Proje kararı gereği çalıştırılmadı. |
| Piksel farkı karşılaştırması | not_run | Onaylı görüntü tabanı yoktur. |
| Gerçek zoom ve sanal klavye | not_run | Kök yazı boyutu denemesi bunların yerine geçmez. |

36 birim testinin 35 tanesi koleksiyon içindir.
Diğer test ana uygulama iskeletini denetler.
Yeni yetki testleri eski sayfanın yeniden gösterilmesini engelliyor.
İptali dikkate almayan geç yanıt da sınanıyor.
Bu testler mevcut davranışın ek denetimidir.

Tarayıcı testleri şu klasöre taşındı:
`src/views/collection/e2e/`.

Eski iki kalıcı Playwright ayarı kaldırıldı.
Bu dalda ortak ayarlar hâlâ foundation işini bekliyor.
Yerel deneme için Git dışında geçici ayar kullanıldı.
Bu ayar kök yapılandırmadaki tarayıcı profillerini içe alıyor.
Değişen alanlar test yolu, çıktı yolu ve örnek sunucudur.
Test sunucusu 4319 portunda üretim çıktısı sunuyor.
Çalıştırılan komutlar şunlardır:

```sh
npx playwright test --config .pane/qa/correction.config.mjs --project chromium-320
COLLECTION_REPORT="$PWD/.pane/qa/correction-accepted.json" npx playwright test --config .pane/qa/correction.config.mjs --output .pane/qa/correction-accepted-results --workers 4
```

Bu sonuç kök kapının otomatik keşfini kanıtlamaz.
Önemli 3 bulgusu foundation birleşmesinde yeniden denetlenmelidir.
Kök ayar test yolunu kapsamalıdır.
Kök derleme örnek ekranı da sunmalıdır.
Dolu porttaki başka servis kapatılmadı.

## Önce başarısız test kanıtı

`83fa992` commit'i sekiz başarısız testi kaydetti.
Kanıt `.pane/qa/correction-2-red.log` dosyasındadır.
`99a4406` commit'i bu sekiz testi geçirdi.

`503d1ae` commit'i önbellek eksikliğini başarısız testle kaydetti.
Kanıt `.pane/qa/correction-cache-red.log` dosyasındadır.
`736eb6b` commit'i önbelleği ve ortak tema sınırını düzeltti.

İlk geniş turda yatay dokunma odağı başarısız oldu.
Liste açılırken işaretçinin altına kayıyordu.
Tıklama hedefi değişince odak önceki alanda kalıyordu.
Select açılışında açık bileşen referansıyla odak verildi.
Hedefli tekrar ve sonraki 50 test geçti.
Başarısız tur `.pane/qa/correction-all.log` dosyasında korunuyor.
Hedefli tekrar `.pane/qa/correction-landscape-retry2.log` dosyasındadır.

İki odak sorunu da önce başarısız tarayıcı testiyle kaydedildi.
`8ebc427` commit'i seçim kutusunun iç çerçevesini yakaladı.
`666f10d` commit'i tablo kaydırma bölgesinin çerçevesini yakaladı.
Kanıtlar `correction-focus-red.log` ve `correction-scroll-red.log` dosyalarındadır.
Bu dosyalar `.pane/qa/` klasöründedir.
Düzeltmelerden sonra son 60 testin tamamı geçti.
Başarısız, atlanan veya kararsız test kalmadı.
Seçim kutusu ve kaydırma bölgesi tek alt çizgi kullanıyor.
Önizleme, ortak temanın açık odak tokenlarını kullanıyor.
Açık paneldeki öğe köşeleri kaynak kararına göre düzeltildi.

## Ortam ve görüntüler

Çalışan sistem macOS 26.5.1 sürümündedir.
Node 24.21.0 ve npm 11.19.0 çalıştı.
Paket dosyası, kilit dosyası ve kurulu sürümler karşılaştırıldı.

| Paket | İstenen sürüm | Kilit sürümü | Kurulu sürüm |
| --- | --- | --- | --- |
| React | 18.3.1 | 18.3.1 | 18.3.1 |
| antd | 5.29.3 | 5.29.3 | 5.29.3 |
| TypeScript | 5.9.3 | 5.9.3 | 5.9.3 |
| Vite | 8.3.8 | 8.3.8 | 8.3.8 |
| Playwright | 1.65.1 | 1.65.1 | 1.65.1 |
| Vitest | 5.1.1 | 5.1.1 | 5.1.1 |
| MSW | 3.0.7 | 3.0.7 | 3.0.7 |

Çalışan Chromium sürümü 159.0.8154.6 değerindedir.
Çalışan WebKit sürümü 27.2 değerindedir.
Chromium genişlikleri 320, 360, 375, 390, 844, 1024 ve 1440 CSS px değerleridir.
WebKit 320 ve 1440 CSS px genişliklerde denendi.
iPhone 13 benzetim profili de denendi.
Fare, klavye ve ilgili profillerde dokunma komutları kullanıldı.

Görüntüler `.pane/qa/correction-accepted-results/` klasöründedir.
320 piksel tablo ve açık tema yatay görünümü görsel olarak incelendi.
Açık dropdown paneli de ayrı görüntüyle incelendi.
Makine raporu `.pane/qa/correction-accepted.json` dosyasındadır.
Açık listenin hesaplanan dört öğe köşesi de 0 px değerindedir.
Bu ölçüm `.pane/qa/correction-radius.json` dosyasındadır.
Tablo kendi içinde kayıyor. Sayfa yatay taşmıyor.
Açık ve koyu tema erişilebilirlik taraması geçti.
Normal klavye odağı alt çizgiyle denetlendi.
Arama taslağı ve odak boyut değişiminde korundu.
Görünür metinler 14 CSS px altında değildi.

## Ağ kanıtı

Ağ özeti `.pane/qa/correction-network-summary.json` dosyasındadır.
Tablo açılışında beş ek görünümün dosyası istenmedi.
Kapalı görünüm adresi de ek dosya indirmedi.
Ayar açıkken dosyalar yalnız görünüm seçilince istendi.

320 piksel Chromium ölçümünde ana dosya 198418 sıkıştırılmış bayttır.
Dosyanın açılmış büyüklüğü 617266 bayttır.
Bütün örnek görünümler açılınca toplam JavaScript 202032 sıkıştırılmış bayttır.
Bu ölçüm yerel önizleme sunucusuna aittir.
Gerçek ağ veya canlı servis ölçümü değildir.
Ana dosyada 500 kB derleyici uyarısı sürüyor.
Bu dalda kabul edilmiş performans bütçesi yoktur.
Foundation ve adaptive işleri ortak paket sınırını değerlendirmelidir.

## Devir ve sınırlar

Foundation, koleksiyonu ana uygulama ve ortak motorlarla bağlamalıdır.
Geçici önizleme dosyalarının kaldırma koşulları kodda yazıyor.
Üretim koleksiyonu bu geçici dosyaları içe aktarmıyor.
API işi sözleşme tabanlı MSW kaynağını sağlamalıdır.
Aynı iş gerçek liste bağlantısını da sağlamalıdır.
Sunucudaki özet ucu gelmeden kapalı görünümler açılmamalıdır.
Ortak sorgu önbelleği gelince geçici bellek çözümü kaldırılmalıdır.

Liste açılırken çok hızlı ok kullanımı önceki turun bilinen sınırıdır.
Klavye testi açılış hareketinin bitmesini bekler.
Bu sınırın giderildiği iddia edilmez.

Bağımsız inceleyici kaynak farkını, testleri ve görüntüleri denetledi.
İstenen iki yetki testi eklendi ve geçti.
İnceleyicinin belirttiği tür bağımlılığı ve kaydırma odağı düzeltildi.
Değişen koleksiyon kodunda başka açık inceleme bulgusu kalmadı.
Kök test keşfi foundation işine bağlı açık birleşme koşuludur.
Bu açık bulgunun inceleme düzeyi MAJOR olarak korunmuştur.
Bu sınır yerel tarayıcı başarısıyla kapanmış sayılmaz.
Zorunlu renk modu son tarayıcı turunda ayrıca çalıştırılmadı.
Görsel kontrol, piksel farkı karşılaştırmasının yerine geçmez.

Türkçe denetimi otomatik ve elle yapıldı.
Teknik adlar ve komut sözdizimi aynen korundu.
Sürüm tabloları ve açıklama cümleleri elle denetlendi.
Gerçek okurla denenmedi.
Push veya canlı dağıtım yapılmadı.
