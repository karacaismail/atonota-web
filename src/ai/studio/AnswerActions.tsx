import { Actions } from '@ant-design/x';
import type { ActionsProps } from '@ant-design/x';
import type { KeyboardEvent } from 'react';
import { useLayoutEffect, useRef } from 'react';

type Item = ActionsProps['items'][number] & { label: string; pressed?: boolean };

/**
 * Ant Design X `Actions` bileşeninin erişilebilir sarmalayıcısı (U6).
 *
 * `@ant-design/x` 1.6.1 sürümünde öğeler yalnız tıklanan `div` olarak çizilir.
 * Rolleri, adları ve sekme sırası yoktur. Klavyeyle çalışmazlar.
 * Bu sarmalayıcı her öğeye düğme rolü, ad ve sekme sırası verir.
 * Enter ve Space tuşları da öğeyi çalıştırır.
 */
export function AnswerActions({
  items,
  onClick,
}: {
  items: Item[];
  onClick: (key: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const nodes = ref.current?.querySelectorAll<HTMLElement>('.ant-actions-list-item');
    nodes?.forEach((node, index) => {
      const item = items[index];
      if (!item) return;
      node.setAttribute('role', 'button');
      node.setAttribute('tabindex', '0');
      node.setAttribute('aria-label', item.label);
      if (item.pressed === undefined) node.removeAttribute('aria-pressed');
      else node.setAttribute('aria-pressed', String(item.pressed));
    });
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('ant-actions-list-item')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      target.click();
    }
  };

  return (
    <div ref={ref} onKeyDown={onKeyDown} className="ai-actions">
      <Actions
        items={items.map(({ pressed: _pressed, ...item }) => item)}
        onClick={({ key }) => onClick(key)}
      />
    </div>
  );
}
