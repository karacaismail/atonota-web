export interface FlyoutPositionInput {
  /** Üst öğenin pencereye göre konumu. */
  anchor: { top: number; height: number };
  /** Sidebar sağ kenarının pencereye göre x konumu. */
  sidebarRight: number;
  flyoutHeight: number;
  viewportHeight: number;
  gap: number;
  clampPadding: number;
}

export interface FlyoutPosition {
  left: number;
  top: number;
  /** Okun flyout üst kenarına göre dikey konumu. */
  caret: number;
}

/** F1–F3 kurallarını uygular. Saf işlevdir. */
export function flyoutPosition(input: FlyoutPositionInput): FlyoutPosition {
  const { anchor, sidebarRight, flyoutHeight, viewportHeight, gap, clampPadding } = input;
  const center = anchor.top + anchor.height / 2;
  const ideal = center - flyoutHeight / 2;
  const max = viewportHeight - flyoutHeight - clampPadding;
  const top = Math.max(clampPadding, Math.min(ideal, max));
  return { left: sidebarRight + gap, top, caret: center - top };
}
