import { render } from '@testing-library/react';
import { Input } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { collectTargets, computeOnce, HIT_SUFFIX_CLASS, installSelectRelay } from './engine';
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

describe('R11: Select kök tıklaması seçiciye aktarılır', () => {
  function select(disabled = false) {
    const root = document.createElement('div');
    root.className = 'ant-select' + (disabled ? ' ant-select-disabled' : '');
    const selector = document.createElement('div');
    selector.className = 'ant-select-selector';
    const input = document.createElement('input');
    selector.appendChild(input);
    root.appendChild(selector);
    document.body.appendChild(root);
    return { root, selector, input };
  }

  it('kök öğeye düşen mousedown seçiciye gider ve input odaklanır', () => {
    const stop = installSelectRelay();
    const { root, selector, input } = select();
    const seen: Event[] = [];
    selector.addEventListener('mousedown', (ev) => seen.push(ev));
    const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    root.dispatchEvent(ev);
    expect(seen).toHaveLength(1);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input);
    stop();
  });

  it('disabled Select aktarılmaz', () => {
    const stop = installSelectRelay();
    const { root, selector } = select(true);
    const seen: Event[] = [];
    selector.addEventListener('mousedown', (ev) => seen.push(ev));
    root.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(seen).toHaveLength(0);
    stop();
  });

  it('seçiciye doğrudan gelen mousedown ikinci kez üretilmez', () => {
    const stop = installSelectRelay();
    const { selector } = select();
    const seen: Event[] = [];
    selector.addEventListener('mousedown', (ev) => seen.push(ev));
    selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(seen).toHaveLength(1);
    stop();
  });
});

describe('motor kendi yazımıyla döngüye girmez', () => {
  it('ikinci hesap değişiklik yazmaz', () => {
    const b = button('Kaydet');
    mockRect(b, 0, 0, 100, 42);
    computeOnce();
    const before = b.getAttribute('style');
    const spy = vi.spyOn(b.style, 'setProperty');
    computeOnce();
    expect(spy).not.toHaveBeenCalled();
    expect(b.getAttribute('style')).toBe(before);
  });
});
