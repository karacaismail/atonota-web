# Giriş ve oturum

Bu klasör web panelinin girişini yönetir. Tarayıcı erişim belirteci tutmaz.

## Giriş nasıl yürür?

1. Panel aynı kökte sunulur. Aynı kök, protokolün, sunucu adının ve kapının aynı olmasıdır.
2. Kullanıcı “AtonotA Login ile oturum aç” düğmesine basar. Kullanıcı bir platform düğmesine de basabilir. Örnek: “Google ile oturum aç”.
3. Tarayıcı arka ucun `start_login` yoluna gider.
4. Arka uç kullanıcıyı Keycloak giriş sayfasına gönderir.
5. Keycloak kullanıcıyı arka ucun `keycloak_callback` yoluna geri gönderir.
6. Arka uç Frappe oturum çerezini yazar. Sonra kullanıcıyı panele döndürür.
7. Panel sonraki isteklerde bu çerezi kullanır.

Yazan isteklerde CSRF belirteci gerekir. Belirteç yalnız bellekte durur. Arka uç belirteci `/panel` sayfasındaki `csrf-token` adlı `meta` öğesine koyar.

## Panele nasıl takılır?

Bu adımları `foundation` işi uygular.

1. `src/main.tsx` dosyasında önce sahte sunucuyu başlatın.
2. Sonra oturumu bir kez kurun.
3. Uygulamayı `AuthGate` bileşeninin içine koyun.

```tsx
import { AuthGate, createPlatformSession } from '@/auth';
import { startApiMocks } from '@/mocks/start';

const mocks = await startApiMocks();

const session = createPlatformSession({
  env: import.meta.env,
  origin: window.location.origin,
  document,
  navigate: (url) => window.location.assign(url),
  currentPath: () => window.location.pathname + window.location.search,
  // Sahte sunucu açıkken örnek CSRF değeri buradan gelir.
  ...(mocks.active ? { csrfToken: mocks.csrfToken } : {}),
});

createRoot(root).render(
  <StrictMode>
    {mocks.active ? <SampleDataNotice /> : null}
    <AuthGate session={session}>{(user) => <App user={user} />}</AuthGate>
  </StrictMode>,
);
```

`AuthGate` şunları yapar:

- İlk açılışta oturumu sorar. Bu sırada “Oturum denetleniyor.” yazar.
- Oturum açıksa içindeki bileşeni çizer.
- Oturum yoksa giriş ekranını gösterir. Kendiliğinden Keycloak'a gitmez.
- Sunucu hatasında yalın bir metin ve “Yeniden dene” düğmesi gösterir.

Kullanıcı panelde çalışırken oturum bitebilir. O zaman panel kullanıcıyı bir kez yeniden girişe götürür. Sunucu hatası kullanıcıyı girişe götürmez.

## Ayrı bir giriş rotası

Panel yönlendirici kullanıyorsa giriş ekranını ayrı bir rotaya koyabilirsiniz:

```tsx
<Route path="/giris" element={<LoginScreen onSignIn={() => session.auth.signIn('/panel')} />} />
```

## Çıkış

Yan menünün alt bölümünde “Oturumu kapat” düğmesi vardır. Düğme `session.auth.signOut()` işlevini çağırır.

1. İşlev Frappe oturumunu kapatır.
2. Sunucu Keycloak çıkış adresini verir.
3. İşlev adresi denetler. Kurallar şunlardır:
   - Adresin kökeni `VITE_KEYCLOAK_URL` kökeniyle aynı olmalıdır.
   - `http` adresi yalnız Keycloak kökü de `http` ise geçer.
   - Yol `/protocol/openid-connect/logout` ile bitmelidir.
   - Adreste kullanıcı adı ya da parola olamaz.
4. Adres denetimden geçerse tarayıcı bu adrese gider.
5. Adres denetimden geçmezse panelin giriş ekranı açılır. Ekran şu notu gösterir: “Panelden çıktınız. Kimlik oturumunuz açık kalmış olabilir.”

Tarayıcı testleri `VITE_KEYCLOAK_URL` değerini sahte sunucunun Keycloak köküne ayarlar. Ayar `playwright.config.ts` dosyasındadır.

İstek başarısız olabilir. O zaman oturum açık kalır. İşlev hata verir ve düğme yalın bir hata metni gösterir.

## AtonotA Login sözleşmesi

Bu uçlar backend OpenAPI sözleşmelerinde henüz yoktur. Panel bu sözleşmeyi sahte sunucuda uygular. Backend aynı biçimi uygulamalıdır. Kaynak, proje sahibinin 23 Kasım 2026 Pazartesi günkü AtonotA Login kararlarıdır. Ürün sayfası "Kurumsal kimlik ve erişim" analizine dayanır.

Platform adı Keycloak'taki kimlik sağlayıcı takma adıdır. Ad şu kurala uyar: `^[a-z0-9][a-z0-9_-]{0,63}$`. Panel adı adrese koymadan önce bu kuralı denetler. Kurala uymayan ad adrese girmez.

### Platform listesi (G-159)

`GET /api/method/platform_core.api.auth.list_login_providers`

- Uç oturum istemez.
- Uç yalnız açık platformları döner. Sırrı olmayan platform kapalıdır ve listede yoktur.
- Sıra sunucunun sırasıdır. Panel sırayı değiştirmez.
- Yanıt: `{"message": {"providers": [{"alias": "google", "display_name": "Google"}]}}`
- Görünen ad en çok 80 karakterdir. Liste en çok 100 kayıttır. Ad yinelenmez.
- Yanıt bozuksa panel yalnız “AtonotA Login ile oturum aç” düğmesini gösterir. Liste boşsa da böyledir.

### Platformla giriş

`GET /api/method/platform_core.api.auth.start_login?redirect_to=/panel&provider=google`

- Bu bir sayfa geçişidir. Panel `fetch` kullanmaz.
- `provider` verilmezse AtonotA Login giriş ekranı açılır.
- `provider` verilirse sunucu Keycloak adresine `kc_idp_hint=<provider>` ekler. Tarayıcı doğrudan platformun sayfasına gider. Örnek: `accounts.google.com`.
- Platform işi bitince tarayıcı `https://api.login.atonota.net/realms/platform/broker/<provider>/endpoint` yoluna döner. Sonra akış `keycloak_callback` ile sürer.

### Bağlı hesaplar (G-160)

`GET /api/method/platform_core.api.auth.list_linked_accounts`

- Uç oturum ister.
- Yanıt: `{"message": {"providers": [{"alias": "google", "display_name": "Google", "linked": true}], "local_sign_in_methods": 0}}`
- `providers` açık platformları ve bağlı ama kapanmış platformları taşır.
- `local_sign_in_methods` platform dışı giriş yollarının sayısıdır. Örnek: parola ve geçiş anahtarı.

`GET /api/method/platform_core.api.auth.start_link?provider=facebook&redirect_to=/account`

- Bu bir sayfa geçişidir. Hesap sayfasındaki “Facebook hesabını bağla” bağlantısı bu adrese gider.
- Sunucu oturumu denetler. Sonra Keycloak'ın hesap bağlama akışını başlatır (`kc_action=idp_link:<provider>`).
- Bağ, platformun adı ve değişmeyen kullanıcı numarasıyla kurulur. E-postayla kurulmaz.
- İş bitince tarayıcı `redirect_to` yoluna döner. Panel listeyi yeniden okur.

`POST /api/method/platform_core.api.auth.unlink_account`

- Uç oturum ve CSRF belirteci ister. Gövde: `{"provider": "linkedin"}`
- Başarılı yanıt yeni listeyi döner. Biçim `list_linked_accounts` ile aynıdır.
- Bağ son giriş yoluysa sunucu 409 ve `exc_type: LastSignInMethod` döner. Bağ kalır.
- Panel de son giriş yolunda kaldırma düğmesini göstermez. Yine de son karar sunucunundur.

## Tanıtım sayfası

`/atonota-login` adresi AtonotA Login'in tanıtım sayfasıdır (G-165). Sayfa oturum istemez. `Root` bu adreste AuthGate'e girmez. Sayfa ayrı parça olarak yüklenir. Metinler `product/messages.json` dosyasındadır.

## Sahte sunucuda giriş

Sahte sunucu açıkken örnek kullanıcının oturumu baştan açıktır. Giriş ekranını görmek için `oturum-kapali` senaryosunu seçin. Platformsuz giriş ekranı için `platform-yok` senaryosunu seçin. Senaryo seçimi `src/mocks/scenarios.ts` dosyasında yazar. Giriş düğmesi bir sayfa geçişidir. Sahte sunucu sayfa geçişlerini karşılamaz. Bu yüzden giriş akışını yalnız gerçek arka uçla deneyebilirsiniz.

## Ayarlar

| Ayar | Görevi | Varsayılan |
| --- | --- | --- |
| `VITE_SITE_URL` | Kiracı sitesinin kökü | Sayfanın kökü |
| `VITE_KEYCLOAK_URL` | Çıkış adresini denetlemek için Keycloak kökü | `https://api.login.atonota.net` |
| `VITE_KEYCLOAK_REALM` | Keycloak realm adı | `platform` |
| `VITE_CSRF_META_NAME` | CSRF belirtecini taşıyan `meta` öğesinin adı | `csrf-token` |
