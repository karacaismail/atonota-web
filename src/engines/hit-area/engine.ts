/**
 * Dokunma alanı motoru: DOM uygulaması (R7, R8, R9 ve algoritma 1–7).
 * Hesap compute.ts dosyasındadır. Bu dosya hedefleri toplar, ölçer ve
 * `--hit-t/r/b/l` değişkenlerini yazar. `::after` katmanı kaynaktaki CSS ile çizilir.
 */
import { hitArea as hitAreaTokens } from '@/design/tokens';

import { computeHitAreas, round2, type Box, type HitResult, type HitTarget } from './compute';

/** Algoritma 1 + C4: buton, input sarmalayıcı, select, link ve seçim kontrolleri. */
export const HIT_TARGET_SELECTOR = [
  '.ant-btn',
  '.ant-input-affix-wrapper',
  '.ant-select',
  'a.tlink',
  '[data-hit-target]',
  '.ant-checkbox-wrapper',
  '.ant-radio-wrapper',
  '.ant-radio-button-wrapper',
  '.ant-switch',
  '.ant-tabs-tab',
  '.ant-segmented-item',
].join(', ');

/** Engel: hedef değildir, genişlemez; hedeflerin genişlemesi üstüne taşmaz (R3). */
export const HIT_OBSTACLE_SELECTOR = '[data-hit-obstacle]';

/** R6: disabled kontroller. */
export const HIT_DISABLED_SELECTOR = [
  '[disabled]',
  '[aria-disabled="true"]',
  '.ant-btn-disabled',
  '.ant-input-affix-wrapper-disabled',
  '.ant-select-disabled',
  '.ant-checkbox-wrapper-disabled',
  '.ant-radio-wrapper-disabled',
  '.ant-switch-disabled',
  '.ant-segmented-item-disabled',
].join(', ');

/** R9: Input için görünmez suffix sınıfı. Kaynak CSS `.ant-input-suffix:has(> .hit-sfx)` gizler. */
export const HIT_SUFFIX_CLASS = 'hit-sfx';
export const HIT_CLASS = 'hit';
export const HIT_UPDATE_EVENT = 'hitarea:update';

export interface HitAreaEngineOptions {
  root?: ParentNode & Node;
  expand?: number;
  minTarget?: number;
}

function toBox(r: DOMRect): Box {
  return {
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    left: r.left,
    width: r.width,
    height: r.height,
  };
}

/** R5: başka bir hedefin içinde olmayan hedefler. */
export function collectTargets(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(HIT_TARGET_SELECTOR)).filter(
    (el) => !el.parentElement?.closest(HIT_TARGET_SELECTOR),
  );
}

function isActive(el: HTMLElement, box: Box): boolean {
  return box.width > 0 && box.height > 0 && !el.matches(HIT_DISABLED_SELECTOR);
}

function borderOf(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const n = (v: string) => parseFloat(v) || 0;
  return {
    t: n(cs.borderTopWidth),
    r: n(cs.borderRightWidth),
    b: n(cs.borderBottomWidth),
    l: n(cs.borderLeftWidth),
  };
}

/** R7 + R8 + R10: sonucu CSS değişkenlerine ve veri niteliklerine yazar. */
export function applyResult(el: HTMLElement, result: HitResult): void {
  if (!result.active) {
    clearElement(el);
    return;
  }
  if (getComputedStyle(el).position === 'static') {
    el.style.position = 'relative';
  }
  el.classList.add(HIT_CLASS);
  el.style.setProperty('--hit-t', `${round2(result.offset.t)}px`);
  el.style.setProperty('--hit-r', `${round2(result.offset.r)}px`);
  el.style.setProperty('--hit-b', `${round2(result.offset.b)}px`);
  el.style.setProperty('--hit-l', `${round2(result.offset.l)}px`);
  const e = result.extension;
  el.dataset['hit'] = [e.t, e.r, e.b, e.l].map(round2).join(' ');
  el.dataset['hitVisible'] = `${round2(result.visible.width)} × ${round2(result.visible.height)}`;
  el.dataset['hitArea'] = `${round2(result.hit.width)} × ${round2(result.hit.height)}`;
  el.dataset['hitOk'] = result.meetsMinTarget ? '1' : '0';
  el.dataset['hitLimited'] = result.limitedByNeighbour ? '1' : '0';
}

export function clearElement(el: HTMLElement): void {
  el.classList.remove(HIT_CLASS);
  delete el.dataset['hit'];
  delete el.dataset['hitVisible'];
  delete el.dataset['hitArea'];
  delete el.dataset['hitOk'];
  delete el.dataset['hitLimited'];
  for (const k of ['--hit-t', '--hit-r', '--hit-b', '--hit-l']) {
    el.style.removeProperty(k);
  }
}

/** Bir kez hesaplar ve uygular. Testler ve manuel yenileme için dışa açıktır. */
export function computeOnce(options: HitAreaEngineOptions = {}): HitResult[] {
  const root = options.root ?? document;
  const elements = collectTargets(root);
  const byId = new Map<string, HTMLElement>();
  const targets: HitTarget[] = elements.map((el, i) => {
    const id = String(i);
    byId.set(id, el);
    const box = toBox(el.getBoundingClientRect());
    return { id, box, active: isActive(el, box), border: borderOf(el) };
  });
  const obstacles = Array.from(root.querySelectorAll<HTMLElement>(HIT_OBSTACLE_SELECTOR)).map(
    (el) => {
      const box = toBox(el.getBoundingClientRect());
      return { box, active: box.width > 0 && box.height > 0 };
    },
  );
  const computeOptions: { expand?: number; minTarget?: number } = {};
  if (options.expand !== undefined) computeOptions.expand = options.expand;
  if (options.minTarget !== undefined) computeOptions.minTarget = options.minTarget;
  const results = computeHitAreas(targets, obstacles, computeOptions);
  for (const r of results) {
    const el = byId.get(r.id);
    if (el) applyResult(el, r);
  }
  document.dispatchEvent(new CustomEvent(HIT_UPDATE_EVENT, { detail: results }));
  return results;
}

export interface HitAreaEngine {
  refresh: () => void;
  stop: () => void;
}

/**
 * Algoritma 7: DOM değişikliği, yeniden boyutlanma ve font yüklenmesinde yeniden hesaplar.
 * requestAnimationFrame ile tek seferde çalışır.
 */
export function startHitAreaEngine(options: HitAreaEngineOptions = {}): HitAreaEngine {
  const root = options.root ?? document;
  const observeRoot: Node = root instanceof Document ? root.body : root;
  let pending = false;
  let stopped = false;

  const run = () => {
    pending = false;
    if (stopped) return;
    computeOnce(options);
  };
  const schedule = () => {
    if (pending || stopped) return;
    pending = true;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  };

  const mutation = typeof MutationObserver !== 'undefined' ? new MutationObserver(schedule) : null;
  mutation?.observe(observeRoot, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'disabled', 'aria-disabled', 'style'],
  });
  const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
  if (observeRoot instanceof Element) resize?.observe(observeRoot);
  window.addEventListener('resize', schedule);
  const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
  fonts?.ready.then(schedule, () => undefined);
  schedule();

  return {
    refresh: schedule,
    stop: () => {
      stopped = true;
      mutation?.disconnect();
      resize?.disconnect();
      window.removeEventListener('resize', schedule);
    },
  };
}

export { hitAreaTokens };
