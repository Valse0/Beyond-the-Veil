import type { RunState, UpgradeId } from '../../core/types/game.js';

export function createRunState(): RunState {
  return { level: 1, experience: 0, experienceToNext: 10, health: 100, maxHealth: 100,
    damage: 18, attackIntervalMs: 720, magnetRadius: 112, moveSpeed: 225, kills: 0, elapsedMs: 0 };
}
export function gainExperience(state: RunState, amount: number): { state: RunState; levelsGained: number } {
  let next = { ...state, experience: state.experience + Math.max(0, amount) };
  let levelsGained = 0;
  while (next.experience >= next.experienceToNext) {
    next.experience -= next.experienceToNext;
    next.level += 1;
    next.experienceToNext = Math.floor(10 + next.level * 5 + next.level * next.level * 0.55);
    levelsGained += 1;
  }
  return { state: next, levelsGained };
}
export function applyUpgrade(state: RunState, id: UpgradeId): RunState {
  switch (id) {
    case 'power': return { ...state, damage: state.damage + 6 };
    case 'haste': return { ...state, attackIntervalMs: Math.max(280, state.attackIntervalMs - 85) };
    case 'vitality': return { ...state, maxHealth: state.maxHealth + 20, health: Math.min(state.maxHealth + 20, state.health + 20) };
    case 'magnet': return { ...state, magnetRadius: state.magnetRadius + 65 };
  }
}
export function receiveDamage(state: RunState, amount: number): RunState {
  return { ...state, health: Math.max(0, state.health - Math.max(0, amount)) };
}
export function recordKill(state: RunState): RunState { return { ...state, kills: state.kills + 1 }; }
export function advanceRun(state: RunState, deltaMs: number): RunState {
  return { ...state, elapsedMs: state.elapsedMs + Math.max(0, deltaMs) };
}
