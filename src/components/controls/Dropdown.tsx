import { Check } from '@phosphor-icons/react';
import { Button, Dropdown as AntDropdown, Input, Space } from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type DropdownStyle = 'classic' | 'shortcut' | 'described' | 'selectable' | 'searchable';

export interface DropdownItem {
  key: string;
  label: string;
  icon?: ReactNode;
  description?: string;
  shortcut?: string;
  group?: string;
  danger?: boolean;
  disabled?: boolean;
}

export interface DropdownProps {
  label: string;
  items: readonly DropdownItem[];
  style?: DropdownStyle;
  selectedKey?: string;
  searchLabel?: string;
  onSelect: (key: string) => void;
}

type MenuItems = NonNullable<MenuProps['items']>;

export function Dropdown({
  label,
  items,
  style = 'classic',
  selectedKey,
  searchLabel = 'Menüde ara',
  onSelect,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerId = useId();
  const popupId = useId();
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const popup = document.getElementById(`${popupId}-surface`);
      popup
        ?.querySelector<HTMLElement>(
          style === 'searchable' ? 'input' : '[role="menuitem"]:not([aria-disabled="true"])',
        )
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, popupId, style]);

  useLayoutEffect(() => {
    if (!open && restoreFocus.current) {
      restoreFocus.current = false;
      const frame = requestAnimationFrame(() => document.getElementById(triggerId)?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [open, triggerId]);

  function close() {
    setOpen(false);
    setQuery('');
  }

  useEffect(() => {
    if (!open) return;

    function dismiss(event: KeyboardEvent) {
      const target = event.target;
      const popup = document.getElementById(`${popupId}-surface`);
      const insideDropdown =
        target instanceof Node &&
        (document.getElementById(triggerId)?.contains(target) || popup?.contains(target));
      if (event.key === 'Escape' && insideDropdown) {
        event.preventDefault();
        event.stopPropagation();
        restoreFocus.current = true;
        setOpen(false);
        setQuery('');
        const frame = requestAnimationFrame(() => document.getElementById(triggerId)?.focus());
        return () => cancelAnimationFrame(frame);
      }
    }

    window.addEventListener('keydown', dismiss, true);
    return () => window.removeEventListener('keydown', dismiss, true);
  }, [open, popupId, triggerId]);

  const visibleItems = items.filter((item) =>
    item.label.toLocaleLowerCase('tr').includes(query.trim().toLocaleLowerCase('tr')),
  );
  const regularItems = visibleItems.filter((item) => !item.danger);
  const dangerItems = visibleItems.filter((item) => item.danger);

  function buildItem(item: DropdownItem): MenuItems[number] {
    return {
      key: item.key,
      disabled: item.disabled ?? false,
      icon: item.icon,
      danger: item.danger ?? false,
      label: (
        <Space direction={style === 'described' ? 'vertical' : 'horizontal'} size={0}>
          <span>{item.label}</span>
          {style === 'described' && item.description && <small>{item.description}</small>}
          {style === 'shortcut' && item.shortcut && <kbd>{item.shortcut}</kbd>}
          {style === 'selectable' && selectedKey === item.key && <Check aria-hidden />}
        </Space>
      ),
    };
  }

  const menuItems: MenuItems = [];
  if (style === 'shortcut') {
    const grouped = new Map<string | undefined, DropdownItem[]>();
    for (const item of regularItems) {
      const group = grouped.get(item.group) ?? [];
      group.push(item);
      grouped.set(item.group, group);
    }
    for (const [group, entries] of grouped) {
      if (group && menuItems.length > 0) menuItems.push({ type: 'divider' });
      if (group) menuItems.push({ type: 'group', label: group, children: entries.map(buildItem) });
      else menuItems.push(...entries.map(buildItem));
    }
  } else {
    menuItems.push(...regularItems.map(buildItem));
  }
  if (regularItems.length > 0 && dangerItems.length > 0) menuItems.push({ type: 'divider' });
  menuItems.push(...dangerItems.map(buildItem));

  return (
    <AntDropdown
      open={open}

      trigger={['click']}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      menu={{
        id: popupId,
        items: menuItems,
        selectable: style === 'selectable',
        selectedKeys: selectedKey === undefined ? [] : [selectedKey],
        onClick: ({ key }) => {
          restoreFocus.current = true;
          close();
          onSelect(key);
        },
      }}
      popupRender={(menu) => (
        <div id={`${popupId}-surface`}>
          {style === 'searchable' && (
            <Input
              aria-label={searchLabel}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          )}
          {menu}
        </div>
      )}
    >
      <Button
        id={triggerId}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
      >
        {label}
      </Button>
    </AntDropdown>
  );
}
