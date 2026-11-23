# API istemcisi

Bu klasör panelin arka uçla konuşan kodunu tutar. Bileşenler arka uca yalnız bu istemciyle bağlanır.

## Temel kurallar

- Oturum aynı kökteki Frappe çereziyle yürür. Tarayıcı erişim belirteci tutmaz.
- Yazan istek `X-Frappe-CSRF-Token` başlığını taşır. Belirteç yalnız bellekte durur.
- Tipler sözleşmeden üretilir. Komut `npm run api:types` olur. `npm run typecheck` eski tipi yakalar.
- Yanıt ekrana gelmeden önce şemayla denetlenir. Uymayan yanıt `invalid_response` hatası verir.
- Hata türleri `errors.ts` dosyasındadır. Kullanıcı metinleri `error-messages.json` dosyasındadır.

## Karar: Press hesap silme sayfası

Bu karar orkestratörün 23 Kasım 2026 Pazartesi günkü kararıdır.

Panel Press'in hesap silme ucunu doğrudan çağırmaz. Nedenleri şunlardır:

- Press ayrı bir köktür.
- Press kendi CSRF belirtecini kendi `/account-deletion` sayfasına yazar.
- Tarayıcı başka kökün çerezini ve CSRF belirtecini taşımamalıdır (SZ-7).

Panel şöyle çalışır:

1. Kullanıcı “Hesabı sil” düğmesine basar.
2. Panel kullanıcıyı Press'in `/account-deletion` sayfasına tam sayfa yönlendirir.
3. Yeniden doğrulama Press sayfasında olur.
4. Silme onayı da Press sayfasında olur.

Adresi `pressAccountDeletionUrl(config)` işlevi verir. Örnek:

```ts
import { pressAccountDeletionUrl, readPressConfig } from '@/api';

const press = readPressConfig(import.meta.env);
if (press) window.location.assign(pressAccountDeletionUrl(press));
```

`readPressConfig` işlevi `VITE_PRESS_URL` ayarını okur. Ayar yoksa işlev `undefined` döner. O zaman panel düğmeyi göstermez.

Ayar yalnız kök olabilir. Örnek: `https://press.example.test`. Şu değerler hata verir:

- düz HTTP adresi,
- yol, sorgu ya da kullanıcı bilgisi taşıyan adres,
- adres olmayan değer.

Yerel geliştirmede `http://localhost` adresi kabul edilir. Bunun için `import.meta.env` nesnesindeki `DEV` değeri doğru olmalıdır. Üretim derlemesinde düz HTTP adresi her zaman hata verir.

### Karar: sayfaya doğrudan giriş

Bu karar orkestratörün 23 Kasım 2026 Pazartesi günkü kararıdır.

`/account-deletion` sayfası Press'in kendi akışıdır. Press yeniden doğrulamayı ve CSRF belirtecini kendisi yönetir. Bu yüzden panelin “Hesabı sil” düğmesi açık kalır.

## Karar: kayıt listesi için Frappe API v2

Bu karar orkestratörün 23 Kasım 2026 Pazartesi günkü kararıdır.

Liste ekranları kayıtları Frappe'nin standart ucundan okur. Uç bizim OpenAPI sözleşmelerimizde yoktur. Ortak ad belgesi bu ucu kabul eder. Frappe kayıt ve alan iznini bu uçta uygular.

Biçim Frappe 16.56.0 kaynağından doğrulandı. Kaynak `v16.56.0` etiketidir. Okunan dosyalar şunlardır:

- `frappe/api/v2.py`: `document_list` işlevi ve yol kuralları,
- `frappe/api/__init__.py`: yanıt zarfı,
- `frappe/utils/response.py`: hata biçimi.

İstek şöyledir:

- Yol: `GET /api/v2/document/<doctype>`
- `fields`: alan adları, JSON dizisi. Verilmezse yalnız `name` döner.
- `filters`: süzgeç, JSON nesnesi ya da dizisi.
- `order_by`: sıralama. Örnek: `modified desc`.
- `start`: atlanacak kayıt sayısı. Varsayılan 0.
- `limit`: sayfa boyu. Frappe'nin varsayılanı 20'dir.

Yanıt şöyledir:

- Başarıda gövde `{ "data": [...], "has_next_page": true }` olur. `message` zarfı yoktur.
- Frappe toplam kayıt sayısını vermez.
- Hatada gövde `{ "errors": [{ "type": "PermissionError" }] }` olur.

İstemci işlevi `listDocuments(doctype, query, options)` olur. Tipler `frappe-v2.ts` dosyasındadır. İstemci sayfa boyunu 1 ile 100 arasında tutar. Bu sınır proje kararıdır (SZ-10).

Gruplu sayım ve toplam için `groupSummary` işlevini kullanın.

Frappe sürümü değişince biçimi yeniden doğrulayın.

## Grup özeti

İmza `groupSummary(doctype, query, options?)` biçimindedir.
`doctype` kayıt türünü, `groupBy` gruplama alanını belirtir.
`filters` ile kayıtları süzebilirsiniz. `limit` en fazla kaç grubun döneceğini belirtir.
Sınır 1 ile 100 grup arasındadır. Varsayılan sınır 100 gruptur.
`options.signal` ile isteği iptal edebilirsiniz.

```ts
const summary = await api.groupSummary('Örnek Kayıt', {
  groupBy: 'status',
  aggregate: 'sum',
  aggregateField: 'amount',
  filters: [['amount', '>', 0]],
  limit: 10,
});
```

Toplam için `sum`, ortalama için `avg` kullanın.
Hesaplama isterken `aggregate` ve `aggregateField` alanlarını birlikte verin.
Her grup `value` ve `count` alanlarını içerir.
İstek hesaplama içerirse her grup `aggregate` alanını da içerir.
`totalCount` süzgece uyan ve kullanıcının okuyabildiği tüm kayıtları sayar.
Grup sınırı bazı grupları dışarıda bırakırsa `truncated` alanı `true` olur.

İstemci, sunucu hatalarını mevcut `ApiError` türlerine çevirir.

| HTTP kodu | Hata türü |
| --- | --- |
| 400 | `invalid_request` |
| 401 | `session_expired` |
| 403 | `forbidden` |
| 404 | `not_found` |
| 429 | `rate_limited` |

Tiplerin kaynağı arka uçtaki `backend/contracts/platform_core-collection.openapi.yaml` dosyasıdır.
Tipleri üretmek için sözleşme kopyasının yolunu ilk komuta verin.
İkinci komut dosyanın başına üretim notunu ekler.

```sh
output=src/api/generated/platform_core-collection.ts
npx --no-install openapi-typescript .pane/prompts/platform_core-collection.openapi.yaml \
  --output "$output" --alphabetize --empty-objects-unknown
node --input-type=module -e '
  import { readFileSync, writeFileSync } from "node:fs";
  const output = process.argv[1];
  const header = "/* eslint-disable */\n// Bu dosya OpenAPI sözleşmesinden üretildi. Üretim komutu src/api/README.md dosyasındadır.\n";
  writeFileSync(output, header + readFileSync(output, "utf8"));
' "$output"
npx --no-install prettier --write "$output"
```
