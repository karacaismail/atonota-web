import { render, screen, waitFor } from '@testing-library/react';
import { Empty } from 'antd';
import dayjs from 'dayjs';
import { http } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createPlatformSession } from '@/auth';
import { SAMPLE_CSRF_TOKEN, sampleBootstrap } from '@/mocks/fixtures';
import { resetMockState } from '@/mocks/handlers';
import { mockServer } from '@/mocks/node';

import { AppProviders } from '../AppProviders';
import { Root } from '../Root';

import {
  FALLBACK_LANGUAGE,
  LocalizedXProvider,
  localeBundle,
  resolveLanguage,
  useLanguage,
} from './index';

/** 27 Kasım 2026 bir Cuma günüdür. Beklenen ad takvimden gelir, koddan kopyalanmaz. */
const FRIDAY = '2026-11-27';

function LanguageProbe() {
  const language = useLanguage();
  return (
    <>
      <output aria-label="Dil">{language}</output>
      <output aria-label="Gün">{dayjs(FRIDAY).format('dddd')}</output>
      <Empty />
    </>
  );
}

describe('resolveLanguage: açılış verisindeki dil', () => {
  it('yedek dil tr olur', () => {
    expect(FALLBACK_LANGUAGE).toBe('tr');
  });

  it.each([
    ['en', 'en'],
    ['tr', 'tr'],
    ['en-US', 'en'],
    ['EN', 'en'],
    ['', 'tr'],
    ['   ', 'tr'],
    [undefined, 'tr'],
    [null, 'tr'],
    ['de', 'tr'],
  ])('%j dili %s olur', (raw, expected) => {
    expect(resolveLanguage(raw)).toBe(expected);
  });
});

describe('AppProviders: Ant Design ve Day.js aynı dili kullanır', () => {
  it('dil en olunca Ant Design ve Day.js İngilizce çalışır', () => {
    render(
      <AppProviders engines={false} initialLanguage="en">
        <LanguageProbe />
      </AppProviders>,
    );
    expect(screen.getByRole('status', { name: 'Dil' })).toHaveTextContent('en');
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Gün' })).toHaveTextContent('Friday');
    expect(dayjs.locale()).toBe('en');
  });

  it('dil boşsa yedek dil tr olur', () => {
    render(
      <AppProviders engines={false} initialLanguage="">
        <LanguageProbe />
      </AppProviders>,
    );
    expect(screen.getByRole('status', { name: 'Dil' })).toHaveTextContent('tr');
    expect(screen.getByText('Veri Yok')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Gün' })).toHaveTextContent('Cuma');
    expect(dayjs.locale()).toBe('tr');
  });
});

describe('Ant Design X: dil alanları antd nesnesiyle birleşir', () => {
  it('X dil nesnesi aynı dildeki antd nesnesinin bütün alanlarını taşır', () => {
    for (const language of ['tr', 'en'] as const) {
      const { antd, x } = localeBundle(language);
      expect(x).toMatchObject(antd);
      expect(x.locale).toBe(antd.locale);
    }
  });

  it('X sağlayıcısının altında antd bileşeni uygulama dilini kullanır', () => {
    render(
      <AppProviders engines={false} initialLanguage="en">
        <LocalizedXProvider>
          <Empty />
        </LocalizedXProvider>
      </AppProviders>,
    );
    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});

const SITE = 'https://kiraci.example.test';

function session() {
  return createPlatformSession({
    env: { VITE_SITE_URL: SITE },
    origin: SITE,
    document,
    navigate: vi.fn(),
    currentPath: () => '/',
    csrfToken: SAMPLE_CSRF_TOKEN,
  });
}

function bootstrapWithLanguage(language: string) {
  mockServer.use(
    http.get('*/api/method/platform_core.api.shell.get_bootstrap', () =>
      Response.json({
        message: { ...sampleBootstrap, user: { ...sampleBootstrap.user, language } },
      }),
    ),
  );
}

describe('Root: dil açılış verisinden gelir', () => {
  beforeAll(() => mockServer.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    mockServer.resetHandlers();
    resetMockState();
  });
  afterAll(() => mockServer.close());

  it('kullanıcı dili en ise arayüz İngilizce olur', async () => {
    bootstrapWithLanguage('en');
    render(
      <Root session={session()} engines={false}>
        <LanguageProbe />
      </Root>,
    );
    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Dil' })).toHaveTextContent('en'),
    );
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Gün' })).toHaveTextContent('Friday');
  });

  it('kullanıcı dili boşsa arayüz yedek dilde kalır', async () => {
    bootstrapWithLanguage('');
    render(
      <Root session={session()} engines={false}>
        <LanguageProbe />
      </Root>,
    );
    expect(await screen.findByText('Veri Yok')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Dil' })).toHaveTextContent('tr');
    expect(screen.getByRole('status', { name: 'Gün' })).toHaveTextContent('Cuma');
  });
});
