import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../../../tests/setup/playwright-fixtures';

/** Sahte sunucunun tanıdığı liste: tablo gerçekten çizilir. `/satis/teklif` hata ekranını açar. */
const LIST = `/ornek/${encodeURIComponent('örnek-kayıt')}`;

/** Sahte sunucunun tanıdığı kayıt: axe kayıt formunu denetler. */
const RECORD = `${LIST}/ORNEK-0003`;

for (const url of ['/', '/satis/teklif', LIST, '/satis/teklif/TEK-0003', RECORD]) {
  test(`axe: ${url}`, async ({ page }, testInfo) => {
    await page.goto(url);
    await expect(page.locator('.shell')).toBeVisible();
    // Kayıt adresinde axe kayıt formunu denetler. Form sahte sunucudan gelince ölçülür.
    if (url === RECORD) {
      await expect(page.getByRole('textbox', { name: /Örnek başlık/ })).toHaveValue('Örnek veri 3');
    }
    await page.waitForTimeout(400);
    // Açılıştaki renk geçişleri bitmeden axe karışmış renkleri ölçer ve kontrast bildirir.
    // Yük altında (WebKit masaüstü) 400 ms yetmiyordu. Bütün hareketlerin bitmesi beklenir.
    await page.evaluate(async () => {
      // Sonsuz döngülü hareketin `finished` sözü dolmaz. Yalnız biten hareketler beklenir.
      await Promise.all(
        document
          .getAnimations()
          .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
          .map((animation) => animation.finished.catch(() => undefined)),
      );
    });
    // Koyu birincil düğme düzeltmesi (`b339770`) bu dalda. Dışlama kalktı; düğmeler de denetlenir.
    const r = await new AxeBuilder({ page }).include('.shell').analyze();
    // Orta ve düşük düzey ihlaller testi düşürmez. Rapora not olarak yazılır.
    for (const v of r.violations.filter((x) => x.impact === 'moderate' || x.impact === 'minor')) {
      testInfo.annotations.push({
        type: `axe-${v.impact ?? 'bilinmiyor'}`,
        description: `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      });
    }
    const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(
      serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
  });
}
