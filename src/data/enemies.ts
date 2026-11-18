export interface EnemyDefinition {
  id: string; name: string; health: number; speed: number; contactDamage: number;
  experience: number; radius: number; color: number; behavior: 'pursue' | 'orbit' | 'surge';
}
export const STARTING_ENEMIES: readonly EnemyDefinition[] = [
  { id: 'hollow', name: 'Boşluk Leşi', health: 34, speed: 62, contactDamage: 8, experience: 2, radius: 13, color: 0x8c5264, behavior: 'pursue' },
  { id: 'wisp', name: 'Kayıp Ruh', health: 20, speed: 94, contactDamage: 6, experience: 2, radius: 9, color: 0x69a9a5, behavior: 'orbit' },
  { id: 'brute', name: 'Mezar Yarması', health: 88, speed: 39, contactDamage: 16, experience: 5, radius: 19, color: 0xa58a58, behavior: 'surge' }
];
