import { parseAgentEvent } from './events';
import type { AgentStep } from './types';

/**
 * Altı adımlı akış (AJA-880 taslağı, 3. sürüm).
 * Adımlar yalnız ileri gider. Ekran bu durumu okur, kendisi adım üretmez.
 */
export const FLOW_STEPS = ['intent', 'plan', 'preview', 'approval', 'apply', 'undo'] as const;
export type FlowStep = (typeof FLOW_STEPS)[number];

export const STEP_LABELS: Record<FlowStep, string> = {
  intent: 'Niyet',
  plan: 'Plan',
  preview: 'Önizleme',
  approval: 'Onay',
  apply: 'Uygulama',
  undo: 'Geri alma önerisi',
};

/** Kipler. Yalnız `act` ("İşlem yap") kipi değişiklik yapabilir. */
export const AGENT_MODES = ['ask', 'search', 'draft', 'act'] as const;
export type AgentMode = (typeof AGENT_MODES)[number];

export const MODE_LABELS: Record<AgentMode, string> = {
  ask: 'Sor',
  search: 'Ara',
  draft: 'Taslak hazırla',
  act: 'İşlem yap',
};

export interface FlowState {
  mode: AgentMode;
  step: FlowStep;
  /** Yalnız sunucu olaylarından kurulur. Aynı anahtar bir kez yer alır. */
  tools: AgentStep[];
  /** Kullanıcı onayı. Yalnız `approval` adımında verilir. */
  approved: boolean;
  /** Arka ucun bildirdiği geri alma ucu. Yoksa geri alma adımı açılmaz. */
  undoEndpoint?: string;
}

/**
 * Akışı ilgilendiren sunucu olayları.
 * Nesneler izinli alanlardan yeniden kurulur. Güven yüzdesi ve iç düşünce taşınmaz.
 */
export type FlowEvent =
  | {
      type: 'tool';
      key: string;
      tool: AgentStep['tool'];
      title: string;
      status: AgentStep['status'];
    }
  | { type: 'step'; step: FlowStep }
  | { type: 'undo'; endpoint: string };

const ACT_ONLY: ReadonlySet<FlowStep> = new Set(['approval', 'apply', 'undo']);

function isObj(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFlowStep(value: unknown): value is FlowStep {
  return typeof value === 'string' && (FLOW_STEPS as readonly string[]).includes(value);
}

/** Geri alma ucu kendi arka ucumuzdaki göreli yoldur. Başka siteye giden adres kabul edilmez. */
function isUndoEndpoint(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 500 &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\')
  );
}

/**
 * Tek bir SSE `data` satırını doğrular.
 * Yalnız metin satırı okunur. Geçersiz ya da tanınmayan olay `null` döner.
 */
export function parseFlowEvent(data: unknown): FlowEvent | null {
  if (typeof data !== 'string') return null;
  let raw: unknown;
  try {
    raw = JSON.parse(data);
  } catch {
    return null;
  }
  if (!isObj(raw)) return null;
  switch (raw['type']) {
    case 'tool': {
      const event = parseAgentEvent(data);
      if (event?.type !== 'tool') return null;
      return {
        type: 'tool',
        key: event.key,
        tool: event.tool,
        title: event.title,
        status: event.status,
      };
    }
    case 'step':
      return isFlowStep(raw['step']) ? { type: 'step', step: raw['step'] } : null;
    case 'undo':
      return isUndoEndpoint(raw['endpoint']) ? { type: 'undo', endpoint: raw['endpoint'] } : null;
    default:
      return null;
  }
}

export function createFlow(mode: AgentMode = 'ask'): FlowState {
  return { mode, step: 'intent', tools: [], approved: false };
}

/** Kip yalnız niyet adımında değişir. */
export function setFlowMode(state: FlowState, mode: AgentMode): FlowState {
  if (state.step !== 'intent' || state.mode === mode) return state;
  if (!(AGENT_MODES as readonly string[]).includes(mode)) return state;
  return { ...state, mode };
}

/** Kullanıcı onayı. Yalnız "İşlem yap" kipinde ve onay adımında geçerlidir. */
export function approveFlow(state: FlowState): FlowState {
  if (state.mode !== 'act' || state.step !== 'approval' || state.approved) return state;
  return { ...state, approved: true };
}

function canEnter(state: FlowState, target: FlowStep): boolean {
  if (FLOW_STEPS.indexOf(target) <= FLOW_STEPS.indexOf(state.step)) return false;
  if (ACT_ONLY.has(target) && state.mode !== 'act') return false;
  // Onay adımı önizlemesiz açılmaz. Uygulama onaysız açılmaz.
  if (target === 'approval') return state.step === 'preview';
  if (target === 'apply') return state.step === 'approval' && state.approved;
  // Geri alma adımını yalnız `undo` olayı açar. Uç bilinmeden açılmaz.
  if (target === 'undo') return false;
  return true;
}

function upsertTool(tools: AgentStep[], event: Extract<FlowEvent, { type: 'tool' }>): AgentStep[] {
  const next: AgentStep = {
    key: event.key,
    tool: event.tool,
    title: event.title,
    status: event.status,
  };
  const old = tools.find((t) => t.key === next.key);
  if (!old) return [...tools, next];
  if (old.tool === next.tool && old.title === next.title && old.status === next.status) {
    return tools;
  }
  return tools.map((t) => (t === old ? next : t));
}

/**
 * Sunucudan gelen tek bir satırı akışa uygular.
 * Araç olayı listeye yalnız buradan girer. İstemci araç olayı üretmez.
 */
export function receiveServerEvent(state: FlowState, data: string): FlowState {
  const event = parseFlowEvent(data);
  if (!event) return state;
  switch (event.type) {
    case 'tool': {
      const tools = upsertTool(state.tools, event);
      return tools === state.tools ? state : { ...state, tools };
    }
    case 'step':
      return canEnter(state, event.step) ? { ...state, step: event.step } : state;
    case 'undo':
      if (state.mode !== 'act' || state.step !== 'apply') return state;
      return { ...state, step: 'undo', undoEndpoint: event.endpoint };
  }
}
