import { CaretUpDown } from '@phosphor-icons/react';
import type { MenuProps } from 'antd';
import { Dropdown } from 'antd';
import type { KeyboardEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import { useFocusDim } from '../focus-dim';
import { t } from '../messages';
import { sampleWorkspaces } from '../sampleData';

interface WorkspaceSwitcherProps {
  rail: boolean;
}

type FocusTarget = 'first' | 'last';

/** Liste çizilene kadar beklenecek en çok kare sayısı. */
const MAX_FOCUS_FRAMES = 30;

const ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"])';

/**
 * Oklar, Home ve End odağı hemen taşır. Son öğeden sonra ilk öğeye dönülür.
 * antd menüsü odağı bir kare sonra ve koşullu taşır. Yavaş cihazda bu ok basışını yutabilir.
 * Bu yüzden bu tuşlar menüye ulaşmadan burada karşılanır. Enter ve Space menüde kalır.
 * Escape bileşenin içinde ayrıca karşılanır.
 */
function moveMenuFocus(event: KeyboardEvent<HTMLDivElement>) {
  const { key } = event;
  if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return;
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
  if (items.length === 0) return;
  const at = items.findIndex((item) => item === document.activeElement);
  const last = items.length - 1;
  const next =
    key === 'Home'
      ? 0
      : key === 'End'
        ? last
        : key === 'ArrowDown'
          ? at < 0 || at === last
            ? 0
            : at + 1
          : at <= 0
            ? last
            : at - 1;
  event.preventDefault();
  event.stopPropagation();
  items[next]?.focus();
}

/** Düğmede ya da gövdede basılan okun hedefi. Aşağı ok ilk öğeye, yukarı ok son öğeye gider. */
function arrowTarget(key: string): FocusTarget | null {
  return key === 'ArrowDown' ? 'first' : key === 'ArrowUp' ? 'last' : null;
}

/** Açık listenin ilk ya da son öğesine odak verir. Liste çizilmediyse `false` döner. */
function focusMenuItem(menuId: string, target: FocusTarget): boolean {
  const items = document.getElementById(menuId)?.querySelectorAll<HTMLElement>(ITEM_SELECTOR);
  const item = items && (target === 'first' ? items[0] : items[items.length - 1]);
  if (!item) return false;
  item.focus();
  return true;
}

/**
 * W1: tıklanınca "Açıklamalı" stilde liste açar. Odak perdesi uygulanır.
 * Klavye APG menü düğmesi kalıbına uyar (Ö8):
 * Enter, Space ve aşağı ok listeyi açar ve ilk öğeye gider. Yukarı ok son öğeye gider.
 * Oklar öğeler arasında gezer. Escape listeyi kapatır ve odağı düğmeye verir.
 * Tab ve Shift+Tab listeyi kapatır. Odak düğmeden sonraki ya da önceki öğeye geçer.
 * Liste fareyle açıldıysa aşağı ok ilk öğeye, yukarı ok son öğeye gider.
 */
export function WorkspaceSwitcher({ rail }: WorkspaceSwitcherProps) {
  const [current, setCurrent] = useState(sampleWorkspaces[0]?.id ?? '');
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<FocusTarget | null>(null);
  useFocusDim(open);

  // Liste klavyeyle açıldıysa çizilince odak istenen öğeye gider.
  useEffect(() => {
    if (!open || !pendingFocus.current) return undefined;
    const target = pendingFocus.current;
    let frames = 0;
    let handle = 0;
    const tryFocus = () => {
      if (focusMenuItem(menuId, target)) {
        pendingFocus.current = null;
        return;
      }
      frames += 1;
      if (frames < MAX_FOCUS_FRAMES) handle = requestAnimationFrame(tryFocus);
    };
    handle = requestAnimationFrame(tryFocus);
    return () => cancelAnimationFrame(handle);
  }, [open, menuId]);

  // Liste fareyle açıldıysa odak menüde değildir (K-1).
  // Chromium'da odak düğmededir. Bu durumu düğmenin kendi tuş işleyicisi karşılar.
  // WebKit tıklanan düğmeye odak vermez. Odak sayfa gövdesinde kalır. Bu dinleyici o durumu karşılar.
  // Tab ve Shift+Tab listeyi kapatır (inceleme 2, K-1). Olay pencereye ulaşmaz.
  // Böylece antd'nin pencere dinleyicisi Tab'ı engelleyemez. Tarayıcı odağı yine kendisi taşır.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const active = document.activeElement;
      if (active && active !== document.body) return;
      if (event.key === 'Tab') {
        event.stopPropagation();
        pendingFocus.current = null;
        setOpen(false);
        return;
      }
      const target = arrowTarget(event.key);
      if (!target) return;
      if (focusMenuItem(menuId, target)) event.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, menuId]);

  const ws = sampleWorkspaces.find((w) => w.id === current) ?? sampleWorkspaces[0];
  if (!ws) return null;

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (open) {
      // Liste fareyle açıldı ve odak düğmede kaldı. Oklar odağı hemen menüye taşır (K-1).
      // Enter ve Space burada karşılanmaz. Tıklama olarak listeyi kapatır.
      // Tab ve Shift+Tab listeyi kapatır. Tarayıcı odağı düğmeden sonraki ya da önceki öğeye taşır.
      // Olay antd'nin pencere dinleyicisine ulaşmaz. O dinleyici ilk Tab'ı engellerdi (inceleme 2, K-1).
      if (event.key === 'Tab') {
        event.stopPropagation();
        pendingFocus.current = null;
        setOpen(false);
        return;
      }
      const arrow = arrowTarget(event.key);
      if (arrow && focusMenuItem(menuId, arrow)) event.preventDefault();
      return;
    }
    const target: FocusTarget | null =
      event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown'
        ? 'first'
        : event.key === 'ArrowUp'
          ? 'last'
          : null;
    if (!target) return;
    // Tarayıcının tıklama olayı listeyi ikinci kez açıp kapatmasın.
    event.preventDefault();
    pendingFocus.current = target;
    setOpen(true);
  };

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
      onOpenChange={(next) => {
        if (!next) pendingFocus.current = null;
        setOpen(next);
      }}
      menu={{
        id: menuId,
        items,
        selectable: true,
        selectedKeys: [current],
        onClick: ({ key, domEvent }) => {
          setCurrent(key);
          // Klavyeyle seçilince odak düğmeye döner. Fareyle seçimde odak taşınmaz.
          // Aynı Enter tuşu odaktaki düğmeye tıklama olarak geçmesin; yoksa liste yeniden açılır.
          const byKeyboard = domEvent.type === 'keydown';
          if (byKeyboard) domEvent.preventDefault();
          close(byKeyboard);
        },
        'aria-label': t.workspace.menu,
      }}
      popupRender={(node) => (
        <div
          onKeyDownCapture={(event) => {
            // Escape listeyi kapatır ve odağı hemen düğmeye verir.
            if (event.key === 'Escape') {
              event.preventDefault();
              close(true);
              return;
            }
            // Tab ve Shift+Tab listeyi kapatır (Ö-1). Tarayıcının Tab davranışı engellenmez.
            // Odak önce düğmeye döner. Tarayıcı sonraki ya da önceki öğeyi düğmeden sayar.
            // antd açılır listesi pencereye bir Tab dinleyicisi bağlar. O dinleyici ilk Tab'da
            // odağı listeye geri çeker. Olay burada durdurulur. Böylece o dinleyiciye ulaşmaz.
            if (event.key === 'Tab') {
              event.stopPropagation();
              close(true);
              return;
            }
            moveMenuFocus(event);
          }}
        >
          {node}
        </div>
      )}
      overlayClassName="shell-dd shell-dd-described"
      // Liste kabuğun içinde açılır. Böylece kabuk değişkenlerini görür.
      getPopupContainer={(node) => node.closest<HTMLElement>('.shell') ?? document.body}
      placement="bottomLeft"
    >
      <button
        ref={buttonRef}
        type="button"
        className="shell-ws"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-raised={open ? 'true' : undefined}
        onKeyDown={onButtonKeyDown}
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
