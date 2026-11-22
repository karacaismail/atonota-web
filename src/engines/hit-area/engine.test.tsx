import { render } from '@testing-library/react';
import { Input } from 'antd';
import { afterEach, describe, expect, it } from 'vitest';

import { collectTargets, computeOnce, HIT_SUFFIX_CLASS } from './engine';
import { HitSuffix } from './HitSuffix';

function mockRect(el: HTMLElement, left: number, top: number, width: number, height: number) {
  el.getBoundingClientRect = () =>
    ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

function button(label: string, extra = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = `ant-btn ${extra}`.trim();
  b.textContent = label;
  document.body.appendChild(b);
  return b;
}

describe('dokunma alanı motoru (DOM)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('R7 Yerleşim: static hedefi relative yapar ve değişkenleri yazar', () => {
    const b = button('Kaydet');
    mockRect(b, 0, 0, 100, 42);
    computeOnce();
    expect(b.classList.contains('hit')).toBe(true);
    expect(b.style.position).toBe('relative');
    expect(b.style.getPropertyValue('--hit-t')).toBe('2.52px');
    expect(b.style.getPropertyValue('--hit-l')).toBe('6px');
    expect(b.dataset['hitArea']).toBe('112 × 47.04');
    expect(b.dataset['hitOk']).toBe('1');
  });

  it('R7: zaten konumlu hedefin position değeri değişmez', () => {
    const b = button('Kaydet');
    b.style.position = 'absolute';
    mockRect(b, 0, 0, 100, 42);
    computeOnce();
    expect(b.style.position).toBe('absolute');
  });

  it('R8 Kenarlık: border kalınlığı offset’e eklenir', () => {
    const b = button('Kaydet');
    b.style.borderWidth = '1px';
    b.style.borderStyle = 'solid';
    mockRect(b, 0, 0, 100, 42);
    computeOnce();
    expect(b.style.getPropertyValue('--hit-t')).toBe('3.52px');
    expect(b.style.getPropertyValue('--hit-l')).toBe('7px');
    expect(b.dataset['hit']).toBe('2.52 6 2.52 6');
  });

  it('R6 Pasif: disabled buton genişlemez', () => {
    const b = button('Kaydet');
    b.disabled = true;
    mockRect(b, 0, 0, 100, 42);
    computeOnce();
    expect(b.classList.contains('hit')).toBe(false);
    expect(b.style.getPropertyValue('--hit-t')).toBe('');
  });

  it('R5 İç içe: hedef içindeki hedef toplanmaz', () => {
    const wrap = document.createElement('span');
    wrap.className = 'ant-input-affix-wrapper';
    const inner = document.createElement('button');
    inner.className = 'ant-btn';
    wrap.appendChild(inner);
    document.body.appendChild(wrap);
    expect(collectTargets(document)).toEqual([wrap]);
  });

  it('R4 Bitişik: Space.Compact içindeki iki butonun ortak kenarı 0 olur', () => {
    const a = button('Sol');
    const b = button('Sağ');
    mockRect(a, 0, 0, 100, 42);
    mockRect(b, 99, 0, 100, 42);
    computeOnce();
    expect(a.style.getPropertyValue('--hit-r')).toBe('0px');
    expect(b.style.getPropertyValue('--hit-l')).toBe('0px');
  });

  it('R3 Komşu: engel genişlemeyi sınırlar', () => {
    const a = button('Kaydet');
    const badge = document.createElement('span');
    badge.dataset['hitObstacle'] = '';
    document.body.appendChild(badge);
    mockRect(a, 0, 0, 100, 42);
    mockRect(badge, 104, 0, 20, 20);
    computeOnce();
    expect(a.style.getPropertyValue('--hit-r')).toBe('2px');
    expect(a.dataset['hitLimited']).toBe('1');
  });

  it('R9 Input: HitSuffix inputu affix sarmalayıcıya alır ve kural sarmalayıcıya uygulanır', () => {
    const { container } = render(<Input suffix={<HitSuffix />} aria-label="Ad" />);
    const wrapper = container.querySelector<HTMLElement>('.ant-input-affix-wrapper');
    const input = container.querySelector<HTMLInputElement>('input.ant-input');
    expect(wrapper).not.toBeNull();
    expect(container.querySelector(`.ant-input-suffix > .${HIT_SUFFIX_CLASS}`)).not.toBeNull();
    mockRect(wrapper!, 0, 0, 200, 42);
    computeOnce({ root: container });
    expect(wrapper!.classList.contains('hit')).toBe(true);
    expect(input!.classList.contains('hit')).toBe(false);
  });

  it('yeniden hesaplamada eski değerler temizlenir', () => {
    const b = button('Kaydet');
    mockRect(b, 0, 0, 100, 42);
    computeOnce();
    b.disabled = true;
    computeOnce();
    expect(b.classList.contains('hit')).toBe(false);
    expect(b.dataset['hitArea']).toBeUndefined();
  });
});
