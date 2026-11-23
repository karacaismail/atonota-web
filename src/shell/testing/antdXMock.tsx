/**
 * Birim testleri için `@ant-design/x` taklidi.
 *
 * Neden: Vitest bu paketi Node içinde yüklüyor. Paket `antd/es/version`
 * klasörünü içe aktarıyor ve Node ESM bunu reddediyor. Kalıcı çözüm
 * `vite.config.ts` içinde `test.server.deps.inline` ayarıdır. Ayar
 * `foundation` işine aittir. Gerçek paket tarayıcı testlerinde denenir.
 */
import type { ReactNode } from 'react';

export function XProvider({ children }: { children: ReactNode }) {
  return children;
}

interface SenderProps {
  value?: string;
  placeholder?: string;
  className?: string;
  onChange?: (v: string) => void;
  onSubmit?: (v: string) => void;
}

export function Sender({ value, placeholder, className, onChange, onSubmit }: SenderProps) {
  return (
    <div className={className}>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit?.(value ?? '');
          }
        }}
      />
    </div>
  );
}

interface PromptsProps {
  items?: { key: string; label?: ReactNode }[];
  onItemClick?: (info: { data: { key: string; label?: ReactNode } }) => void;
}

export function Prompts({ items = [], onItemClick }: PromptsProps) {
  return (
    <div>
      {items.map((it) => (
        <button key={it.key} type="button" onClick={() => onItemClick?.({ data: it })}>
          {it.label}
        </button>
      ))}
    </div>
  );
}
