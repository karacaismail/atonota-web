// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { createFormatter, parseFrappeDatetime } from './format';

/** 27 Kasım 2026 bir Cuma günüdür. */
const FRIDAY = '2026-11-27';

describe('createFormatter: biçim dili kullanıcının dilidir (IC-13)', () => {
  const en = createFormatter({ language: 'en', timeZone: 'UTC', currency: 'TRY' });
  const tr = createFormatter({ language: 'tr', timeZone: 'UTC', currency: 'TRY' });

  it('dil en olunca sayı İngilizce biçimde yazılır', () => {
    expect(en.number(1234567.5)).toBe('1,234,567.5');
    expect(tr.number(1234567.5)).toBe('1.234.567,5');
  });

  it('dil en olunca tarih İngilizce biçimde yazılır', () => {
    expect(en.date(FRIDAY)).toBe('Friday, November 27, 2026');
    expect(tr.date(FRIDAY)).toBe('27 Kasım 2026 Cuma');
  });

  it('okunamayan tarih olduğu gibi döner', () => {
    expect(en.date('tarih yok')).toBe('tarih yok');
  });

  it('para, açılış verisindeki para birimiyle ve kullanıcının diliyle yazılır', () => {
    expect(en.currency(1234.5)).toContain('1,234.50');
    expect(en.currency(1234.5)).toContain('TRY');
    expect(tr.currency(1234.5)).toContain('1.234,50');
  });

  it('para birimi yoksa tutar düz sayı olarak yazılır', () => {
    const none = createFormatter({ language: 'en', timeZone: 'UTC', currency: null });
    expect(none.currency(1234.5)).toBe('1,234.5');
  });

  it('liste kullanıcının diliyle bağlanır', () => {
    expect(en.list(['a', 'b', 'c'])).toBe('a, b, and c');
    expect(tr.list(['a', 'b', 'c'])).toBe('a, b ve c');
  });
});

describe('saat dilimi açılış verisinden gelir (IC-13)', () => {
  const instant = new Date('2026-11-27T06:05:00Z');

  it('saat, sitenin saat diliminde yazılır', () => {
    const istanbul = createFormatter({
      language: 'tr',
      timeZone: 'Europe/Istanbul',
      currency: null,
    });
    const newYork = createFormatter({
      language: 'tr',
      timeZone: 'America/New_York',
      currency: null,
    });
    expect(istanbul.time(instant)).toBe('09:05');
    expect(newYork.time(instant)).toBe('01:05');
  });

  it('Frappe tarih-saat değeri sitenin saat dilimiyle okunur', () => {
    expect(parseFrappeDatetime('2026-11-27 09:05:00', 'Europe/Istanbul')?.toISOString()).toBe(
      '2026-11-27T06:05:00.000Z',
    );
    expect(parseFrappeDatetime('2026-11-27 09:05:00', 'America/New_York')?.toISOString()).toBe(
      '2026-11-27T14:05:00.000Z',
    );
    // Yaz saati: New York UTC-4 olur.
    expect(
      parseFrappeDatetime('2026-07-01 09:05:00.123456', 'America/New_York')?.toISOString(),
    ).toBe('2026-07-01T13:05:00.123Z');
  });

  it('okunamayan tarih-saat değeri sonuç vermez', () => {
    expect(parseFrappeDatetime('tarih yok', 'Europe/Istanbul')).toBeUndefined();
    expect(parseFrappeDatetime('2026-13-40 25:99:00', 'Europe/Istanbul')).toBeUndefined();
  });

  it('Frappe tarih-saat değeri sitenin saatiyle ve kullanıcının diliyle yazılır', () => {
    const en = createFormatter({ language: 'en', timeZone: 'America/New_York', currency: null });
    expect(en.frappeDateTime('2026-11-27 09:05:00')).toBe('Friday, November 27, 2026 at 09:05 AM');
  });
});
