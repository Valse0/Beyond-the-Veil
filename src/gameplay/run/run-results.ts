import type { RegionId } from '../../core/types/content.js';
import { REGIONS } from '../../data/regions.js';
import { RELICS } from '../../data/relics.js';
import type { SaveData } from '../../systems/save/save-types.js';

export interface RunResultInput {
  regionId: RegionId;
  won: boolean;
  soulEssenceEarned: number;
  relicIdsEarned?: readonly string[];
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

  return {
    ...save,
    collections: { ...save.collections, relicIds: [...relicIds] },
    progression: {
      ...save.progression,
      soulEssence: save.progression.soulEssence + reward,
      completedRuns: save.progression.completedRuns + 1,
      unlockedRegionIds: [...unlockedRegionIds]
    }
  };
}
