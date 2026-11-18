import type { RegionId } from '../../core/types/content.js';
import { REGIONS } from '../../data/regions.js';
import type { SaveData } from '../../systems/save/save-types.js';

export interface RunResultInput {
  regionId: RegionId;
  won: boolean;
  soulEssenceEarned: number;
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

  return {
    ...save,
    progression: {
      ...save.progression,
      soulEssence: save.progression.soulEssence + reward,
      completedRuns: save.progression.completedRuns + 1,
      unlockedRegionIds: [...unlockedRegionIds]
    }
  };
}
