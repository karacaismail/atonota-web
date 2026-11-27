import { useId } from 'react';

import { useLanguageChoice, type LocaleTag, type SaveLanguage } from '@/app/locale';
import { Select } from '@/components/controls';

interface LanguageSelectProps {
  /** Writes the choice to the user profile. */
  save: SaveLanguage;
}

/**
 * Language switch (AJA-1772). A branded antd list; the native `<select>` is not used.
 * Each option shows its name in its own language and carries its own `lang` value (WCAG 3.1.2).
 * The screen changes only after the profile save succeeds. The page is not reloaded,
 * so the address, forms, filters and drafts stay. If the save is refused, the old language
 * stays and the reason appears under the list.
 */
export function LanguageSelect({ save }: LanguageSelectProps) {
  const id = useId();
  const { locale, pending, error, options, text, choose } = useLanguageChoice(save);
  return (
    <div className="shell-lang">
      <label htmlFor={id} className="shell-lang-label">
        {text.label}
      </label>
      <Select<LocaleTag>
        id={id}
        value={pending ?? locale}
        onChange={choose}
        disabled={pending !== undefined}
        loading={pending !== undefined}
        options={options.map(({ tag, name }) => ({
          value: tag,
          label: <span lang={tag}>{name}</span>,
        }))}
      />
      <span className="shell-vh" role="status">
        {pending === undefined ? '' : text.saving}
      </span>
      {error === undefined ? null : (
        <p role="alert" className="shell-lang-error">
          {error}
        </p>
      )}
    </div>
  );
}
