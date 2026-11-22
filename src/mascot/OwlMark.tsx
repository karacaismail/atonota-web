import './mascot.css';

import type { CSSProperties } from 'react';

import { usePrefersReducedMotion } from '@/ai/motion';
import { aiMotion, mascotTokens, type MascotSize } from '@/ai/tokens';

/** Baş merkezli eğik yörünge. viewBox 64 birimdir. */
const ORBIT = 'M6 24a26 8.5 0 1 0 52 0a26 8.5 0 1 0 -52 0';

interface ParticleSpec {
  name: 'proton' | 'neutron' | 'electron';
  radius: number;
  /** Yörünge eğimi, derece. */
  tilt: number;
  /** Hangi yörünge süresi: 0 uzun, 1 kısa. */
  orbit: 0 | 1;
  /** Başlangıç gecikmesi, yörünge süresinin oranı. */
  phase: number;
  /** Hareket yokken yörünge üzerindeki duruş noktası. */
  still: { x: number; y: number };
}

const PARTICLES: ParticleSpec[] = [
  { name: 'proton', radius: 3, tilt: -24, orbit: 0, phase: 0, still: { x: 6, y: 24 } },
  { name: 'neutron', radius: 3, tilt: -24, orbit: 0, phase: 0.5, still: { x: 58, y: 24 } },
  { name: 'electron', radius: 2.2, tilt: 24, orbit: 1, phase: 0.25, still: { x: 32, y: 15.5 } },
];

export interface OwlMarkProps {
  size?: MascotSize;
  /** Verilirse ekran okuyucu baykuşu bu adla okur. */
  label?: string;
  className?: string;
}

/**
 * Baykuş + atom AI ikonu. Flat 2.0, gradyan yok.
 * Atom parçacıkları başın çevresindeki iki eğik yörüngede döner.
 * `prefers-reduced-motion` açıksa bütün hareket durur.
 */
export function OwlMark({ size = 28, label, className }: OwlMarkProps) {
  const reduced = usePrefersReducedMotion();
  const c = mascotTokens.colors;
  const style = {
    '--owl-dur-float': `${aiMotion.durations.owl}ms`,
    '--owl-ease': aiMotion.ease,
    '--owl-dur-blink': `${mascotTokens.blinkPeriod}ms`,
  } as CSSProperties;

  const classes = ['owl', reduced ? 'is-still' : '', className ?? ''].filter(Boolean).join(' ');

  return (
    <svg
      className={classes}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      focusable="false"
    >
      <ellipse cx={32} cy={60.5} rx={13} ry={2.4} fill={c.outline} opacity={0.12} />
      <g className="owl-orbit" fill="none" strokeWidth={1.2}>
        <ellipse cx={32} cy={24} rx={26} ry={8.5} transform="rotate(-24 32 24)" />
        <ellipse cx={32} cy={24} rx={26} ry={8.5} transform="rotate(24 32 24)" />
      </g>
      <path d="M16 20l-2.5-10 9.5 6z" fill={c.tuft} />
      <path d="M48 20l2.5-10-9.5 6z" fill={c.tuft} />
      <path
        d="M13 35c0-12 8.5-21 19-21s19 9 19 21v7c0 10.5-8.5 17-19 17s-19-6.5-19-17z"
        fill={c.body}
      />
      <path d="M32 14c10.5 0 19 9 19 21v7c0 10.5-8.5 17-19 17z" fill={c.shade} />
      <ellipse cx={32} cy={47} rx={10.5} ry={9.5} fill={c.belly} />
      <path
        d="M27 44q2.5 2 5 0q2.5 2 5 0M28.5 49q2 1.8 3.5 0q1.5 1.8 3.5 0"
        fill="none"
        stroke={c.feather}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <circle cx={24} cy={29} r={8.6} fill={c.face} />
      <circle cx={40} cy={29} r={8.6} fill={c.face} />
      <g className="owl-eyes">
        <circle cx={24.6} cy={29.6} r={4.6} fill={c.eye} />
        <circle cx={39.4} cy={29.6} r={4.6} fill={c.eye} />
        <circle cx={26.2} cy={27.9} r={1.5} fill={c.face} />
        <circle cx={41} cy={27.9} r={1.5} fill={c.face} />
      </g>
      <path d="M28.6 33.4h6.8l-3.4 4.8z" fill={c.beak} />
      <path d="M32 33.4h3.4l-3.4 4.8z" fill={c.beakShade} />
      <ellipse cx={27.5} cy={58.6} rx={2.8} ry={1.5} fill={c.beak} />
      <ellipse cx={36.5} cy={58.6} rx={2.8} ry={1.5} fill={c.beak} />
      {PARTICLES.map((p) => {
        const duration = mascotTokens.orbitDurations[p.orbit];
        return (
          <g key={p.name} transform={`rotate(${p.tilt} 32 24)`}>
            <circle
              data-particle={p.name}
              r={p.radius}
              fill={c[p.name]}
              stroke={c.outline}
              strokeOpacity={0.18}
              strokeWidth={0.6}
              {...(reduced ? { cx: p.still.x, cy: p.still.y } : {})}
            >
              {!reduced && (
                <animateMotion
                  dur={`${duration}ms`}
                  begin={`${-Math.round(duration * p.phase)}ms`}
                  repeatCount="indefinite"
                  path={ORBIT}
                />
              )}
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
