import type { BossDefinition, EnemyDefinition } from '../../core/types/content.js';
import type { SaveData } from '../../systems/save/save-types.js';
import { REGIONS } from '../../data/regions.js';
import { createInitialQuestStoryState } from '../quests/quest-runtime.js';

export const MAX_NEW_GAME_PLUS_LEVEL = 5;

export interface NewGamePlusModifiers {
  enemyHealthMultiplier: number;
  enemyDamageMultiplier: number;
  enemyMoveSpeedMultiplier: number;
  bossHealthMultiplier: number;
  bossDamageMultiplier: number;
  bossMoveSpeedMultiplier: number;
}

function normalizedLevel(level: number): number {
  return Number.isFinite(level) ? Math.max(0, Math.min(MAX_NEW_GAME_PLUS_LEVEL, Math.floor(level))) : 0;
}

export function getNewGamePlusModifiers(level: number): NewGamePlusModifiers {
  const current = normalizedLevel(level);
  return {
    enemyHealthMultiplier: 1 + current * 0.1,
    enemyDamageMultiplier: 1 + current * 0.05,
    enemyMoveSpeedMultiplier: 1 + current * 0.02,
    bossHealthMultiplier: 1 + current * 0.15,
    bossDamageMultiplier: 1 + current * 0.07,
    bossMoveSpeedMultiplier: 1 + current * 0.03
  };
}

export function recordCompletedEnding(save: SaveData): SaveData {
  const endingId = save.story.completedEndingId;
  if (!endingId || save.progression.completedEndingIds.includes(endingId)) return save;
  return { ...save, progression: { ...save.progression, completedEndingIds: [...save.progression.completedEndingIds, endingId] } };
}

export function canStartNewGamePlus(save: Pick<SaveData, 'progression' | 'story'>): boolean {
  return save.story.completedEndingId !== null;
}

/** Starts a fresh campaign loop while preserving every permanent profile and collection field. */
export function beginNewGamePlus(save: SaveData): SaveData | null {
  if (!canStartNewGamePlus(save)) return null;
  const completedEndingIds = new Set(save.progression.completedEndingIds);
  if (save.story.completedEndingId) completedEndingIds.add(save.story.completedEndingId);
  return {
    ...save,
    progression: {
      ...save.progression,
      newGamePlusLevel: Math.min(MAX_NEW_GAME_PLUS_LEVEL, save.progression.newGamePlusLevel + 1),
      completedEndingIds: [...completedEndingIds],
      unlockedRegionIds: [REGIONS[0]!.id]
    },
    story: createInitialQuestStoryState()
  };
}

export function scaleNewGamePlusEnemy(enemy: EnemyDefinition, level: number): EnemyDefinition {
  const modifiers = getNewGamePlusModifiers(level);
  return {
    ...enemy,
    health: Math.round(enemy.health * modifiers.enemyHealthMultiplier),
    speed: enemy.speed * modifiers.enemyMoveSpeedMultiplier,
    contactDamage: enemy.contactDamage * modifiers.enemyDamageMultiplier,
    attack: { ...enemy.attack, damage: enemy.attack.damage * modifiers.enemyDamageMultiplier }
  };
}

export function scaleNewGamePlusBoss(boss: BossDefinition, level: number): BossDefinition {
  const modifiers = getNewGamePlusModifiers(level);
  return {
    ...boss,
    health: Math.round(boss.health * modifiers.bossHealthMultiplier),
    contactDamage: boss.contactDamage * modifiers.bossDamageMultiplier,
    phases: boss.phases.map(phase => ({
      ...phase,
      movementMultiplier: (phase.movementMultiplier ?? 1) * modifiers.bossMoveSpeedMultiplier,
      attacks: phase.attacks.map(attack => ({ ...attack, damage: attack.damage * modifiers.bossDamageMultiplier }))
    }))
  };
}
