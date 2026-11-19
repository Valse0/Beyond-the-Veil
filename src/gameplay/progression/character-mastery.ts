import { CHARACTERS } from '../../data/characters.js';

export const CHARACTER_MASTERY_THRESHOLDS = [
  { level: 2, points: 25 },
  { level: 5, points: 100 },
  { level: 10, points: 250 }
] as const;

export interface CharacterMasteryCollections {
  characterMastery: Record<string, number>;
  unlockedMasteryRewardIds: string[];
  unlockedCosmeticIds: string[];
}

export function calculateRunMasteryPoints(kills: number, won: boolean): number {
  const validKills = Number.isFinite(kills) ? Math.max(0, Math.floor(kills)) : 0;
  return 3 + Math.floor(validKills / 10) + (won ? 10 : 0);
}

export function getCharacterMasteryLevel(points: number): number {
  const validPoints = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
  return CHARACTER_MASTERY_THRESHOLDS.reduce((level, item) => validPoints >= item.points ? item.level : level, 1);
}

export function applyCharacterMastery(collections: CharacterMasteryCollections, characterId: string, earnedPoints: number): CharacterMasteryCollections {
  const character = CHARACTERS.find(item => item.id === characterId);
  if (!character || !Number.isFinite(earnedPoints) || !Number.isInteger(earnedPoints) || earnedPoints <= 0) return collections;

  const currentPoints = collections.characterMastery[characterId] ?? 0;
  const nextPoints = Math.min(Number.MAX_SAFE_INTEGER, currentPoints + earnedPoints);
  const unlockedRewards = new Set(collections.unlockedMasteryRewardIds);
  const unlockedCosmetics = new Set(collections.unlockedCosmeticIds);

  for (const milestone of character.mastery) {
    const threshold = CHARACTER_MASTERY_THRESHOLDS.find(item => item.level === milestone.level);
    if (!threshold || nextPoints < threshold.points) continue;
    unlockedRewards.add(milestone.rewardId);
    if (milestone.level === 10) unlockedCosmetics.add(milestone.rewardId);
  }

  return {
    characterMastery: { ...collections.characterMastery, [characterId]: nextPoints },
    unlockedMasteryRewardIds: [...unlockedRewards],
    unlockedCosmeticIds: [...unlockedCosmetics]
  };
}
