import type { RegionId } from '../../core/types/content.js';
import { REGIONS } from '../../data/regions.js';
import { RELICS } from '../../data/relics.js';
import { CRAFTING_MATERIALS } from '../../data/crafting.js';
import { grantCraftingMaterials } from '../crafting/crafting-runtime.js';
import type { SaveData } from '../../systems/save/save-types.js';
import { applyCharacterMastery, calculateRunMasteryPoints } from '../progression/character-mastery.js';
import { applyAchievementRunProgress } from '../progression/achievements.js';

export interface RunResultInput {
  regionId: RegionId;
  won: boolean;
  soulEssenceEarned: number;
  relicIdsEarned?: readonly string[];
  craftingMaterialsEarned?: Readonly<Record<string, number>>;
  characterId?: string;
  kills?: number;
  explorationEventsCompleted?: number;
}

export function applyRunResult(save: SaveData, result: RunResultInput): SaveData {
  const reward = Number.isFinite(result.soulEssenceEarned)
    ? Math.max(0, Math.floor(result.soulEssenceEarned))
    : 0;
  const unlockedRegionIds = new Set(save.progression.unlockedRegionIds);

  if (result.won) {
    const regionIndex = REGIONS.findIndex(region => region.id === result.regionId);
    const nextRegion = regionIndex >= 0 ? REGIONS[regionIndex + 1] : undefined;
    if (nextRegion) unlockedRegionIds.add(nextRegion.id);
  }

  const relicIds = new Set(save.collections.relicIds);
  for (const id of result.relicIdsEarned ?? []) if (RELICS.some(relic => relic.id === id)) relicIds.add(id);

  const validMaterials: Record<string, number> = {};
  for (const material of CRAFTING_MATERIALS) {
    const amount = result.craftingMaterialsEarned?.[material.id];
    if (typeof amount === 'number' && Number.isInteger(amount) && amount > 0) validMaterials[material.id] = amount;
  }
  const mastery = result.characterId
    ? applyCharacterMastery(save.collections, result.characterId, calculateRunMasteryPoints(result.kills ?? 0, result.won))
    : save.collections;
  const achievements = result.characterId
    ? applyAchievementRunProgress(mastery, { kills: result.kills ?? 0, won: result.won, characterId: result.characterId, regionId: result.regionId, explorationEventsCompleted: result.explorationEventsCompleted ?? 0 })
    : mastery;
  return {
    ...save,
    collections: { ...save.collections, ...mastery, ...achievements, relicIds: [...relicIds], craftingMaterials: grantCraftingMaterials(save.collections.craftingMaterials, validMaterials) },
    progression: {
      ...save.progression,
      soulEssence: save.progression.soulEssence + reward,
      completedRuns: save.progression.completedRuns + 1,
      unlockedRegionIds: [...unlockedRegionIds]
    }
  };
}
