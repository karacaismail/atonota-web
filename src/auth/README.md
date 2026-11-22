# Giriş ve oturum

Bu klasör web panelinin girişini yönetir. Tarayıcı erişim belirteci tutmaz.

## Giriş nasıl yürür?

1. Panel aynı kökte sunulur. Aynı kök, protokolün, sunucu adının ve kapının aynı olmasıdır.
2. Kullanıcı “Atonota ile oturum aç” düğmesine basar.
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

Çıkış düğmesi `session.auth.signOut()` işlevini çağırır. İşlev önce Frappe oturumunu kapatır. Sonra kullanıcıyı Keycloak çıkış sayfasına götürür.

## Sahte sunucuda giriş

Sahte sunucu açıkken örnek kullanıcının oturumu baştan açıktır. Giriş düğmesi bir sayfa geçişidir. Sahte sunucu sayfa geçişlerini karşılamaz. Bu yüzden giriş akışını yalnız gerçek arka uçla deneyebilirsiniz.

## Ayarlar

| Ayar | Görevi | Varsayılan |
| --- | --- | --- |
| `VITE_SITE_URL` | Kiracı sitesinin kökü | Sayfanın kökü |
| `VITE_KEYCLOAK_URL` | Çıkış adresini denetlemek için Keycloak kökü | `https://id.atonota.net` |
| `VITE_KEYCLOAK_REALM` | Keycloak realm adı | `platform` |
| `VITE_CSRF_META_NAME` | CSRF belirtecini taşıyan `meta` öğesinin adı | `csrf-token` |
