import { CaretUpDown } from '@phosphor-icons/react';
import type { MenuProps } from 'antd';
import { Dropdown } from 'antd';
import { useState } from 'react';

import { useFocusDim } from '../focus-dim';
import { t } from '../messages';
import { sampleWorkspaces } from '../sampleData';

interface WorkspaceSwitcherProps {
  rail: boolean;
}

/** W1: tıklanınca "Açıklamalı" stilde liste açar. Odak perdesi uygulanır. */
export function WorkspaceSwitcher({ rail }: WorkspaceSwitcherProps) {
  const [current, setCurrent] = useState(sampleWorkspaces[0]?.id ?? '');
  const [open, setOpen] = useState(false);
  useFocusDim(open);
  const ws = sampleWorkspaces.find((w) => w.id === current) ?? sampleWorkspaces[0];
  if (!ws) return null;

  const items: MenuProps['items'] = sampleWorkspaces.map((w) => ({
    key: w.id,
    label: (
      <span className="shell-dd-desc">
        <span className="shell-dd-box" aria-hidden="true">
          {w.name.slice(-1)}
        </span>
        <span className="shell-dd-t">
          <span>{w.name}</span>
          <small>{w.note}</small>
        </span>
      </span>
    ),
  }));

  return (
    <Dropdown
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      menu={{
        items,
        selectable: true,
        selectedKeys: [current],
        onClick: ({ key }) => {
          setCurrent(key);
          setOpen(false);
        },
        'aria-label': t.workspace.menu,
      }}
      overlayClassName="shell-dd shell-dd-described"
      placement="bottomLeft"
    >
      <button
        type="button"
        className="shell-ws"
        data-raised={open ? 'true' : undefined}
        {...(rail ? { 'aria-label': t.workspace.label(ws.name) } : {})}
      >
        <span className="shell-logo" aria-hidden="true">
          A
        </span>
        {!rail && (
          <>
            <span className="shell-ws-t">
              <span className="shell-vh">{t.workspace.prefix}</span>
              <b>{ws.name}</b>
              <small>{ws.note}</small>
            </span>
            <span className="shell-ws-i" aria-hidden="true">
              <CaretUpDown />
            </span>
          </>
        )}
      </button>
    </Dropdown>
  );
}
