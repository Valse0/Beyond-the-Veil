export type RunEventKind = 'elite-invasion' | 'spirit-storm' | 'treasure-hunt' | 'hunter-trial' | 'cursed-wave';
export type RunEventStatus = 'active' | 'completed' | 'failed';
export type RunEventAction = 'kill' | 'collect' | 'treasure';

export interface ActiveRunEvent {
  kind: RunEventKind;
  startedAtMs: number;
  deadlineAtMs: number;
  progress: number;
  stage: number;
  status: RunEventStatus;
}

export interface RunEventState {
  seed: number;
  selectedEvents: RunEventKind[];
  nextEventIndex: number;
  activeEvent: ActiveRunEvent | null;
  completedEvents: RunEventKind[];
  failedEvents: RunEventKind[];
}

export const RUN_EVENT_WINDOWS_MS = [210_000, 450_000, 690_000] as const;

const EVENT_KINDS: RunEventKind[] = [
  'elite-invasion',
  'spirit-storm',
  'treasure-hunt',
  'hunter-trial',
  'cursed-wave'
];

const EVENT_DURATIONS: Record<RunEventKind, number> = {
  'elite-invasion': 70_000,
  'spirit-storm': 55_000,
  'treasure-hunt': 40_000,
  'hunter-trial': 50_000,
  'cursed-wave': 75_000
};

export const RUN_EVENT_REWARDS: Record<RunEventKind, number> = {
  'elite-invasion': 100,
  'spirit-storm': 70,
  'treasure-hunt': 90,
  'hunter-trial': 110,
  'cursed-wave': 85
};

function randomStep(value: number): number {
  let x = value >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0;
}

export function createRunEventState(seed: number): RunEventState {
  const normalized = Number.isFinite(seed) ? (Math.trunc(seed) >>> 0) || 1 : 1;
  const pool = [...EVENT_KINDS];
  let cursor = normalized;
  for (let i = pool.length - 1; i > 0; i -= 1) {
    cursor = randomStep(cursor);
    const j = cursor % (i + 1);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return {
    seed: normalized,
    selectedEvents: pool.slice(0, 3),
    nextEventIndex: 0,
    activeEvent: null,
    completedEvents: [],
    failedEvents: []
  };
}

export function startDueRunEvent(state: RunEventState, elapsedMs: number): RunEventState {
  if (state.activeEvent?.status === 'active' || state.nextEventIndex >= RUN_EVENT_WINDOWS_MS.length) return state;
  const startAt = RUN_EVENT_WINDOWS_MS[state.nextEventIndex]!;
  if (!Number.isFinite(elapsedMs) || elapsedMs < startAt) return state;
  const kind = state.selectedEvents[state.nextEventIndex];
  if (!kind) return state;
  return {
    ...state,
    nextEventIndex: state.nextEventIndex + 1,
    activeEvent: {
      kind,
      startedAtMs: startAt,
      deadlineAtMs: startAt + EVENT_DURATIONS[kind],
      progress: 0,
      stage: 1,
      status: 'active'
    }
  };
}

export function advanceRunEvent(state: RunEventState, elapsedMs: number): RunEventState {
  const active = state.activeEvent;
  if (!active || active.status !== 'active' || elapsedMs < active.deadlineAtMs) return state;
  return {
    ...state,
    activeEvent: { ...active, status: 'failed' },
    failedEvents: [...state.failedEvents, active.kind]
  };
}

export function recordRunEventAction(
  state: RunEventState,
  action: RunEventAction,
  amount = 1
): RunEventState {
  const active = state.activeEvent;
  if (!active || active.status !== 'active' || !Number.isFinite(amount) || amount <= 0) return state;

  const targetAction: Record<RunEventKind, RunEventAction> = {
    'elite-invasion': 'kill',
    'spirit-storm': 'collect',
    'treasure-hunt': 'treasure',
    'hunter-trial': 'kill',
    'cursed-wave': 'kill'
  };
  if (targetAction[active.kind] !== action) return state;

  const target = active.kind === 'elite-invasion' ? 2
    : active.kind === 'spirit-storm' ? 4
    : active.kind === 'treasure-hunt' ? 1
    : active.kind === 'hunter-trial' ? 6
    : 3;
  const progress = active.progress + Math.floor(amount);

  if (active.kind === 'cursed-wave' && progress >= target) {
    if (active.stage >= 3) {
      return {
        ...state,
        activeEvent: { ...active, progress: target, status: 'completed' },
        completedEvents: [...state.completedEvents, active.kind]
      };
    }
    return { ...state, activeEvent: { ...active, progress: 0, stage: active.stage + 1 } };
  }

  const completed = progress >= target;
  return {
    ...state,
    activeEvent: { ...active, progress: completed ? target : progress, status: completed ? 'completed' : 'active' },
    completedEvents: completed ? [...state.completedEvents, active.kind] : state.completedEvents
  };
}

export function getRunEventReward(kind: RunEventKind): number {
  return RUN_EVENT_REWARDS[kind];
}

export function getRunEventObjective(event: ActiveRunEvent): string {
  switch (event.kind) {
    case 'elite-invasion': return `Elitleri yen: ${event.progress}/2`;
    case 'spirit-storm': return `Ruh parçası topla: ${event.progress}/4`;
    case 'treasure-hunt': return 'Sandığa ulaş';
    case 'hunter-trial': return `Düşmanları yen: ${event.progress}/6`;
    case 'cursed-wave': return `Lanetli dalga ${event.stage}/3 • ${event.progress}/3`;
  }
}

export function getRunEventName(kind: RunEventKind): string {
  const names: Record<RunEventKind, string> = {
    'elite-invasion': 'Elit İstilası',
    'spirit-storm': 'Ruh Fırtınası',
    'treasure-hunt': 'Hazine Avı',
    'hunter-trial': 'Avcı Sınavı',
    'cursed-wave': 'Lanetli Dalga'
  };
  return names[kind];
}
