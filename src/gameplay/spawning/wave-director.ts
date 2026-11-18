export type WaveBand = 'opening' | 'rising' | 'elite' | 'onslaught' | 'boss';

export interface WaveDirectorState {
  seed: number;
  spawnIndex: number;
  nextSpawnAtMs: number;
  nextEliteAtMs: number;
  eliteIndex: number;
}

export interface WaveSpawnPlan {
  state: WaveDirectorState;
  band: WaveBand;
  intervalMs: number;
  spawnCount: number;
  enemyIndices: number[];
  eliteDue: boolean;
}

const BOSS_START_MS = 14 * 60 * 1000;

export function createWaveDirector(seed: number): WaveDirectorState {
  const normalized = Number.isFinite(seed) ? (Math.trunc(seed) >>> 0) : 1;
  return {
    seed: normalized === 0 ? 1 : normalized,
    spawnIndex: 0,
    nextSpawnAtMs: 0,
    nextEliteAtMs: 7 * 60 * 1000,
    eliteIndex: 0
  };
}

/** Stable, purpose-separated pseudo-random value in [0, 1). */
export function waveRandom(seed: number, index: number, salt = 0): number {
  let value = (seed >>> 0)
    ^ Math.imul((Math.trunc(index) + 1) >>> 0, 0x9e3779b1)
    ^ Math.imul((Math.trunc(salt) + 1) >>> 0, 0x85ebca6b);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 0x100000000;
}

export function getWaveBand(elapsedMs: number): WaveBand {
  if (elapsedMs >= BOSS_START_MS) return 'boss';
  if (elapsedMs >= 11 * 60 * 1000) return 'onslaught';
  if (elapsedMs >= 7 * 60 * 1000) return 'elite';
  if (elapsedMs >= 3 * 60 * 1000) return 'rising';
  return 'opening';
}

function intervalForBand(band: WaveBand): number {
  switch (band) {
    case 'opening': return 1500;
    case 'rising': return 1100;
    case 'elite': return 820;
    case 'onslaught': return 620;
    case 'boss': return Number.POSITIVE_INFINITY;
  }
}

/**
 * Advances a deterministic spawn schedule. An elite is queued while another elite is alive,
 * and a full arena never consumes a spawn or elite slot.
 */
export function stepWaveDirector(
  state: WaveDirectorState,
  elapsedMs: number,
  activeEnemyCount: number,
  activeEliteCount: number,
  maxActive = 42,
  enemyPoolSize = 5
): WaveSpawnPlan {
  const elapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const band = getWaveBand(elapsed);
  const intervalMs = intervalForBand(band);
  const emptyPlan = (nextState: WaveDirectorState = state): WaveSpawnPlan => ({
    state: nextState,
    band,
    intervalMs,
    spawnCount: 0,
    enemyIndices: [],
    eliteDue: false
  });

  if (band === 'boss' || enemyPoolSize <= 0) return emptyPlan();
  const slots = Math.max(0, Math.floor(maxActive) - Math.max(0, Math.floor(activeEnemyCount)));
  if (slots === 0 || elapsed < state.nextSpawnAtMs) return emptyPlan();

  const roll = waveRandom(state.seed, state.spawnIndex, 3);
  const desiredCount = band === 'opening' ? 1
    : band === 'rising' ? 1 + (roll < 0.35 ? 1 : 0)
    : band === 'elite' ? 2 + (roll < 0.25 ? 1 : 0)
    : 2 + (roll < 0.45 ? 1 : 0);
  const spawnCount = Math.min(slots, desiredCount);
  const eliteDue = elapsed >= state.nextEliteAtMs && activeEliteCount <= 0 && spawnCount > 0;
  const enemyIndices = Array.from({ length: spawnCount }, (_, offset) =>
    Math.floor(waveRandom(state.seed, state.spawnIndex + offset, 11) * enemyPoolSize)
  );

  return {
    state: {
      ...state,
      spawnIndex: state.spawnIndex + spawnCount,
      nextSpawnAtMs: elapsed + intervalMs,
      nextEliteAtMs: eliteDue ? elapsed + 2 * 60 * 1000 : state.nextEliteAtMs,
      eliteIndex: state.eliteIndex + (eliteDue ? 1 : 0)
    },
    band,
    intervalMs,
    spawnCount,
    enemyIndices,
    eliteDue
  };
}
