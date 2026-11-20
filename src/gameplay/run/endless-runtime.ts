import type { BossDefinition } from '../../core/types/content.js';

export const ENDLESS_FIRST_BOSS_AT_MS = 14 * 60 * 1000;
export const ENDLESS_BOSS_INTERVAL_MS = 5 * 60 * 1000;
export const ENDLESS_RULE_START_MS = 15 * 60 * 1000;
export const ENDLESS_RULE_INTERVAL_MS = 3 * 60 * 1000;

export type EndlessRuleId = 'hunters-moon' | 'blood-tide' | 'iron-veil';

export interface EndlessRule {
  id: EndlessRuleId;
  name: string;
  description: string;
  enemyHealthMultiplier: number;
  enemyMoveSpeedMultiplier: number;
  incomingDamageMultiplier: number;
  experienceMultiplier: number;
}

export interface EndlessRuleModifiers {
  enemyHealthMultiplier: number;
  enemyMoveSpeedMultiplier: number;
  incomingDamageMultiplier: number;
  experienceMultiplier: number;
}

export interface EndlessRuntimeState {
  bossCyclesCompleted: number;
  nextBossAtMs: number;
}

const RULES: readonly EndlessRule[] = [
  {
    id: 'hunters-moon',
    name: 'AVCININ AYI',
    description: 'Düşmanlar ve boss daha hızlı hareket eder.',
    enemyHealthMultiplier: 1,
    enemyMoveSpeedMultiplier: 1.18,
    incomingDamageMultiplier: 1,
    experienceMultiplier: 1
  },
  {
    id: 'blood-tide',
    name: 'KAN GELGİTİ',
    description: 'Bütün düşman kaynaklı hasar artar.',
    enemyHealthMultiplier: 1,
    enemyMoveSpeedMultiplier: 1,
    incomingDamageMultiplier: 1.2,
    experienceMultiplier: 1
  },
  {
    id: 'iron-veil',
    name: 'DEMİR PERDE',
    description: 'Düşmanlar daha dayanıklıdır; daha fazla XP bırakırlar.',
    enemyHealthMultiplier: 1.25,
    enemyMoveSpeedMultiplier: 1.05,
    incomingDamageMultiplier: 1,
    experienceMultiplier: 1.25
  }
] as const;

export function createEndlessRuntimeState(): EndlessRuntimeState {
  return { bossCyclesCompleted: 0, nextBossAtMs: ENDLESS_FIRST_BOSS_AT_MS };
}

export function getEndlessRule(elapsedMs: number): EndlessRule | null {
  if (!Number.isFinite(elapsedMs) || elapsedMs < ENDLESS_RULE_START_MS) return null;
  const index = Math.floor((elapsedMs - ENDLESS_RULE_START_MS) / ENDLESS_RULE_INTERVAL_MS) % RULES.length;
  return RULES[index]!;
}

export function getEndlessRuleModifiers(elapsedMs: number): EndlessRuleModifiers {
  const rule = getEndlessRule(elapsedMs);
  return {
    enemyHealthMultiplier: rule?.enemyHealthMultiplier ?? 1,
    enemyMoveSpeedMultiplier: rule?.enemyMoveSpeedMultiplier ?? 1,
    incomingDamageMultiplier: rule?.incomingDamageMultiplier ?? 1,
    experienceMultiplier: rule?.experienceMultiplier ?? 1
  };
}

export function shouldSpawnEndlessBoss(
  state: EndlessRuntimeState,
  elapsedMs: number,
  bossSpawned: boolean,
  bossVictoryPending: boolean
): boolean {
  return !bossSpawned && !bossVictoryPending && Number.isFinite(elapsedMs) && elapsedMs >= state.nextBossAtMs;
}

export function completeEndlessBossCycle(state: EndlessRuntimeState, elapsedMs: number): EndlessRuntimeState {
  const now = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : state.nextBossAtMs;
  return {
    bossCyclesCompleted: state.bossCyclesCompleted + 1,
    nextBossAtMs: now + ENDLESS_BOSS_INTERVAL_MS
  };
}

export function scaleEndlessBoss(boss: BossDefinition, completedCycles: number): BossDefinition {
  const cycle = Math.max(0, Math.min(10, Math.floor(Number.isFinite(completedCycles) ? completedCycles : 0)));
  const healthMultiplier = 1 + cycle * 0.2;
  const damageMultiplier = 1 + cycle * 0.08;
  const movementMultiplier = 1 + cycle * 0.04;
  return {
    ...boss,
    health: Math.round(boss.health * healthMultiplier),
    contactDamage: boss.contactDamage * damageMultiplier,
    phases: boss.phases.map(phase => ({
      ...phase,
      movementMultiplier: (phase.movementMultiplier ?? 1) * movementMultiplier,
      attacks: phase.attacks.map(attack => ({ ...attack, damage: attack.damage * damageMultiplier }))
    }))
  };
}

export function getEndlessSurvivalReward(elapsedMs: number, completedBossCycles: number): number {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const cycles = Number.isFinite(completedBossCycles) ? Math.max(0, Math.floor(completedBossCycles)) : 0;
  return Math.floor(elapsed / (5 * 60 * 1000)) * 25 + cycles * 75;
}
