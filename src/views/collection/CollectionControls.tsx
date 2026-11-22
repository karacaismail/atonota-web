import { CaretDown, Check } from '@phosphor-icons/react';
import { Button, Input, Select } from 'antd';
import type { ButtonProps, InputProps, InputRef, SelectProps } from 'antd';
import type { BaseSelectRef } from 'rc-select';
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

function subscribeMotion(callback: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
function getReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Public antd APIs only. Shared foundation engines own hit geometry and focus mode. */
export function CollectionButton(props: ButtonProps) {
  return <Button {...props} className="collection-button collection-hit" />;
}
export function CollectionInput(props: InputProps) {
  const input = useRef<InputRef>(null);
  return (
    <Input
      {...props}
      ref={input}
      className="collection-input collection-hit"
      classNames={{ input: 'collection-input-field', suffix: 'collection-input-suffix' }}
      suffix={<span aria-hidden />}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          input.current?.focus();
        }
      }}
    />
  );
}
export function CollectionSelect<Value extends string | number>(props: SelectProps<Value>) {
  const select = useRef<BaseSelectRef>(null);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    // Touch can move the popup beneath the pointer between down and click.
    // Focus on opening, independent of where that click ultimately lands.
    if (open && !props.disabled) select.current?.focus();
  }, [open, props.disabled]);
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, () => false);
  return (
    <Select<Value>
      {...props}
      ref={select}
      open={open}
      onOpenChange={setOpen}
      classNames={{ root: 'collection-select collection-hit', popup: { root: 'collection-popup' } }}
      styles={{ popup: { root: { boxShadow: 'var(--shadow-dropdown)', padding: 0 } } }}
      suffixIcon={<CaretDown weight="regular" aria-hidden />}
      menuItemSelectedIcon={<Check weight="regular" aria-hidden />}
      dropdownAlign={{ offset: [0, 0] }}
      virtual={false}
      getPopupContainer={(trigger) =>
        (trigger.closest('.collection') as HTMLElement | null) ?? trigger
      }
      transitionName={reducedMotion ? '' : 'collection-dropdown'}
      onMouseDown={(event) => {
        // The expanded ring targets the root. Use the public ref and controlled state.
        if (event.target === event.currentTarget && !props.disabled) {
          event.preventDefault();
          select.current?.focus();
          setOpen((value) => !value);
        }
      }}
    />
  );
}
