import { Check } from '@phosphor-icons/react';
import { Button, Dropdown as AntDropdown, Input, Space } from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useId, useRef, useState } from 'react';
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
  const trigger = useRef<HTMLButtonElement>(null);
  const popupId = useId();

  function close() {
    setOpen(false);
    setQuery('');
  }

  useEffect(() => {
    if (!open) return;

    function dismiss(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
        trigger.current?.focus();
      }
    }

    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [open]);

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
      autoFocus
      trigger={['click']}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      menu={{
        id: popupId,
        items: menuItems,
        selectable: style === 'selectable',
        selectedKeys: selectedKey === undefined ? [] : [selectedKey],
        onClick: ({ key }) => {
          close();
          trigger.current?.focus();
          onSelect(key);
        },
      }}
      popupRender={(menu) =>
        style === 'searchable' ? (
          <div>
            <Input
              aria-label={searchLabel}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {menu}
          </div>
        ) : (
          menu
        )
      }
    >
      <Button
        ref={trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
      >
        {label}
      </Button>
    </AntDropdown>
  );
}
