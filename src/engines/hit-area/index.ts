export {
  box,
  computeHitAreas,
  idealExtension,
  limitByNeighbour,
  round2,
  type Box,
  type ComputeOptions,
  type Extension,
  type HitResult,
  type HitTarget,
  type Obstacle,
} from './compute';
export {
  HIT_CLASS,
  HIT_DISABLED_SELECTOR,
  HIT_OBSTACLE_SELECTOR,
  HIT_SUFFIX_CLASS,
  HIT_TARGET_SELECTOR,
  HIT_UPDATE_EVENT,
  applyResult,
  clearElement,
  collectTargets,
  computeOnce,
  startHitAreaEngine,
  type HitAreaEngine,
  type HitAreaEngineOptions,
} from './engine';
export { HitSuffix } from './HitSuffix';
