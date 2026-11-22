/**
 * CSRF belirteci yalnız bellekte durur (SZ-7, GV-4).
 * Tarayıcı deposuna, adrese ve günlüğe yazılmaz.
 */
export interface CsrfStore {
  get(): string | undefined;
  set(token: string | undefined): void;
  clear(): void;
}

export function createCsrfStore(initial?: string): CsrfStore {
  let token = initial && initial.length > 0 ? initial : undefined;
  return {
    get: () => token,
    set: (next) => {
      token = next && next.length > 0 ? next : undefined;
    },
    clear: () => {
      token = undefined;
    },
  };
}

/**
 * Sunucunun `/panel` sayfasına koyduğu belirteci okur.
 * Belirteç `meta` öğesinin `content` alanındadır.
 */
export function readCsrfFromDocument(doc: Document, metaName: string): string | undefined {
  const meta = doc.querySelector<HTMLMetaElement>(`meta[name="${CSS.escape(metaName)}"]`);
  const value = meta?.content.trim();
  return value && value.length > 0 ? value : undefined;
}
