import type { SourceItem } from '../types';

function isExternal(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Kaynak listesi. Kaynak kartı ve değişiklik incelemesi bunu kullanır.
 * Liste boşsa "Kaynak yok." yazar. Güven yüzdesi gösterilmez.
 * Dış bağlantı yeni sekmede açılır ve yönlendiren bilgisi gitmez.
 */
export function SourceList({ items }: { items: SourceItem[] }) {
  if (items.length === 0) return <p className="genui-source-empty">Kaynak yok.</p>;
  return (
    <ul className="genui-source-list">
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`}>
          {item.url ? (
            <a
              className="genui-source-link"
              href={item.url}
              {...(isExternal(item.url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {item.title}
              {isExternal(item.url) && <span className="genui-sr"> (yeni sekmede açılır)</span>}
            </a>
          ) : (
            <span className="genui-source-text">{item.title}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
