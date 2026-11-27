/**
 * `<html lang>` and `<html dir>` follow the UI language (IC-14, AJA-1364).
 * The tests were written before the code.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { LanguageProvider, PSEUDO_RTL_TAG, resolveDocumentLanguage, useSetLanguage } from './index';

const html = () => document.documentElement;

afterEach(() => {
  html().removeAttribute('lang');
  html().removeAttribute('dir');
});

describe('resolveDocumentLanguage: dilden lang ve dir', () => {
  it('dil en olunca lang en-GB ve dir ltr olur; :lang(en) eşleşir', () => {
    expect(resolveDocumentLanguage('en')).toEqual({ language: 'en', lang: 'en-GB', dir: 'ltr' });
  });

  it('dil tr olunca lang tr-TR ve dir ltr olur', () => {
    expect(resolveDocumentLanguage('tr')).toEqual({ language: 'tr', lang: 'tr-TR', dir: 'ltr' });
  });

  it.each([[undefined], [null], [''], ['   '], ['de']])(
    'dil verisi %j olunca lang en-GB ve dir ltr olur; lang boş kalmaz',
    (raw) => {
      expect(resolveDocumentLanguage(raw)).toEqual({ language: 'en', lang: 'en-GB', dir: 'ltr' });
    },
  );

  it('sağdan sola sahte dil yalnız izin verilince dir rtl verir', () => {
    expect(resolveDocumentLanguage(PSEUDO_RTL_TAG, { allowPseudo: true })).toEqual({
      language: 'en',
      lang: PSEUDO_RTL_TAG,
      dir: 'rtl',
    });
    // Without permission (production build) the pseudo language is an unsupported language.
    expect(resolveDocumentLanguage(PSEUDO_RTL_TAG)).toEqual({
      language: 'en',
      lang: 'en-GB',
      dir: 'ltr',
    });
  });
});

function LanguageButtons() {
  const setLanguage = useSetLanguage();
  return (
    <>
      <button type="button" onClick={() => setLanguage('tr')}>
        Türkçe
      </button>
      <button type="button" onClick={() => setLanguage(PSEUDO_RTL_TAG)}>
        Sahte sağdan sola
      </button>
      <button type="button" onClick={() => setLanguage(undefined)}>
        Dil yok
      </button>
    </>
  );
}

describe('LanguageProvider: <html> öğesi dili izler', () => {
  it('ilk çizimde dil verisi yoksa <html lang="en-GB" dir="ltr"> olur', () => {
    render(
      <LanguageProvider>
        <p>içerik</p>
      </LanguageProvider>,
    );
    expect(html().getAttribute('lang')).toBe('en-GB');
    expect(html().getAttribute('dir')).toBe('ltr');
  });

  it('dil değişince lang ve dir değişir, formdaki yazılmış metin silinmez', async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider initialLanguage="en" allowPseudo>
        <label>
          Not
          <input type="text" />
        </label>
        <LanguageButtons />
      </LanguageProvider>,
    );
    const input = screen.getByRole('textbox', { name: 'Not' });
    await user.type(input, 'Yarım kalan taslak');
    expect(html().getAttribute('lang')).toBe('en-GB');

    await user.click(screen.getByRole('button', { name: 'Türkçe' }));
    expect(html().getAttribute('lang')).toBe('tr-TR');
    expect(html().getAttribute('dir')).toBe('ltr');
    expect(input).toHaveValue('Yarım kalan taslak');

    await user.click(screen.getByRole('button', { name: 'Sahte sağdan sola' }));
    expect(html().getAttribute('lang')).toBe(PSEUDO_RTL_TAG);
    expect(html().getAttribute('dir')).toBe('rtl');
    expect(screen.getByRole('textbox', { name: 'Not' })).toBe(input);
    expect(input).toHaveValue('Yarım kalan taslak');

    await user.click(screen.getByRole('button', { name: 'Dil yok' }));
    expect(html().getAttribute('lang')).toBe('en-GB');
    expect(html().getAttribute('dir')).toBe('ltr');
    expect(input).toHaveValue('Yarım kalan taslak');
  });
});
