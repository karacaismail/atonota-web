import type { RiskLevel } from '../types';

/**
 * Badge tone of each risk level. Colour never carries meaning alone: the level is always written as text too.
 * The texts live in `../strings.ts`. The server sends only the code.
 */
export const RISK_TONE: Record<RiskLevel, 'info' | 'warn' | 'danger'> = {
  R0: 'info',
  R1: 'info',
  R2: 'warn',
  R3: 'danger',
};
