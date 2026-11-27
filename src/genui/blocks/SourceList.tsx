import { useGenuiStrings } from '../useGenuiStrings';
import type { SourceItem } from '../types';

function isExternal(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Source list. Used by the source card and the change review.
 * If the list is empty it shows "No sources." No confidence percentage is shown.
 * External links open in a new tab and send no referrer.
 */
export function SourceList({ items }: { items: SourceItem[] }) {
  const text = useGenuiStrings();
  if (items.length === 0) return <p className="genui-source-empty">{text.noSources}</p>;
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
              {isExternal(item.url) && <span className="genui-sr"> {text.newTab}</span>}
            </a>
          ) : (
            <span className="genui-source-text">{item.title}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
