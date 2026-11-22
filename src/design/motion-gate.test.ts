import { describe, expect, it } from 'vitest';

import { findMotionViolations, isMotionExempt } from '../../scripts/motion-gate.mjs';

describe('hareket kapısı', () => {
  it('src/design dışındaki sabit süreyi yakalar', () => {
    expect(findMotionViolations('.a { transition: opacity 200ms ease; }', 'src/shell/a.css')).toHaveLength(1);
    expect(findMotionViolations('.a { animation-duration: 0.3s; }', 'src/shell/a.css')).toHaveLength(1);
    expect(findMotionViolations("style={{ transitionDuration: '150ms' }}", 'src/shell/A.tsx')).toHaveLength(1);
  });

  it('src/design dışındaki cubic-bezier eğrisini yakalar', () => {
    expect(findMotionViolations('transition-timing-function: cubic-bezier(.2,.9,.3,1.15);', 'src/shell/a.css')).toHaveLength(1);
    expect(findMotionViolations('steps(4, end)', 'src/shell/a.css')).toHaveLength(1);
  });

  it('token kullanan satırı geçirir', () => {
    const css = '.a { transition: opacity var(--motion-duration-mid) var(--motion-easing-standard); }';
    expect(findMotionViolations(css, 'src/shell/a.css')).toHaveLength(0);
    expect(findMotionViolations('const n = setTimeout(fn, 300);', 'src/shell/a.ts')).toHaveLength(0);
  });

  it('src/design, testler ve kaynak dosyalar muaftır', () => {
    expect(isMotionExempt('src/design/motion.ts')).toBe(true);
    expect(isMotionExempt('src/shell/x.test.tsx')).toBe(true);
    expect(isMotionExempt('tests/e2e/foundation.spec.ts')).toBe(true);
    expect(isMotionExempt('design/source/control-size-engine.html')).toBe(true);
    expect(isMotionExempt('src/shell/x.tsx')).toBe(false);
  });

  it('ihlal satır numarası ve nedeni ile döner', () => {
    const [v] = findMotionViolations('a\nb\n.c { transition: all 1s; }', 'src/shell/a.css');
    expect(v?.line).toBe(3);
    expect(v?.reason).toContain('süre');
  });
});
