# Tasarım katmanı: tokenlar ve CSS değişkenleri

Tek karar kaynağı `design/source/control-size-config.json` dosyasıdır. Bu klasör o dosyadan antd temasını, CSS değişkenlerini ve hareket tokenlarını üretir. Değerler kodda ikinci kez yazılmaz.

## Kullanım kuralları

1. Bileşen içinde sabit renk, ölçü, gölge, süre ya da eğri yazmayın. CSS değişkenini ya da `@/design` tokenını kullanın.
2. CSS değişkenleri `AppProviders` ile sayfaya her zaman yüklenir. Ek içe aktarma gerekmez.
3. Koyu tema `html[data-theme="dark"]` ile açılır. Tema farkı olan değişkenler orada yeniden tanımlıdır.
4. Hareket için yalnız `--motion-*` değişkenlerini kullanın. `src/design/` dışında sabit süre, `cubic-bezier`, `steps` ya da `ease`, `ease-in`, `ease-out`, `ease-in-out`, `linear` sözcüğü yazılırsa `npm run lint` başarısız olur (`scripts/motion-gate.mjs`). Kapı CSS'i bildirim bildirim tarar; Prettier'in satırlara böldüğü değerler, JS nesne değerleri (`transition={{ duration: 0.3, ease: 'linear' }}`), `el.animate(kareler, { duration: 200 })` çağrıları ve sayı süreleri (`transitionDuration: 200`) de yakalanır. Geçici istisna için iki yol vardır. Dosya düzeyinde `scripts/motion-gate.allow.json` kaydı (dosya, sahip, neden). Bildirim düzeyinde bildirimin içine `/* motion-gate: allow sahip=<iş> neden=<en az 10 karakter> */` yorumu. Yorum yalnız kendi bildirimini susturur; sahip ya da neden eksikse kapı yine ihlal verir. Bilinen sınır: kapı değişkende duran seçenek nesnesini bildirime bağlamaz (`const o = { duration: 300 }; el.animate(k, o);` ihlal vermez). Projede bugün hareket kitaplığı yoktur; kitaplık eklenince kural genişletilir.
5. antd bileşenleri temayı `AppProviders` içinden alır. antd'nin kendi odak çerçevesi tema düzeyinde kapalıdır. Ek odak stili yazmayın.
6. Yatay kayması gereken tablo ya da geniş içeriği `data-scroll-x` kapsayıcısına alın. Kapsayıcıya `tabIndex={0}`, `role="region"` ve erişilebilir ad verin. Taşma testi bu kapsayıcının içini saymaz.

## Değişken listesi

| Grup | Değişkenler | Kaynak |
| --- | --- | --- |
| Yazı tipi | `--font-ui`, `--font-code` | Outfit kararı |
| Metin boyutu | `--font-min` (12), `--font-default` (14), `--font-exception` (10), `--font-special` (9) | `typography` |
| Buton | `--btn-h-sm/md/lg` (36/42/48), `--btn-fs-sm/md/lg` (14/16/18), `--btn-lh-sm/md/lg` (22/24/26) | `sizes` |
| Giriş | `--input-h-sm/md/lg`, `--input-fs-sm/md/lg`, `--input-lh-sm/md/lg` | `sizes` |
| Ağırlık | `--font-weight-sm/md/lg` (400/500/600) | `fontWeight` |
| Renk | `--color-primary`, `--color-primary-hover`, `--color-primary-active` | `primary` |
| Tehlike | `--danger-text` (beyaz), `--danger-bg`, `--danger-bg-hover`, `--danger-bg-active`: düz (solid) tehlike düğmesinin metni ve zemini. Zemin beyaz metinle 4.5:1, 5.2:1 ve 6:1 verir. antd Button tokenları `colorError`, `colorErrorHover`, `colorErrorActive` bu projede yazı rengidir (kenarlıklı, metin, bağlantı, dolgulu ve hayalet tür); yerleşim, panel, yükseltilmiş zemin ve antd'nin kırmızımsı durum zeminlerinde 4.5:1, 5.2:1 ve 6:1 verir. Hepsi `@/design` içindeki `danger` tokenından gelir. | antd hata rengi, türetilmiş karar 13 |
| Birincil metin | `--primary-text`, `--primary-text-hover`. Koyu temada ek olarak `--primary-bg`, `--primary-bg-hover`, `--primary-bg-active` (düz renk; kaynak tonun yerleşim zeminine bindirilmiş hali) | `primary.light` ve `primary.dark` |
| Koyu zeminler | `--bg-layout`, `--bg-panel`, `--bg-elevated`, `--bg-input`, `--bg-button` (yalnız koyu tema) | `darkPalette` |
| Köşe | `--radius` (5), `--card-radius` (10) | `radius`, `cards` |
| Gölge | `--shadow-card` (7 katman), `--shadow-button` (flat), `--shadow-input` (iç), `--shadow-dropdown` (9 katman) | `derived.shadowCss` / `shadowCssDark` |
| Boşluk | `--space-xxs/xs/sm/md/lg/xl/xxl` (4/8/12/16/24/32/48) | antd takma tokenları |
| Yerleşim | `--content-max-width`, `--form-max-width` (420, dar form sütunu), `--sidebar-width` (288), `--sidebar-rail-width` (68), `--card-padding` (24) | antd ekran eşiği, buton ölçeği, `sidebar`, `cards` |
| Katman | `--z-popup-base`, `--z-dim-overlay`, `--z-dim-source` | antd `zIndexPopupBase` |
| Tablo | `--table-col-min-action/number/date/text/title` | buton ölçeğinden türetilir |
| Dokunma | `--hit-expand` (0.12), `--hit-min-target` (24) | `hitArea` |
| Odak | `--focus-indicator-color`, `--focus-indicator-size` (2 px) | türetilmiş karar |
| Perde | `--focus-dim-color`, `--focus-dim-transparent`, `--focus-dim-blur` | `focusDim` |
| Hareket eğrisi | `--motion-easing-standard` (genel S eğrisi), `--motion-easing-dropdown`, `--motion-easing-owl-pop`, `--motion-easing-glide` (kayan hover zemini), `--motion-easing-linear` (dönen simge ve `visibility` gibi anahtar geçişler) | `focusDim.easing`, `dropdown.animation`, `owlAssist.badge.animation`, kaynak örnek sayfadaki `.glide` ve `.spin` kuralları |
| Hareket süresi | `--motion-duration-fast` (100), `--motion-duration-mid` (200), `--motion-duration-slow` (300), `--motion-duration-dropdown` (500), `--motion-duration-focus-dim` (320), `--motion-duration-flyout` (180), `--motion-duration-rail` (520), `--motion-duration-owl-pop` (420), `--motion-duration-glide` (200), `--motion-duration-glide-fade` (150), `--motion-duration-skeleton` (1200), `--motion-duration-spin` (900) | `motion.ts`; kabuk süreleri kaynak örnek sayfadaki `.glide`, `.skel` ve `.spin` kurallarından |
| Anında geçiş | `--motion-duration-instant` (0). Yalnız `visibility` gibi anahtar özelliklerde kullanılır. Hareket süresi değildir; hareket süreleri pozitiftir. | `motion.ts` (`instantMs`) |

**Solma eğrisi kararı.** Kayan hover zemininin solması kaynak örnek sayfada `.15s ease` idi. `ease` sözcüğü genel hareket sözleşmesinde yoktur ve hareket kapısı onu reddeder. Bu yüzden solma, süresini kaynaktan alır (`--motion-duration-glide-fade`, 150 ms). Eğrisi genel S eğrisidir (`--motion-easing-standard`). Karar `src/shell/shell.css` içindeki `--shell-glide-fade-ease` değişkenindedir.

Kabuk süreleri (`glide`, `glideFade`, `skeleton`, `spin`) `motion.ts` içinde sayı olarak yazılıdır. Kaynak JSON dosyasında bu süreler yoktur; yalnız örnek sayfanın CSS kurallarında vardır. Değerler o kurallarla aynıdır.

Dropdown açılış hareketi için `@keyframes atonota-dropdown-in` tanımlıdır. Süre `--motion-duration-dropdown`, eğri `--motion-easing-dropdown` olur.

## TypeScript tokenları

`@/design` şunları dışa aktarır: `designSource`, `buildAntdTheme(mode)`, `buildDesignCss()`, `ensureDesignStyles()`, `tokens` (`sizes`, `primary`, `danger`, `link`, `radius`, `shadows`, `darkPalette`, `space`, `layer`, `layout`, `table`, `hitArea`, `focusDim`, `focusIndicator`), `motion` (`duration`, `easing`, `dropdownAnimation`) ve renk yardımcıları (`hexToRgba`, `contrastRatio`, `darkenToContrast`, `lightenToContrast`, `blendOver`, `minAlphaForContrast`).

## Motorlar

- `@/engines/hit-area` dokunma alanı motorudur (R1–R11). Input için `<Input suffix={<HitSuffix />} />` kullanın.
- `@/engines/focus-mode` görünür odak modudur. Tab açar, pointerdown kapatır.
- `@/engines/focus-dim` odak perdesidir. `useFocusDim(open, key)` kancasını çağırın. Açan öğeye `focus-dim-source` sınıfı verin.

## Deneme sayfaları ve testler

- Birim testleri `src/**/*.test.{ts,tsx}` altındadır. `npm test` hepsini koşar.
- Tarayıcı testleri `tests/e2e/*.spec.ts` ve `src/<klasör>/e2e/*.spec.ts` altındadır. `npm run test:e2e` hepsini koşar. Ayrı Playwright ayarı gerekmez.
- Deneme sayfaları yalnız e2e derlemesinde açılır: `import.meta.env.MODE === 'e2e'` koşulu ve `/_demo/<iş>` yolu. `npm run build:e2e` ve `npm run dev:e2e` bu modu açar. Üretim derlemesine girmez; bunu `src/app/build-output.node.test.ts` gerçek `vite build` ile denetler. Deneme rotası shell işinin rota listesine eklenir; `/_demo/` öneki koleksiyon sayfasına düşmez (`isDemoPath`).
- Temel deneme sayfası `/_demo/foundation` yolundadır.
