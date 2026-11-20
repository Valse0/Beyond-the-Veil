import type { ChallengeDefinition } from '../core/types/game.js';

export const CHALLENGES: readonly ChallengeDefinition[] = [
  {
    id: 'limited-arsenal',
    name: 'Kısıtlı Teçhizat',
    description: 'En fazla üç silah yuvası. Her seçim daha değerlidir.',
    maxWeaponSlots: 3,
    maxHealthMultiplier: 1,
    enemyMoveSpeedMultiplier: 1,
    victorySoulEssenceBonus: 200
  },
  {
    id: 'glass-oath',
    name: 'Cam Yemin',
    description: 'Azami canın %60. Her darbe ölümcül olabilir.',
    maxWeaponSlots: 6,
    maxHealthMultiplier: 0.6,
    enemyMoveSpeedMultiplier: 1,
    victorySoulEssenceBonus: 200
  },
  {
    id: 'hunters-nightmare',
    name: 'Avcıların Kabusu',
    description: 'Normal düşmanlar ve boss %20 daha hızlı hareket eder.',
    maxWeaponSlots: 6,
    maxHealthMultiplier: 1,
    enemyMoveSpeedMultiplier: 1.2,
    victorySoulEssenceBonus: 200
  }
] as const;
