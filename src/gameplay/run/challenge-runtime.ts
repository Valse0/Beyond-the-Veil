import type { ChallengeId } from '../../core/types/game.js';
import { CHALLENGES } from '../../data/challenges.js';

export function resolveChallengeId(value: unknown): ChallengeId | null {
  return CHALLENGES.some(challenge => challenge.id === value) ? value as ChallengeId : null;
}

export function getChallengeDefinition(challengeId: ChallengeId | null | undefined) {
  return CHALLENGES.find(challenge => challenge.id === challengeId) ?? null;
}

export function getChallengeModifiers(challengeId: ChallengeId | null | undefined) {
  const challenge = getChallengeDefinition(challengeId);
  return {
    maxWeaponSlots: challenge?.maxWeaponSlots ?? 6,
    maxHealthMultiplier: challenge?.maxHealthMultiplier ?? 1,
    enemyMoveSpeedMultiplier: challenge?.enemyMoveSpeedMultiplier ?? 1,
    victorySoulEssenceBonus: challenge?.victorySoulEssenceBonus ?? 0
  };
}

export function canAddChallengeWeapon(challengeId: ChallengeId | null | undefined, currentWeaponCount: number): boolean {
  return Number.isInteger(currentWeaponCount) && currentWeaponCount >= 0
    && currentWeaponCount < getChallengeModifiers(challengeId).maxWeaponSlots;
}

export function getChallengeVictoryBonus(
  challengeId: ChallengeId | null | undefined,
  won: boolean,
  bossChestOpened: boolean
): number {
  if (!won || !bossChestOpened || !getChallengeDefinition(challengeId)) return 0;
  return getChallengeModifiers(challengeId).victorySoulEssenceBonus;
}
