/**
 * Dokunma alanı hesabı (kaynak: hitArea.rules R1–R10, hitArea.algorithm).
 * Bu dosya DOM'a dokunmaz; saf hesap yapar. DOM uygulaması engine.ts dosyasındadır.
 */
import { hitArea as hitAreaTokens } from '@/design/tokens';

export interface Box {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface Extension {
  t: number;
  r: number;
  b: number;
  l: number;
}

export interface HitTarget {
  id: string;
  box: Box;
  /** R6: disabled veya görünmeyen kontrol genişlemez. */
  active: boolean;
  /** R8: kenarlık kalınlıkları; ölçüm border dahil kutudan yapılır, offset'e eklenir. */
  border?: Partial<Extension>;
  /** R5: üst hedefin kimliği. Varsa bu hedef hesaba girmez. */
  parentId?: string;
}

export interface Obstacle {
  box: Box;
  active: boolean;
}

export interface HitResult {
  id: string;
  active: boolean;
  /** Komşuya göre sınırlı saf genişleme (border hariç). */
  extension: Extension;
  /** CSS değişkenlerine yazılacak değer: genişleme + kenarlık. */
  offset: Extension;
  visible: { width: number; height: number };
  hit: { width: number; height: number };
  limitedByNeighbour: boolean;
  /** R10: tıklanabilir yükseklik ≥ minTarget. */
  meetsMinTarget: boolean;
}

export interface ComputeOptions {
  expand?: number;
  minTarget?: number;
  /** İki kutunun aynı satır veya sütun sayılması için gereken örtüşme (px). */
  epsilon?: number;
}

export const EPSILON = 0.5;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function box(left: number, top: number, width: number, height: number): Box {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function overlapLength(a1: number, a2: number, b1: number, b2: number): number {
  return Math.min(a2, b2) - Math.max(a1, b1);
}

/** R1 + R2: komşu yokken her kenarın ideal genişlemesi. */
export function idealExtension(b: Box, expand: number): Extension {
  const dx = (b.width * expand) / 2;
  const dy = (b.height * expand) / 2;
  return { t: dy, r: dx, b: dy, l: dx };
}

/** R3 + R4: komşuya bakan kenarı boşluğun yarısıyla sınırlar; boşluk ≤ 0 ise 0. */
export function limitByNeighbour(ext: Extension, a: Box, b: Box, epsilon = EPSILON): void {
  const sameRow = overlapLength(a.top, a.bottom, b.top, b.bottom) > epsilon;
  const sameCol = overlapLength(a.left, a.right, b.left, b.right) > epsilon;
  if (!sameRow && !sameCol) return; // çapraz komşu: dokunmaz
  const acx = (a.left + a.right) / 2;
  const acy = (a.top + a.bottom) / 2;
  const bcx = (b.left + b.right) / 2;
  const bcy = (b.top + b.bottom) / 2;
  const horizontal =
    sameRow && !sameCol
      ? true
      : sameCol && !sameRow
        ? false
        : Math.abs(bcx - acx) / (a.width + b.width) >= Math.abs(bcy - acy) / (a.height + b.height);
  if (horizontal) {
    if (bcx > acx) ext.r = Math.min(ext.r, Math.max(0, (b.left - a.right) / 2));
    else ext.l = Math.min(ext.l, Math.max(0, (a.left - b.right) / 2));
  } else {
    if (bcy > acy) ext.b = Math.min(ext.b, Math.max(0, (b.top - a.bottom) / 2));
    else ext.t = Math.min(ext.t, Math.max(0, (a.top - b.bottom) / 2));
  }
}

/** Bütün hedefler için genişlemeyi hesaplar. */
export function computeHitAreas(
  targets: readonly HitTarget[],
  obstacles: readonly Obstacle[] = [],
  options: ComputeOptions = {},
): HitResult[] {
  const expand = options.expand ?? hitAreaTokens.expand;
  const minTarget = options.minTarget ?? hitAreaTokens.minTarget;
  const epsilon = options.epsilon ?? EPSILON;

  // R5: başka bir hedefin içindeki hedefler elenir; dıştaki hedef kapsar.
  const ids = new Set(targets.map((t) => t.id));
  const topLevel = targets.filter((t) => !(t.parentId && ids.has(t.parentId)));

  return topLevel.map((a) => {
    const visible = { width: a.box.width, height: a.box.height };
    if (!a.active) {
      const zero = { t: 0, r: 0, b: 0, l: 0 };
      return {
        id: a.id,
        active: false,
        extension: zero,
        offset: zero,
        visible,
        hit: visible,
        limitedByNeighbour: false,
        meetsMinTarget: visible.height >= minTarget,
      };
    }
    const ideal = idealExtension(a.box, expand);
    const ext: Extension = { ...ideal };
    for (const b of topLevel) {
      if (b === a || !b.active) continue;
      limitByNeighbour(ext, a.box, b.box, epsilon);
    }
    for (const o of obstacles) {
      if (!o.active) continue;
      limitByNeighbour(ext, a.box, o.box, epsilon);
    }
    const border = { t: 0, r: 0, b: 0, l: 0, ...a.border };
    const hit = { width: a.box.width + ext.l + ext.r, height: a.box.height + ext.t + ext.b };
    return {
      id: a.id,
      active: true,
      extension: ext,
      offset: {
        t: ext.t + border.t,
        r: ext.r + border.r,
        b: ext.b + border.b,
        l: ext.l + border.l,
      },
      visible,
      hit,
      limitedByNeighbour: (['t', 'r', 'b', 'l'] as const).some((k) => ideal[k] - ext[k] > 0.01),
      meetsMinTarget: hit.height >= minTarget,
    };
  });
}
