export type UpgradeId = 'power' | 'haste' | 'vitality' | 'magnet';
export type GameMode = 'survival' | 'boss-hunt';
export interface Position { x: number; y: number }
export interface RunState {
  level: number; experience: number; experienceToNext: number;
  health: number; maxHealth: number; damage: number; attackIntervalMs: number;
  magnetRadius: number; moveSpeed: number; kills: number; elapsedMs: number;
}
