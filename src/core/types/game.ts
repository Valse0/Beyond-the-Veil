export type UpgradeId = 'power' | 'haste' | 'vitality' | 'magnet';
export type GameMode = 'survival' | 'boss-hunt' | 'challenge' | 'endless';
export type ChallengeId = 'limited-arsenal' | 'glass-oath' | 'hunters-nightmare';
export interface ChallengeDefinition {
  id: ChallengeId;
  name: string;
  description: string;
  maxWeaponSlots: number;
  maxHealthMultiplier: number;
  enemyMoveSpeedMultiplier: number;
  victorySoulEssenceBonus: number;
}
export interface Position { x: number; y: number }
export interface RunState {
  level: number; experience: number; experienceToNext: number;
  health: number; maxHealth: number; damage: number; attackIntervalMs: number;
  magnetRadius: number; moveSpeed: number; kills: number; elapsedMs: number;
}
