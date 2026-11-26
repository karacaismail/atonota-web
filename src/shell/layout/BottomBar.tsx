import { List, MagnifyingGlass, Sparkle, Tray } from '@phosphor-icons/react';
import type { MouseEvent } from 'react';
import { forwardRef, useLayoutEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';

import { t } from '../messages';
import { routes } from '../paths';
import { LANDSCAPE_PHONE_QUERY } from './useMedia';
import { useVirtualKeyboard } from './useVirtualKeyboard';

interface BottomBarProps {
  /** Menü açık mı? Düğmeler `aria-expanded` değerini bundan alır. */
  open: boolean;
  /** Menüyü hangi düğme açtı? Yalnız o düğme `aria-expanded=true` olur. */
  opener: 'menu' | 'search' | null;
  onMenu: (event: MouseEvent<HTMLButtonElement>) => void;
  onSearch: (event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Telefon alt çubuğu. Dört düğme vardır: "Bekleyenler", "Ara", "Asistan" ve "Menü".
 * Yatay telefonda çubuk sol kenara geçer. Bu kararı CSS verir; React ağacı değişmez.
 * Sanal klavye açılınca çubuk gizlenir.
 */
export const BottomBar = forwardRef<HTMLElement, BottomBarProps>(function BottomBar(
  { open, opener, onMenu, onSearch },
  ref,
) {
  const keyboard = useVirtualKeyboard();
  const b = t.bottomBar;
  const own = useRef<HTMLElement | null>(null);
  // Çubuğun gerçek boyu ölçülür. İçerik bu pay kadar çubuktan uzak durur.
  // Büyütülmüş yazıda çubuk büyür; pay da büyür. Gizli çubuğun payı sıfırdır.
  useLayoutEffect(() => {
    const el = own.current;
    if (!el) return undefined;
    const root = document.documentElement;
    // Kabuğun üstünde başka bir not olabilir. Örnek: sahte sunucunun "Örnek veri" notu.
    // Yatay telefonda sol çubuk kabuğun üst kenarından başlar ve bu notu örtmez.
    const shell = el.parentElement;
    const measureTop = () => {
      const top = Math.max(0, shell?.getBoundingClientRect().top ?? 0);
      root.style.setProperty('--shell-bar-top', `${top}px`);
    };
    const measure = () => {
      const r = el.getBoundingClientRect();
      root.style.setProperty('--shell-bar-block', `${r.height}px`);
      root.style.setProperty('--shell-bar-inline', `${r.width}px`);
      measureTop();
    };
    // Kaydırma yalnız çubuğun üst kenarını değiştirir. Üst kenar yalnız yatay telefonda kullanılır.
    // Bu yüzden kaydırmada yalnız yatay telefonda ve yalnız bu değer ölçülür.
    const landscape = window.matchMedia(LANDSCAPE_PHONE_QUERY);
    const onScroll = () => {
      if (landscape.matches) measureTop();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (shell) observer.observe(shell);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      root.style.removeProperty('--shell-bar-block');
      root.style.removeProperty('--shell-bar-inline');
      root.style.removeProperty('--shell-bar-top');
    };
  }, []);
  const setRef = (el: HTMLElement | null) => {
    own.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };
  return (
    <nav
      ref={setRef}
      className="shell-bar"
      aria-label={b.label}
      data-keyboard={keyboard ? 'open' : undefined}
    >
      <NavLink to={routes.home()} end className="shell-bar-item" data-nav-link="">
        <Tray aria-hidden="true" />
        <span>{b.pending}</span>
      </NavLink>
      <button
        type="button"
        className="shell-bar-item"
        aria-haspopup="dialog"
        aria-controls="shell-drawer"
        aria-expanded={open && opener === 'search'}
        onClick={onSearch}
      >
        <MagnifyingGlass aria-hidden="true" />
        <span>{b.search}</span>
      </button>
      <NavLink to={routes.assistant()} className="shell-bar-item" data-nav-link="">
        <Sparkle aria-hidden="true" />
        <span>{b.assistant}</span>
      </NavLink>
      <button
        type="button"
        className="shell-bar-item"
        aria-haspopup="dialog"
        aria-controls="shell-drawer"
        aria-expanded={open && opener === 'menu'}
        onClick={onMenu}
      >
        <List aria-hidden="true" />
        <span>{b.menu}</span>
      </button>
    </nav>
  );
});
