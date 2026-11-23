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

/** Yalnız değer değişince yazar; böylece motorun kendi yazımı yeni bir hesaplama tetiklemez. */
function setVar(el: HTMLElement, name: string, value: string): boolean {
  if (el.style.getPropertyValue(name) === value) return false;
  el.style.setProperty(name, value);
  return true;
}
function setData(el: HTMLElement, key: string, value: string): boolean {
  if (el.dataset[key] === value) return false;
  el.dataset[key] = value;
  return true;
}

/** R7 + R8 + R10: sonucu CSS değişkenlerine ve veri niteliklerine yazar. Değişiklik olduysa true döner. */
export function applyResult(el: HTMLElement, result: HitResult): boolean {
  if (!result.active) {
    return clearElement(el);
  }
  let changed = false;
  if (getComputedStyle(el).position === 'static') {
    el.style.position = 'relative';
    changed = true;
  }
  if (!el.classList.contains(HIT_CLASS)) {
    el.classList.add(HIT_CLASS);
    changed = true;
  }
  changed = setVar(el, '--hit-t', `${round2(result.offset.t)}px`) || changed;
  changed = setVar(el, '--hit-r', `${round2(result.offset.r)}px`) || changed;
  changed = setVar(el, '--hit-b', `${round2(result.offset.b)}px`) || changed;
  changed = setVar(el, '--hit-l', `${round2(result.offset.l)}px`) || changed;
  const e = result.extension;
  changed = setData(el, 'hit', [e.t, e.r, e.b, e.l].map(round2).join(' ')) || changed;
  changed =
    setData(
      el,
      'hitVisible',
      `${round2(result.visible.width)} × ${round2(result.visible.height)}`,
    ) || changed;
  changed =
    setData(el, 'hitArea', `${round2(result.hit.width)} × ${round2(result.hit.height)}`) || changed;
  changed = setData(el, 'hitOk', result.meetsMinTarget ? '1' : '0') || changed;
  changed = setData(el, 'hitLimited', result.limitedByNeighbour ? '1' : '0') || changed;
  return changed;
}

export function clearElement(el: HTMLElement): boolean {
  if (!el.classList.contains(HIT_CLASS) && el.dataset['hit'] === undefined) return false;
  el.classList.remove(HIT_CLASS);
  delete el.dataset['hit'];
  delete el.dataset['hitVisible'];
  delete el.dataset['hitArea'];
  delete el.dataset['hitOk'];
  delete el.dataset['hitLimited'];
  for (const k of ['--hit-t', '--hit-r', '--hit-b', '--hit-l']) {
    el.style.removeProperty(k);
  }
  return true;
}

/** Motorun son geçişte yazdığı öğeler. Bu öğelerin style/class mutasyonları yeni hesap tetiklemez. */
const writtenByEngine = new WeakSet<Element>();

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
  // Sayfa kenarı: dokunma katmanı yatay kaydırma yaratmasın (yalnız sol ve sağ kenar).
  const computeOptions: {
    expand?: number;
    minTarget?: number;
    bounds?: { left: number; right: number };
  } = {};
  const pageWidth = document.documentElement.clientWidth;
  if (pageWidth > 0) computeOptions.bounds = { left: 0, right: pageWidth };
  if (options.expand !== undefined) computeOptions.expand = options.expand;
  if (options.minTarget !== undefined) computeOptions.minTarget = options.minTarget;
  const results = computeHitAreas(targets, obstacles, computeOptions);
  for (const r of results) {
    const el = byId.get(r.id);
    if (el && applyResult(el, r)) writtenByEngine.add(el);
  }
  document.dispatchEvent(new CustomEvent(HIT_UPDATE_EVENT, { detail: results }));
  return results;
}

/**
 * R11: Select'in +%12 katmanı (::after) kök öğeye aittir; tıklama kök öğeye düşer ve antd'nin
 * seçici üzerindeki dinleyicisine ulaşmaz. Motor, kök öğeye düşen mousedown olayını seçiciye aktarır.
 * Böylece genişletilmiş alan da listeyi açar. Disabled Select'e dokunulmaz.
 */
export function relaySelectMouseDown(event: MouseEvent): boolean {
  const t = event.target;
  if (!(t instanceof Element) || !t.classList.contains('ant-select')) return false;
  if (t.classList.contains('ant-select-disabled')) return false;
  const selector = t.querySelector<HTMLElement>('.ant-select-selector');
  if (!selector) return false;
  event.stopPropagation();
  event.preventDefault();
  selector.dispatchEvent(
    new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: event.clientX,
      clientY: event.clientY,
      button: event.button,
    }),
  );
  t.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  return true;
}

export function installSelectRelay(doc: Document = document): () => void {
  const handler = (ev: MouseEvent) => {
    relaySelectMouseDown(ev);
  };
  doc.addEventListener('mousedown', handler, true);
  return () => doc.removeEventListener('mousedown', handler, true);
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

  const onMutations = (records: MutationRecord[]) => {
    const relevant = records.some((rec) => {
      if (rec.type !== 'attributes') return true;
      const target = rec.target;
      // Motorun kendi yazdığı style/class ve data-hit-* değişiklikleri döngü yaratmasın.
      if (target instanceof Element && writtenByEngine.has(target)) {
        const n = rec.attributeName ?? '';
        if (n === 'style' || n === 'class' || n.startsWith('data-hit')) return false;
      }
      return true;
    });
    if (relevant) schedule();
  };
  const mutation =
    typeof MutationObserver !== 'undefined' ? new MutationObserver(onMutations) : null;
  mutation?.observe(observeRoot, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'disabled', 'aria-disabled', 'style'],
  });
  const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
  if (observeRoot instanceof Element) resize?.observe(observeRoot);
  window.addEventListener('resize', schedule);
  const uninstallRelay = installSelectRelay(document);
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
      uninstallRelay();
    },
  };
}

export { hitAreaTokens };
