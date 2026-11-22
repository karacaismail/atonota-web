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

Yerel geliştirmede `http://localhost` adresi kabul edilir.
