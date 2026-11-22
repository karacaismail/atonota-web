/**
 * Odak perdesi (D1–D5) için kabuk bağlantısı.
 *
 * GEÇİCİ: `foundation` işinin `src/engines/focus-dim/` motoru henüz `main`
 * dalında yok. Bu dosya aynı kararı kabuk içinde uygular. Motor gelince
 * `useFocusDim` yalnız o motoru çağıracak. Bileşenler bu kancayı kullanır,
 * bu yüzden geçişte bileşen değişmez.
 */
import { theme } from 'antd';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { hexToRgba, shellTokens } from '../tokens';
import { FocusDimContext as Ctx } from './context';
import { isDarkColor } from './isDarkColor';

export function FocusDimProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const { token } = theme.useToken();
  const dark = isDarkColor(token.colorBgLayout);

  const acquire = useCallback(() => {
    setCount((c) => c + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setCount((c) => c - 1);
    };
  }, []);

  const on = count > 0;

  useEffect(() => {
    const body = document.body;
    if (on) {
      body.setAttribute('data-focus-dim', 'on');
    } else {
      body.removeAttribute('data-focus-dim');
    }
    return () => body.removeAttribute('data-focus-dim');
  }, [on]);

  const api = useMemo(() => ({ acquire }), [acquire]);
  const tone = dark ? shellTokens.focusDim.dark : shellTokens.focusDim.light;

  return (
    <Ctx.Provider value={api}>
      {children}
      {createPortal(
        <div
          className="shell-dim"
          aria-hidden="true"
          data-on={on ? 'true' : 'false'}
          style={
            {
              '--shell-dim-bg': hexToRgba(tone.color, tone.opacity),
              '--shell-dim-dur': `${shellTokens.focusDim.duration}ms`,
              '--shell-dim-ease': shellTokens.focusDim.easing,
              '--shell-dim-blur': `${shellTokens.focusDim.blur}px`,
            } as React.CSSProperties
          }
        />,
        document.body,
      )}
    </Ctx.Provider>
  );
}
