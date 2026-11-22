# Arka uç sözleşmeleri

Bu klasör arka uç sözleşmelerinin bir kopyasını tutar. Kopyadaki dosyaları elle değiştirmeyin.

- `openapi/` klasöründe OpenAPI dosyaları durur.
- `docs/contracts.md` dosyası ortak adları tutar.
- `SOURCE.json` dosyası kaynak commit kimliğini ve dosya özetlerini tutar.

## Kopyayı yenileme

Kaynak klasörü siz verirsiniz. Klasörde `backend/contracts/` bulunmalıdır.

```bash
node contracts/sync.mjs --source ../frappesetup
```

Kaynağı ortam değişkeniyle de verebilirsiniz:

```bash
ATONOTA_BACKEND_DIR=../frappesetup node contracts/sync.mjs
```

Kopyanın güncel olup olmadığını şu komut denetler. Komut bir şey yazmaz. Kopya eskiyse 1 ile çıkar.

```bash
node contracts/sync.mjs --source ../frappesetup --check
```

Kopyayı yeniledikten sonra API tiplerini yeniden üretin.
