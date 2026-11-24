// Panelin adres yolu (Vite `base`). Canlıda panel `/panel/` altında sunulur.
// Arka uç bu yolla derlenmiş paketi bekler (frappesetup backend: platform_core/shell/panel_assets.py).
//
// Kural:
// - `ATONOTA_BASE` verilirse o değer kullanılır. Değer `/` ile başlar. Sonuna `/` eklenir.
// - Verilmezse üretim kipi (`vite build`, `vite preview`) `/panel/` kullanır.
// - Geliştirme ve e2e kipi kök yolda (`/`) çalışır.

export const PANEL_BASE = '/panel/';

const SAFE_BASE = /^\/(?:[A-Za-z0-9._~-]+\/)*$/;

export interface ResolveBaseInput {
  mode: string;
  env: Readonly<Record<string, string | undefined>>;
}

export function resolveBase({ mode, env }: ResolveBaseInput): string {
  const raw = env['ATONOTA_BASE'];
  if (raw === undefined || raw === '') return mode === 'production' ? PANEL_BASE : '/';
  const value = raw.endsWith('/') ? raw : `${raw}/`;
  if (!SAFE_BASE.test(value) || value.split('/').some((part) => part === '.' || part === '..')) {
    throw new Error(`ATONOTA_BASE geçersiz: ${JSON.stringify(raw)}. Örnek: /panel/`);
  }
  return value;
}
