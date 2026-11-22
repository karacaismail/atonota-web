import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GenUI } from './GenUI';
import { GENUI_REGISTRY } from './registry';
import { parseBlocks } from './schema';
import type { GenUIBlock } from './types';

const samples: GenUIBlock[] = [
  { type: 'kpis', items: [{ label: 'Gelir', value: '₺ 482.300', delta: 12, unit: '%' }] },
  {
    type: 'chart',
    title: 'Günlük gelir',
    bars: [
      { label: 'Pzt', value: 58 },
      { label: 'Sal', value: 61 },
    ],
  },
  {
    type: 'table',
    title: 'Siparişler',
    rowKey: 'id',
    columns: [
      { key: 'id', title: 'Sipariş' },
      { key: 'state', title: 'Durum' },
    ],
    rows: [{ id: '#10482', state: 'Kritik' }],
  },
  {
    type: 'confirm',
    id: 'c1',
    title: 'Bildirim gönderilsin mi?',
    confirmLabel: 'Gönder',
    cancelLabel: 'Vazgeç',
  },
  {
    type: 'form',
    id: 'f1',
    title: 'Stok uyarı kuralı',
    submitLabel: 'Kaydet',
    fields: [{ name: 'name', label: 'Kural adı', kind: 'text', value: 'Düşük stok' }],
  },
  { type: 'choices', items: ['Geçen ayla karşılaştır'] },
];

describe('GenUI kaydı', () => {
  it('altı blok türünü kayıtta tutar', () => {
    expect(Object.keys(GENUI_REGISTRY).sort()).toEqual(
      ['chart', 'choices', 'confirm', 'form', 'kpis', 'table'].sort(),
    );
  });

  it.each(samples)('$type bloğunu kendi bileşeniyle çizer', (block) => {
    const { container } = render(<GenUI blocks={[block]} onAction={vi.fn()} />);
    const node = container.querySelector(`[data-genui="${block.type}"]`);
    expect(node).not.toBeNull();
    expect(container.querySelector('[data-genui="json"]')).toBeNull();
  });

  it('bilinmeyen türü güvenli JSON görünümüne düşürür', () => {
    const blocks = parseBlocks([{ type: 'html', html: '<img src=x onerror=alert(1)>' }]);
    const { container } = render(<GenUI blocks={blocks} onAction={vi.fn()} />);
    const json = container.querySelector('[data-genui="json"]');
    expect(json).not.toBeNull();
    expect(json?.textContent).toContain('"type": "html"');
    expect(container.querySelector('img')).toBeNull();
  });

  it('alanları bozuk bilinen türü de JSON görünümüne düşürür', () => {
    const blocks = parseBlocks([{ type: 'kpis', items: 'bozuk' }]);
    const { container } = render(<GenUI blocks={blocks} onAction={vi.fn()} />);
    expect(container.querySelector('[data-genui="json"]')).not.toBeNull();
    expect(container.querySelector('[data-genui="kpis"]')).toBeNull();
  });

  it('dizi olmayan ui alanını tek JSON bloğuna çevirir', () => {
    expect(parseBlocks('metin')).toEqual([{ type: 'unknown', raw: 'metin' }]);
  });

  it('sınırı aşan büyük bloğu reddeder', () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({ id: String(i) }));
    const [block] = parseBlocks([
      { type: 'table', title: 'Büyük', rowKey: 'id', columns: [{ key: 'id', title: 'No' }], rows },
    ]);
    expect(block?.type).toBe('unknown');
  });
});

describe('Onay bloğu (U4)', () => {
  const confirm = samples[3] as GenUIBlock;

  it('kullanıcı onay vermeden olay göndermez', () => {
    const onAction = vi.fn();
    render(<GenUI blocks={[confirm]} onAction={onAction} />);
    expect(screen.getByRole('button', { name: 'Gönder' })).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();
  });

  it('onay düğmesine basınca bir kez olay gönderir ve kilitlenir', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<GenUI blocks={[confirm]} onAction={onAction} />);
    await user.click(screen.getByRole('button', { name: 'Gönder' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith({
      kind: 'confirm',
      blockId: 'c1',
      decision: 'approved',
      title: 'Bildirim gönderilsin mi?',
    });
    expect(screen.queryByRole('button', { name: 'Gönder' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Onayınız gönderildi');
  });

  it('vazgeçince işlem onayı göndermez', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<GenUI blocks={[confirm]} onAction={onAction} />);
    await user.click(screen.getByRole('button', { name: 'Vazgeç' }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ decision: 'rejected' }));
    expect(onAction).not.toHaveBeenCalledWith(expect.objectContaining({ decision: 'approved' }));
  });
});

describe('Form bloğu (U4)', () => {
  const form = samples[4] as GenUIBlock;

  it('değer değişse de kaydet düğmesine basılmadan olay göndermez', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<GenUI blocks={[form]} onAction={onAction} />);
    const input = screen.getByLabelText('Kural adı');
    await user.clear(input);
    await user.type(input, 'Yeni ad');
    expect(onAction).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(onAction).toHaveBeenCalledWith({
      kind: 'form',
      blockId: 'f1',
      decision: 'approved',
      title: 'Stok uyarı kuralı',
      values: { name: 'Yeni ad' },
    });
  });
});

describe('Seçenek bloğu', () => {
  it('seçilen öneriyi soru olarak gönderir', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const { container } = render(<GenUI blocks={[samples[5] as GenUIBlock]} onAction={onAction} />);
    const node = container.querySelector('[data-genui="choices"]') as HTMLElement;
    await user.click(within(node).getByText('Geçen ayla karşılaştır'));
    expect(onAction).toHaveBeenCalledWith({ kind: 'ask', text: 'Geçen ayla karşılaştır' });
  });
});
